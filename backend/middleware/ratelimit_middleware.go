package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/time/rate"

	"insight-engine-backend/middleware/ratelimit"
)

// RateLimitConfig defines configuration for the rate limiter
type RateLimitConfig struct {
	Limiter       ratelimit.RateLimiter
	UserLimit     rate.Limit
	UserBurst     int
	ProviderLimit rate.Limit // Global limit per provider (optional, future use)
	ProviderBurst int
}

// RateLimitMiddleware creates a fiber handler for rate limiting
func RateLimitMiddleware(config RateLimitConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Identify User
		userID := c.Locals("user_id") // set by AuthMiddleware

		key := ""
		if userID != nil {
			key = fmt.Sprintf("user:%v", userID)
		} else {
			// Fallback to IP if no user (should rely on AuthMiddleware though)
			key = fmt.Sprintf("ip:%s", c.IP())
		}

		// 2. Check User Rate Limit
		// Default to 60 RPM (1 request per second) if not configured
		limit := config.UserLimit
		if limit == 0 {
			limit = rate.Every(time.Second)
		}
		burst := config.UserBurst
		if burst == 0 {
			burst = 5
		}

		if !config.Limiter.Allow(key, limit, burst) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many requests. Please try again later.",
			})
		}

		// 3. Provider Rate Limit (Optional/Advanced)
		// We could inspect body here to find "provider" field, but that requires
		// unmarshalling which might be expensive or complex in middleware.
		// For now, we rely on User limit.

		return c.Next()
	}
}
