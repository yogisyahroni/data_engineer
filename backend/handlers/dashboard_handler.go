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

// GetDashboardCards retrieves all cards for a dashboard
func GetDashboardCards(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Verify dashboard ownership
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found",
		})
	}

	var cards []models.DashboardCard
	database.DB.Where("dashboard_id = ?", dashboardID).Order("created_at ASC").Find(&cards)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    cards,
		"count":   len(cards),
	})
}

// AddCard adds a new card to a dashboard
func AddCard(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Verify dashboard ownership
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found",
		})
	}

	type AddCardRequest struct {
		QueryID             *string                `json:"queryId"`
		Title               *string                `json:"title"`
		Position            map[string]interface{} `json:"position"`
		VisualizationConfig map[string]interface{} `json:"visualizationConfig"`
		Type                *string                `json:"type"`
		TextContent         *string                `json:"textContent"`
	}

	req := new(AddCardRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Validation: either queryId or textContent required
	if (req.QueryID == nil || *req.QueryID == "") && (req.TextContent == nil || *req.TextContent == "") {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Query ID or text content is required",
		})
	}

	// Default position if not provided
	position := req.Position
	if position == nil {
		position = map[string]interface{}{"x": 0, "y": 0, "w": 6, "h": 4}
	}
	positionJSON, _ := json.Marshal(position)
	positionStr := string(positionJSON)

	var vizConfigStr *string
	if req.VisualizationConfig != nil {
		vizJSON, _ := json.Marshal(req.VisualizationConfig)
		str := string(vizJSON)
		vizConfigStr = &str
	}

	cardType := "visualization"
	if req.Type != nil {
		cardType = *req.Type
	}

	card := models.DashboardCard{
		DashboardID:         dashboardID,
		QueryID:             req.QueryID,
		Title:               req.Title,
		Type:                cardType,
		TextContent:         req.TextContent,
		Position:            positionStr,
		VisualizationConfig: vizConfigStr,
	}

	if err := database.DB.Create(&card).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to add card",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    card,
	})
}

// UpdateCardPositions updates positions of multiple cards (bulk update)
func UpdateCardPositions(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Verify dashboard ownership
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found",
		})
	}

	type CardPosition struct {
		ID       string                 `json:"id"`
		Position map[string]interface{} `json:"position"`
	}

	type UpdateCardsRequest struct {
		Cards []CardPosition `json:"cards"`
	}

	req := new(UpdateCardsRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	if req.Cards == nil || len(req.Cards) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Cards array is required",
		})
	}

	// Update each card's position
	for _, cardPos := range req.Cards {
		positionJSON, _ := json.Marshal(cardPos.Position)
		positionStr := string(positionJSON)

		database.DB.Model(&models.DashboardCard{}).
			Where("id = ? AND dashboard_id = ?", cardPos.ID, dashboardID).
			Update("position", positionStr)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Updated " + string(rune(len(req.Cards))) + " cards",
	})
}

// RemoveCard removes a card from a dashboard
func RemoveCard(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Verify dashboard ownership
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found",
		})
	}

	type RemoveCardRequest struct {
		CardID string `json:"cardId"`
	}

	req := new(RemoveCardRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	if req.CardID == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Card ID is required",
		})
	}

	// Delete card
	result := database.DB.Where("id = ? AND dashboard_id = ?", req.CardID, dashboardID).
		Delete(&models.DashboardCard{})

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to remove card",
			"error":   result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Card not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Card removed successfully",
	})
}

// CreateSchedule creates a report schedule for a dashboard
func CreateSchedule(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Verify dashboard ownership
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Dashboard not found",
		})
	}

	type CreateScheduleRequest struct {
		Frequency string `json:"frequency"` // DAILY, WEEKLY, MONTHLY
		Email     string `json:"email"`
		Format    string `json:"format"` // PDF, PNG
	}

	req := new(CreateScheduleRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid input: " + err.Error(),
		})
	}

	// Validation
	if req.Frequency == "" || req.Email == "" || req.Format == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Frequency, email, and format are required",
		})
	}

	if req.Frequency != "DAILY" && req.Frequency != "WEEKLY" && req.Frequency != "MONTHLY" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Frequency must be DAILY, WEEKLY, or MONTHLY",
		})
	}

	if req.Format != "PDF" && req.Format != "PNG" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Format must be PDF or PNG",
		})
	}

	schedule := models.ReportSchedule{
		DashboardID: dashboardID,
		Frequency:   req.Frequency,
		Email:       req.Email,
		Format:      req.Format,
		IsActive:    true,
		NextRunAt:   models.CalculateNextRun(req.Frequency),
	}

	if err := database.DB.Create(&schedule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create schedule: " + err.Error(),
		})
	}

	return c.JSON(schedule)
}
