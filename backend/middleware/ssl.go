package middleware

import (
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// SSLRedirectConfig holds configuration for SSL/TLS enforcement
type SSLRedirectConfig struct {
	Enabled bool // Enable/disable SSL redirect (default: true in production)
	HSTSAge int  // HSTS max-age in seconds (default: 31536000 = 1 year)
	Force   bool // Force HTTPS even in development (default: false)
}

// SSLRedirect enforces HTTPS and sets security headers
// This middleware prevents man-in-the-middle attacks by:
// 1. Redirecting HTTP requests to HTTPS
// 2. Setting HSTS (HTTP Strict Transport Security) headers
// 3. Ensuring secure cookies
func SSLRedirect(config SSLRedirectConfig) fiber.Handler {
	// Default configuration
	if config.HSTSAge == 0 {
		config.HSTSAge = 31536000 // 1 year
	}

	return func(c *fiber.Ctx) error {
		// Check if we should enforce SSL
		env := os.Getenv("APP_ENV")
		isProduction := env == "production"

		// Skip SSL enforcement in development unless forced
		if !config.Force && !isProduction && !config.Enabled {
			return c.Next()
		}

		// Check if request is already HTTPS
		proto := c.Protocol()
		isHTTPS := proto == "https"

		// Check X-Forwarded-Proto header (for reverse proxies)
		forwardedProto := c.Get("X-Forwarded-Proto")
		if forwardedProto == "https" {
			isHTTPS = true
		}

		// Redirect HTTP to HTTPS
		if !isHTTPS && config.Enabled {
			// Build HTTPS URL
			httpsURL := "https://" + c.Hostname() + c.OriginalURL()

			return c.Redirect(httpsURL, fiber.StatusMovedPermanently) // 301 redirect
		}

		// Set security headers for HTTPS requests
		if isHTTPS {
			// HSTS: Force browsers to use HTTPS for all future requests
			// includeSubDomains: Apply to all subdomains
			// preload: Allow domain to be included in browser HSTS preload lists
			c.Set("Strict-Transport-Security",
				"max-age="+strconv.Itoa(config.HSTSAge)+"; includeSubDomains; preload")

			// Prevent MIME-type sniffing
			c.Set("X-Content-Type-Options", "nosniff")

			// Enable XSS protection in older browsers
			c.Set("X-XSS-Protection", "1; mode=block")

			// Prevent clickjacking
			c.Set("X-Frame-Options", "DENY")

			// Referrer policy: Only send origin for same-origin requests
			c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		}

		return c.Next()
	}
}

// Note: Secure cookies should be set directly in handlers using fiber.Cookie
// with Secure, HTTPOnly, and SameSite flags.
// Example:
//   c.Cookie(&fiber.Cookie{
//       Name:     "token",
//       Value:    token,
//       HTTPOnly: true,
//       Secure:   true,  // Set to true in production
//       SameSite: "Strict",
//   })

// LoadSSLConfigFromEnv loads SSL configuration from environment
func LoadSSLConfigFromEnv() SSLRedirectConfig {
	env := os.Getenv("APP_ENV")
	sslEnabled := os.Getenv("SSL_ENABLED")

	enabled := env == "production" || sslEnabled == "true"

	return SSLRedirectConfig{
		Enabled: enabled,
		HSTSAge: 31536000, // 1 year
		Force:   sslEnabled == "force",
	}
}
