package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"insight-engine-backend/models"
	"insight-engine-backend/services"
)

// RateLimitHandler handles rate limit configuration endpoints
type RateLimitHandler struct {
	rateLimiter *services.RateLimiter
}

// NewRateLimitHandler creates a new rate limit handler
func NewRateLimitHandler(rateLimiter *services.RateLimiter) *RateLimitHandler {
	return &RateLimitHandler{
		rateLimiter: rateLimiter,
	}
}

// GetConfigs returns all rate limit configurations
// GET /api/rate-limits
func (h *RateLimitHandler) GetConfigs(c *fiber.Ctx) error {
	configs := h.rateLimiter.GetAllConfigs()
	return c.JSON(configs)
}

// GetConfig returns a single rate limit configuration
// GET /api/rate-limits/:id
func (h *RateLimitHandler) GetConfig(c *fiber.Ctx) error {
	name := c.Params("name")
	if name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}

	config, err := h.rateLimiter.GetConfig(name)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(config)
}

// CreateConfig creates a new rate limit configuration
// POST /api/rate-limits
func (h *RateLimitHandler) CreateConfig(c *fiber.Ctx) error {
	var config models.RateLimitConfig
	if err := c.BodyParser(&config); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	// Validation
	if config.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}

	if config.LimitType == "" {
		return c.Status(400).JSON(fiber.Map{"error": "limitType is required"})
	}

	if config.RequestsPerMinute <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "requestsPerMinute must be positive"})
	}

	if err := h.rateLimiter.CreateConfig(&config); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(config)
}

// UpdateConfig updates a rate limit configuration
// PUT /api/rate-limits/:id
func (h *RateLimitHandler) UpdateConfig(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.rateLimiter.UpdateConfig(id, updates); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "rate limit config updated successfully"})
}

// DeleteConfig deletes a rate limit configuration
// DELETE /api/rate-limits/:id
func (h *RateLimitHandler) DeleteConfig(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.rateLimiter.DeleteConfig(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "rate limit config deleted successfully"})
}

// GetViolations returns recent rate limit violations
// GET /api/rate-limits/violations?limit=50
func (h *RateLimitHandler) GetViolations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	limit := c.QueryInt("limit", 50)

	violations, err := h.rateLimiter.GetViolations(userID, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(violations)
}
