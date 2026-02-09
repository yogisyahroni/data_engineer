package handlers

import (
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
)

type EngineHandler struct {
	service *services.EngineService
}

func NewEngineHandler(s *services.EngineService) *EngineHandler {
	return &EngineHandler{
		service: s,
	}
}

// Aggregate performs aggregation on query results
func (h *EngineHandler) Aggregate(c *fiber.Ctx) error {
	req := new(services.AggregateRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := h.service.Aggregate(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Aggregation failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    result,
	})
}

// Forecast performs time-series forecasting
func (h *EngineHandler) Forecast(c *fiber.Ctx) error {
	req := new(services.ForecastRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := h.service.Forecast(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Forecast failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    result,
	})
}

// DetectAnomalies detects anomalies in time-series data
func (h *EngineHandler) DetectAnomalies(c *fiber.Ctx) error {
	req := new(services.AnomalyRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := h.service.DetectAnomalies(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Anomaly detection failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    result,
	})
}

// PerformClustering performs clustering on data
func (h *EngineHandler) PerformClustering(c *fiber.Ctx) error {
	req := new(services.ClusteringRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := h.service.PerformClustering(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Clustering failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    result,
	})
}
