package handlers

import (
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
)

var engineService = services.NewEngineService(queryExecutor)

// Aggregate performs aggregation on query results
func Aggregate(c *fiber.Ctx) error {
	req := new(services.AggregateRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := engineService.Aggregate(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Aggregation failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}

// Forecast performs time-series forecasting
func Forecast(c *fiber.Ctx) error {
	req := new(services.ForecastRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := engineService.Forecast(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Forecast failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}

// DetectAnomalies detects anomalies in time-series data
func DetectAnomalies(c *fiber.Ctx) error {
	req := new(services.AnomalyRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := engineService.DetectAnomalies(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Anomaly detection failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}

// PerformClustering performs clustering on data
func PerformClustering(c *fiber.Ctx) error {
	req := new(services.ClusteringRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	ctx := c.Context()
	result, err := engineService.PerformClustering(ctx, *req)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Clustering failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}
