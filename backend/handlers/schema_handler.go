package handlers

import (
	"context"
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
)

var schemaDiscovery = services.NewSchemaDiscovery(queryExecutor)

// GetConnectionSchema retrieves database schema for a connection
func GetConnectionSchema(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Fetch connection
	var conn models.Connection
	if err := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&conn).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	// Discover schema
	ctx := context.Background()
	schema, err := schemaDiscovery.DiscoverSchema(ctx, &conn)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to discover schema",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   schema,
	})
}
