package handlers

import (
	"encoding/json"
	"insight-engine-backend/database"
	"insight-engine-backend/models"

	"github.com/gofiber/fiber/v2"
)

// GetDashboards retrieves all dashboards for the authenticated user
func GetDashboards(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(string)

	var dashboards []models.Dashboard
	result := database.DB.Where("user_id = ?", userID).
		Preload("Cards").
		Order("updated_at DESC").
		Find(&dashboards)

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to fetch dashboards",
			"error":   result.Error.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    dashboards,
		"count":   len(dashboards),
	})
}

// CreateDashboard creates a new dashboard
func CreateDashboard(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(string)

	type CreateDashboardRequest struct {
		Name         string  `json:"name"`
		Description  *string `json:"description"`
		CollectionID string  `json:"collectionId"`
		IsPublic     *bool   `json:"isPublic"`
	}

	req := new(CreateDashboardRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Validation
	if req.Name == "" || req.CollectionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard name and collectionId are required",
		})
	}

	dashboard := models.Dashboard{
		Name:         req.Name,
		Description:  req.Description,
		CollectionID: req.CollectionID,
		UserID:       userID,
		IsPublic:     false,
	}

	if req.IsPublic != nil {
		dashboard.IsPublic = *req.IsPublic
	}

	if err := database.DB.Create(&dashboard).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to create dashboard",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    dashboard,
	})
}

// GetDashboard retrieves a single dashboard by ID
func GetDashboard(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	var dashboard models.Dashboard
	result := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).
		Preload("Cards").
		First(&dashboard)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    dashboard,
	})
}

// UpdateDashboard updates a dashboard (metadata or layout)
func UpdateDashboard(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Check if dashboard exists and belongs to user
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found",
		})
	}

	// Parse request body
	var body map[string]interface{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Check if this is a layout update (cards array present)
	if cards, hasCards := body["cards"].([]interface{}); hasCards {
		// Update metadata first if provided
		updates := make(map[string]interface{})
		if name, ok := body["name"].(string); ok {
			updates["name"] = name
		}
		if desc, ok := body["description"].(string); ok {
			updates["description"] = desc
		}
		if isPublic, ok := body["isPublic"].(bool); ok {
			updates["is_public"] = isPublic
		}
		if collID, ok := body["collectionId"].(string); ok {
			updates["collection_id"] = collID
		}
		if filters, ok := body["filters"]; ok {
			filtersJSON, _ := json.Marshal(filters)
			filtersStr := string(filtersJSON)
			updates["filters"] = filtersStr
		}

		if len(updates) > 0 {
			database.DB.Model(&dashboard).Updates(updates)
		}

		// Update layout (cards)
		// Delete existing cards
		database.DB.Where("dashboard_id = ?", dashboardID).Delete(&models.DashboardCard{})

		// Create new cards
		for _, cardData := range cards {
			cardMap := cardData.(map[string]interface{})

			var queryID *string
			if qid, ok := cardMap["queryId"].(string); ok && qid != "" {
				queryID = &qid
			}

			var title *string
			if t, ok := cardMap["title"].(string); ok && t != "" {
				title = &t
			}

			positionJSON, _ := json.Marshal(cardMap["position"])
			positionStr := string(positionJSON)

			var vizConfigStr *string
			if vizConfig, ok := cardMap["visualizationConfig"]; ok {
				vizJSON, _ := json.Marshal(vizConfig)
				str := string(vizJSON)
				vizConfigStr = &str
			}

			card := models.DashboardCard{
				DashboardID:         dashboardID,
				QueryID:             queryID,
				Title:               title,
				Position:            positionStr,
				VisualizationConfig: vizConfigStr,
			}

			if cardID, ok := cardMap["id"].(string); ok && cardID != "" {
				card.ID = cardID
			}

			database.DB.Create(&card)
		}

		// Reload dashboard with cards
		database.DB.Where("id = ?", dashboardID).Preload("Cards").First(&dashboard)

	} else {
		// Metadata-only update
		updates := make(map[string]interface{})
		if name, ok := body["name"].(string); ok {
			updates["name"] = name
		}
		if desc, ok := body["description"].(string); ok {
			updates["description"] = desc
		}
		if isPublic, ok := body["isPublic"].(bool); ok {
			updates["is_public"] = isPublic
		}
		if collID, ok := body["collectionId"].(string); ok {
			updates["collection_id"] = collID
		}
		if filters, ok := body["filters"]; ok {
			filtersJSON, _ := json.Marshal(filters)
			filtersStr := string(filtersJSON)
			updates["filters"] = filtersStr
		}

		if err := database.DB.Model(&dashboard).Updates(updates).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to update dashboard",
				"error":   err.Error(),
			})
		}

		// Reload
		database.DB.Where("id = ?", dashboardID).First(&dashboard)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    dashboard,
	})
}

// DeleteDashboard deletes a dashboard and all its cards
func DeleteDashboard(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Check if dashboard exists and belongs to user
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found",
		})
	}

	// Delete cards first (cascade)
	database.DB.Where("dashboard_id = ?", dashboardID).Delete(&models.DashboardCard{})

	// Delete dashboard
	if err := database.DB.Delete(&dashboard).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to delete dashboard",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Dashboard deleted successfully",
	})
}
