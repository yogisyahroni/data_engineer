package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"

	"github.com/gofiber/fiber/v2"
)

// GetAlerts returns a list of alerts
func GetAlerts(c *fiber.Ctx) error {
	var alerts []models.Alert
	result := database.DB.Find(&alerts)

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not fetch alerts",
			"error":   result.Error.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    alerts,
	})
}

// CreateAlert handles creating a new alert
func CreateAlert(c *fiber.Ctx) error {
	alert := new(models.Alert)

	if err := c.BodyParser(alert); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Basic Validation (Enhance with validator library later)
	if alert.Name == "" || alert.QueryId == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Name and QueryId are required",
		})
	}

	result := database.DB.Create(&alert)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not create alert",
			"error":   result.Error.Error(),
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"data":    alert,
	})
}
