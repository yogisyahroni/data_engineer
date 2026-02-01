package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
)

// AIHandler handles AI generation operations
type AIHandler struct {
	aiService *services.AIService
}

// NewAIHandler creates a new AI handler
func NewAIHandler(aiService *services.AIService) *AIHandler {
	return &AIHandler{
		aiService: aiService,
	}
}

// Generate generates content using AI
func (h *AIHandler) Generate(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		ProviderID *string                `json:"providerId"` // Optional, uses default if not provided
		Prompt     string                 `json:"prompt"`
		Context    map[string]interface{} `json:"context"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Prompt == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Prompt is required"})
	}

	// Get provider ID
	providerID := ""
	if input.ProviderID != nil {
		providerID = *input.ProviderID
	} else {
		// Use default provider
		provider, err := h.aiService.GetDefaultProvider(userID)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "No default provider found. Please set up an AI provider first."})
		}
		providerID = provider.ID
	}

	// Generate content
	aiRequest, err := h.aiService.Generate(c.Context(), providerID, userID, input.Prompt, input.Context)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(aiRequest)
}

// GetRequests gets AI request history
func (h *AIHandler) GetRequests(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// Get query params
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)
	providerID := c.Query("providerId")

	query := database.DB.Where("user_id = ?", userID)

	if providerID != "" {
		query = query.Where("provider_id = ?", providerID)
	}

	var requests []models.AIRequest
	var total int64

	query.Model(&models.AIRequest{}).Count(&total)
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&requests)

	return c.JSON(fiber.Map{
		"data":   requests,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetRequest gets a single AI request
func (h *AIHandler) GetRequest(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	var request models.AIRequest
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&request).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
	}

	return c.JSON(request)
}

// GetUsageStats gets usage statistics
func (h *AIHandler) GetUsageStats(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var stats struct {
		TotalRequests   int64   `json:"totalRequests"`
		TotalTokens     int64   `json:"totalTokens"`
		TotalCost       float64 `json:"totalCost"`
		SuccessfulReqs  int64   `json:"successfulRequests"`
		FailedReqs      int64   `json:"failedRequests"`
		AvgTokensPerReq float64 `json:"avgTokensPerRequest"`
	}

	// Get total requests
	database.DB.Model(&models.AIRequest{}).Where("user_id = ?", userID).Count(&stats.TotalRequests)

	// Get successful/failed counts
	database.DB.Model(&models.AIRequest{}).Where("user_id = ? AND status = ?", userID, models.RequestStatusSuccess).Count(&stats.SuccessfulReqs)
	database.DB.Model(&models.AIRequest{}).Where("user_id = ? AND status = ?", userID, models.RequestStatusError).Count(&stats.FailedReqs)

	// Get sum of tokens and cost
	var result struct {
		TotalTokens int64
		TotalCost   float64
	}
	database.DB.Model(&models.AIRequest{}).
		Select("COALESCE(SUM(tokens_used), 0) as total_tokens, COALESCE(SUM(cost), 0) as total_cost").
		Where("user_id = ?", userID).
		Scan(&result)

	stats.TotalTokens = result.TotalTokens
	stats.TotalCost = result.TotalCost

	// Calculate average
	if stats.TotalRequests > 0 {
		stats.AvgTokensPerReq = float64(stats.TotalTokens) / float64(stats.TotalRequests)
	}

	return c.JSON(stats)
}
