package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"insight-engine-backend/models"
	"insight-engine-backend/services"
)

// AIUsageHandler handles AI usage and analytics endpoints
type AIUsageHandler struct {
	usageTracker *services.UsageTracker
}

// NewAIUsageHandler creates a new AI usage handler
func NewAIUsageHandler(usageTracker *services.UsageTracker) *AIUsageHandler {
	return &AIUsageHandler{
		usageTracker: usageTracker,
	}
}

// GetUsageStats returns usage statistics
// GET /api/ai/usage?period=daily|weekly|monthly|all
func (h *AIUsageHandler) GetUsageStats(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	period := c.Query("period", "monthly")

	stats, err := h.usageTracker.GetUsageStats(userID, period)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(stats)
}

// GetRequestHistory returns request history
// GET /api/ai/requests?limit=50&offset=0&provider=&status=&requestType=
func (h *AIUsageHandler) GetRequestHistory(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	filters := make(map[string]interface{})
	if provider := c.Query("provider"); provider != "" {
		filters["provider"] = provider
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if requestType := c.Query("requestType"); requestType != "" {
		filters["requestType"] = requestType
	}

	requests, total, err := h.usageTracker.GetRequestHistory(userID, limit, offset, filters)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":   requests,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetBudgets returns budget limits
// GET /api/ai/budgets
func (h *AIUsageHandler) GetBudgets(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	budgets, err := h.usageTracker.GetBudgets(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(budgets)
}

// CreateBudget creates a budget limit
// POST /api/ai/budgets
func (h *AIUsageHandler) CreateBudget(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var budget models.AIBudget
	if err := c.BodyParser(&budget); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Set user ID
	budget.UserID = &userID

	// Validation
	if budget.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}

	if budget.BudgetType == "" {
		return c.Status(400).JSON(fiber.Map{"error": "budgetType is required"})
	}

	if budget.Period == "" {
		return c.Status(400).JSON(fiber.Map{"error": "period is required"})
	}

	// At least one limit must be set
	if budget.MaxTokens == nil && budget.MaxCost == nil && budget.MaxRequests == nil {
		return c.Status(400).JSON(fiber.Map{"error": "at least one limit (maxTokens, maxCost, or maxRequests) must be set"})
	}

	if err := h.usageTracker.CreateBudget(&budget); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(budget)
}

// UpdateBudget updates a budget limit
// PUT /api/ai/budgets/:id
func (h *AIUsageHandler) UpdateBudget(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.usageTracker.UpdateBudgetConfig(id, updates); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "budget updated successfully"})
}

// DeleteBudget deletes a budget
// DELETE /api/ai/budgets/:id
func (h *AIUsageHandler) DeleteBudget(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.usageTracker.DeleteBudget(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "budget deleted successfully"})
}

// GetAlerts returns recent budget alerts
// GET /api/ai/alerts?limit=50
func (h *AIUsageHandler) GetAlerts(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	limit := c.QueryInt("limit", 50)

	alerts, err := h.usageTracker.GetAlerts(userID, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(alerts)
}

// AcknowledgeAlert marks an alert as acknowledged
// POST /api/ai/alerts/:id/acknowledge
func (h *AIUsageHandler) AcknowledgeAlert(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.usageTracker.AcknowledgeAlert(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "alert acknowledged"})
}
