package middleware

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"insight-engine-backend/services"
)

// ComprehensiveRateLimitConfig holds configuration for comprehensive rate limiting
type ComprehensiveRateLimitConfig struct {
	RateLimiterService *services.RateLimiter
	SkipPaths          map[string]bool // Paths to skip rate limiting (e.g., health checks)
}

// ComprehensiveRateLimit creates a comprehensive rate limiting middleware
// This middleware implements multiple layers of rate limiting:
// 1. IP-based limiting (for unauthenticated requests and brute-force protection)
// 2. Per-endpoint limiting (for sensitive endpoints like auth)
// 3. Per-user limiting (for authenticated API usage)
//
// Rate limits are configured via database (rate_limit_configs table) and can be
// managed dynamically through the admin UI
func ComprehensiveRateLimit(config ComprehensiveRateLimitConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip rate limiting for specified paths (health checks, metrics, etc.)
		path := c.Path()
		if config.SkipPaths != nil && config.SkipPaths[path] {
			return c.Next()
		}

		// Extract client IP (handles X-Forwarded-For, X-Real-IP proxies)
		clientIP := getClientIP(c)

		// Extract user ID if authenticated (set by AuthMiddleware)
		var userID uuid.UUID
		userIDStr := c.Locals("userID")
		if userIDStr != nil && userIDStr != "" {
			var err error
			userID, err = uuid.Parse(fmt.Sprintf("%v", userIDStr))
			if err != nil {
				// Invalid user ID, treat as unauthenticated
				userID = uuid.Nil
			}
		}

		// LAYER 1: IP-Based Rate Limiting (Global Protection)
		// Apply to all requests, authenticated or not
		// Protects against DDoS and brute-force attacks
		if err := config.RateLimiterService.CheckIPLimit(clientIP); err != nil {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":      "Too many requests from your IP address",
				"retryAfter": "60 seconds",
				"type":       "ip_limit",
			})
		}

		// LAYER 2: Endpoint-Specific Rate Limiting
		// Apply stricter limits to sensitive endpoints (auth, admin, etc.)
		if userID != uuid.Nil {
			if err := config.RateLimiterService.CheckEndpointLimit(userID, path, clientIP); err != nil {
				return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
					"error":      "Endpoint rate limit exceeded",
					"retryAfter": "60 seconds",
					"type":       "endpoint_limit",
					"endpoint":   sanitizeEndpoint(path),
				})
			}
		}

		// LAYER 3: Per-User Global Rate Limiting
		// Apply to authenticated users for overall API usage
		if userID != uuid.Nil {
			if err := config.RateLimiterService.CheckUserLimit(userID); err != nil {
				return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
					"error":      "User rate limit exceeded",
					"retryAfter": "60 seconds",
					"type":       "user_limit",
				})
			}
		}

		// All rate limit checks passed, proceed to next handler
		return c.Next()
	}
}

// getClientIP extracts the real client IP from request headers
// Handles reverse proxy scenarios (X-Forwarded-For, X-Real-IP)
func getClientIP(c *fiber.Ctx) string {
	// Check X-Forwarded-For header (most common for reverse proxies)
	xff := c.Get("X-Forwarded-For")
	if xff != "" {
		// X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
		// The first IP is the original client
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header (Nginx, Cloudflare)
	xri := c.Get("X-Real-IP")
	if xri != "" {
		return xri
	}

	// Fallback to direct connection IP
	return c.IP()
}

// sanitizeEndpoint removes query parameters and sensitive info from endpoint
// for logging purposes
func sanitizeEndpoint(path string) string {
	// Remove query parameters
	if idx := strings.Index(path, "?"); idx != -1 {
		path = path[:idx]
	}

	// Truncate very long paths
	if len(path) > 200 {
		path = path[:200] + "..."
	}

	return path
}
