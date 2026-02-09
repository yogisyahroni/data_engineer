package middleware

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"

	"github.com/gofiber/fiber/v2"
)

// AdminMiddleware checks if the authenticated user has admin role
// Must be used AFTER AuthMiddleware
func AdminMiddleware(c *fiber.Ctx) error {
	// Get user ID from context (set by AuthMiddleware)
	userID, ok := c.Locals("userId").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized - authentication required",
		})
	}

	// Fetch user from database
	var user models.User
	if err := database.DB.Select("id, role").Where("id = ?", userID).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "User not found",
		})
	}

	// Check if user has admin role
	if user.Role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "Forbidden - admin access required",
			"code":    "INSUFFICIENT_PRIVILEGES",
		})
	}

	// User is admin, continue to next handler
	return c.Next()
}
