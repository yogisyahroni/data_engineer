package middleware

import (
	"insight-engine-backend/services"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware validates NextAuth JWT tokens
func AuthMiddleware(c *fiber.Ctx) error {
	// 1. Extract token from Authorization header or cookie
	tokenString := extractToken(c)
	if tokenString == "" {
		services.LogWarn("auth_no_token", "No token found in request", nil)
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: No token provided",
		})
	}

	services.LogDebug("auth_token_found", "Token found, validating", map[string]interface{}{"token_length": len(tokenString)})

	// 2. Parse and validate JWT
	secret := os.Getenv("NEXTAUTH_SECRET")
	if len(secret) == 0 {
		services.LogError("auth_config_error", "NEXTAUTH_SECRET is empty", nil)
		return c.Status(500).JSON(fiber.Map{"error": "Server configuration error"})
	}

	claims := jwt.MapClaims{}
	parsedToken, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			services.LogWarn("auth_invalid_method", "Invalid signing method", map[string]interface{}{"method": t.Header["alg"]})
			return nil, fiber.NewError(401, "Invalid signing method")
		}
		return []byte(secret), nil
	})

	if err != nil || !parsedToken.Valid {
		services.LogWarn("auth_validation_failed", "Token validation failed", map[string]interface{}{"error": err})
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: Invalid token",
			"error":   err.Error(),
		})
	}

	services.LogDebug("auth_success", "Token validated successfully", map[string]interface{}{"user_id": claims["sub"]})

	// 3. Extract user ID from claims and store in context
	if sub, ok := claims["sub"].(string); ok {
		c.Locals("userID", sub)
		c.Locals("userId", sub) // Compatibility for handlers expecting camelCase
	} else if id, ok := claims["id"].(string); ok {
		c.Locals("userID", id)
		c.Locals("userId", id) // Compatibility for handlers expecting camelCase
	}

	if email, ok := claims["email"].(string); ok {
		c.Locals("userEmail", email)
	}

	return c.Next()
}

// extractToken retrieves JWT from Authorization header or cookie
func extractToken(c *fiber.Ctx) string {
	// Try Authorization header first
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}

	// Try next-auth.session-token cookie (NextAuth default)
	cookie := c.Cookies("next-auth.session-token")
	if cookie != "" {
		return cookie
	}

	// Try __Secure-next-auth.session-token (HTTPS)
	cookie = c.Cookies("__Secure-next-auth.session-token")
	if cookie != "" {
		return cookie
	}

	// Try query parameter (for WebSockets)
	queryToken := c.Query("token")
	if queryToken != "" {
		return queryToken
	}

	return ""
}
