package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware validates NextAuth JWT tokens
func AuthMiddleware(c *fiber.Ctx) error {
	// 1. Extract token from Authorization header or cookie
	token := extractToken(c)
	if token == "" {
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: No token provided",
		})
	}

	// 2. Parse and validate JWT
	secret := os.Getenv("NEXTAUTH_SECRET")
	if secret == "" {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Server configuration error",
		})
	}

	claims := jwt.MapClaims{}
	parsedToken, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fiber.NewError(401, "Invalid signing method")
		}
		return []byte(secret), nil
	})

	if err != nil || !parsedToken.Valid {
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized: Invalid token",
			"error":   err.Error(),
		})
	}

	// 3. Extract user ID from claims and store in context
	if sub, ok := claims["sub"].(string); ok {
		c.Locals("userId", sub)
	} else if id, ok := claims["id"].(string); ok {
		c.Locals("userId", id)
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

	return ""
}
