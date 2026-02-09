package handlers

import (
	"encoding/json"
	"insight-engine-backend/database"
	"insight-engine-backend/models"

	"github.com/gofiber/fiber/v2"
)

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
		"message": "Card positions updated successfully",
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
