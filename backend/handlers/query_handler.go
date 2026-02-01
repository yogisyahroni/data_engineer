package handlers

import (
	"context"
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var queryExecutor = services.NewQueryExecutor()

// GetQueries returns a list of saved queries
func GetQueries(c *fiber.Ctx) error {
	// Get user ID from auth middleware
	userID, ok := c.Locals("userId").(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized",
		})
	}

	var queries []models.SavedQuery
	result := database.DB.Where("user_id = ?", userID).
		Preload("Connection").
		Order("updated_at DESC").
		Find(&queries)

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not fetch queries",
			"error":   result.Error.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   queries,
	})
}

// GetQuery returns a single query by ID
func GetQuery(c *fiber.Ctx) error {
	queryID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	var query models.SavedQuery
	result := database.DB.Where("id = ? AND user_id = ?", queryID, userID).
		Preload("Connection").
		First(&query)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Query not found",
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   query,
	})
}

// CreateQuery creates a new saved query
func CreateQuery(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(string)

	query := new(models.SavedQuery)
	if err := c.BodyParser(query); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Validation
	if query.Name == "" || query.SQL == "" || query.ConnectionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Name, SQL, and ConnectionID are required",
		})
	}

	// Generate ID and set user
	query.ID = uuid.New().String()
	query.UserID = userID

	result := database.DB.Create(&query)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not create query",
			"error":   result.Error.Error(),
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"status": "success",
		"data":   query,
	})
}

// UpdateQuery updates an existing query
func UpdateQuery(c *fiber.Ctx) error {
	queryID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Check ownership
	var existing models.SavedQuery
	if err := database.DB.Where("id = ? AND user_id = ?", queryID, userID).First(&existing).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Query not found",
		})
	}

	// Parse updates
	updates := new(models.SavedQuery)
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
			"message": "Could not update query",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   existing,
	})
}

// DeleteQuery deletes a query
func DeleteQuery(c *fiber.Ctx) error {
	queryID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	result := database.DB.Where("id = ? AND user_id = ?", queryID, userID).Delete(&models.SavedQuery{})
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not delete query",
			"error":   result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Query not found",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Query deleted",
	})
}

// RunQuery executes a saved query
func RunQuery(c *fiber.Ctx) error {
	queryID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Fetch query
	var query models.SavedQuery
	if err := database.DB.Where("id = ? AND user_id = ?", queryID, userID).
		Preload("Connection").
		First(&query).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Query not found",
		})
	}

	// Parse request body for limit/offset
	type RunParams struct {
		Limit  *int `json:"limit"`
		Offset *int `json:"offset"`
	}
	params := new(RunParams)
	_ = c.BodyParser(params)

	// Execute query
	ctx := context.Background()
	result, err := queryExecutor.Execute(ctx, query.Connection, query.SQL, params.Limit, params.Offset)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Query execution failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}

// ExecuteAdHocQuery executes a query without saving it
func ExecuteAdHocQuery(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(string)

	req := new(models.QueryExecutionRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Validation
	if req.SQL == "" || req.ConnectionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "SQL and ConnectionID are required",
		})
	}

	// Fetch connection
	var conn models.Connection
	if err := database.DB.Where("id = ? AND user_id = ?", req.ConnectionID, userID).First(&conn).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	// Execute query
	ctx := context.Background()
	result, err := queryExecutor.Execute(ctx, &conn, req.SQL, req.Limit, req.Offset)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Query execution failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}
