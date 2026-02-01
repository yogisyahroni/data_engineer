package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetConnections returns a list of connections
func GetConnections(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized",
		})
	}

	var connections []models.Connection
	result := database.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&connections)

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not fetch connections",
			"error":   result.Error.Error(),
		})
	}

	// Convert to DTOs (strip passwords)
	dtos := make([]models.ConnectionDTO, len(connections))
	for i, conn := range connections {
		dtos[i] = conn.ToDTO()
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   dtos,
	})
}

// GetConnection returns a single connection by ID
func GetConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	var conn models.Connection
	result := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&conn)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   conn.ToDTO(),
	})
}

// CreateConnection creates a new connection
func CreateConnection(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(string)

	conn := new(models.Connection)
	if err := c.BodyParser(conn); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Validation
	if conn.Name == "" || conn.Type == "" || conn.Database == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Name, Type, and Database are required",
		})
	}

	// Generate ID and set user
	conn.ID = uuid.New().String()
	conn.UserID = userID

	// TODO: Encrypt password before storing
	// For now, storing as-is (SECURITY RISK - fix in production)

	result := database.DB.Create(&conn)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not create connection",
			"error":   result.Error.Error(),
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"status": "success",
		"data":   conn.ToDTO(),
	})
}

// UpdateConnection updates an existing connection
func UpdateConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Check ownership
	var existing models.Connection
	if err := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&existing).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	// Parse updates
	updates := new(models.Connection)
	if err := c.BodyParser(updates); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Apply updates
	if err := database.DB.Model(&existing).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not update connection",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   existing.ToDTO(),
	})
}

// DeleteConnection deletes a connection
func DeleteConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	result := database.DB.Where("id = ? AND user_id = ?", connID, userID).Delete(&models.Connection{})
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not delete connection",
			"error":   result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Connection deleted",
	})
}

// TestConnection tests a database connection
func TestConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	var conn models.Connection
	if err := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&conn).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	// Test connection using query executor
	ctx := c.Context()
	_, err := queryExecutor.Execute(ctx, &conn, "SELECT 1", nil, nil)

	if err != nil {
		return c.JSON(fiber.Map{
			"status":  "error",
			"message": "Connection test failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Connection successful",
	})
}
