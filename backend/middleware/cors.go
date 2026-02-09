package middleware

import (
	"insight-engine-backend/services"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// CORSConfig holds configuration for CORS middleware
type CORSConfig struct {
	AllowedOrigins   []string // Whitelist of allowed origins
	AllowCredentials bool     // Whether to allow credentials
	MaxAge           int      // Preflight cache duration (seconds)
}

// HardenedCORS creates a production-ready CORS middleware
// This middleware implements strict origin validation and blocks unauthorized origins
func HardenedCORS(config CORSConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		// If no Origin header is present, it's not a CORS request
		// Allow it to proceed (same-origin requests)
		if origin == "" {
			return c.Next()
		}

		// Check if origin is in whitelist
		allowed := false
		for _, allowedOrigin := range config.AllowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// If origin is not allowed, block the request
		if !allowed {
			// Log unauthorized origin attempt for security monitoring
			services.LogWarn("cors_violation", "Blocked unauthorized CORS request", map[string]interface{}{"origin": origin, "path": c.Path()})

			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Origin not allowed",
				"type":  "cors_policy_violation",
			})
		}

		// Origin is allowed - set CORS headers
		c.Set("Access-Control-Allow-Origin", origin)

		if config.AllowCredentials {
			c.Set("Access-Control-Allow-Credentials", "true")
		}

		// Handle preflight requests
		if c.Method() == "OPTIONS" {
			// Allow common headers
			c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")

			// Set preflight cache duration
			if config.MaxAge > 0 {
				c.Set("Access-Control-Max-Age", strconv.Itoa(config.MaxAge))
			}

			// Expose custom headers if needed
			c.Set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Authorization")

			// Return 204 No Content for preflight
			return c.SendStatus(fiber.StatusNoContent)
		}

		// For actual requests, proceed to next handler
		return c.Next()
	}
}

// LoadCORSConfigFromEnv loads CORS configuration from environment variables
// ALLOWED_ORIGINS should be a comma-separated list of origins
// Example: "http://localhost:3000,https://app.example.com,https://www.example.com"
func LoadCORSConfigFromEnv() CORSConfig {
	allowedOriginsEnv := os.Getenv("ALLOWED_ORIGINS")

	// Default to localhost if not set (development mode)
	if allowedOriginsEnv == "" {
		allowedOriginsEnv = "http://localhost:3000"
	}

	// Split by comma and trim whitespace
	origins := strings.Split(allowedOriginsEnv, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	return CORSConfig{
		AllowedOrigins:   origins,
		AllowCredentials: true,  // Required for cookie-based auth (NextAuth)
		MaxAge:           86400, // Cache preflight for 24 hours
	}
}

// GetAllowedOrigins returns the list of currently allowed origins (for admin UI)
func GetAllowedOrigins() []string {
	config := LoadCORSConfigFromEnv()
	return config.AllowedOrigins
}
