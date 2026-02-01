package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetDataflows returns all dataflows for a user (with optional pagination)
func GetDataflows(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// Parse pagination params (0 = no pagination for backward compatibility)
	limit := c.QueryInt("limit", 0)
	offset := c.QueryInt("offset", 0)

	var dataflows []models.Dataflow
	query := database.DB.Where("user_id = ?", userID).
		Order("created_at DESC") // Consistent ordering for pagination

	// Backward compatibility: If no pagination params, return old format
	if limit == 0 {
		if err := query.Find(&dataflows).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(dataflows)
	}

	// Paginated response
	var total int64
	if err := database.DB.Model(&models.Dataflow{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	if err := query.Limit(limit).Offset(offset).Find(&dataflows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": dataflows,
		"pagination": fiber.Map{
			"total":   total,
			"limit":   limit,
			"offset":  offset,
			"hasMore": offset+limit < int(total),
		},
	})
}

// CreateDataflow creates a new dataflow
func CreateDataflow(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		Schedule    *string `json:"schedule"`
		IsActive    *bool   `json:"isActive"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	isActive := true
	if input.IsActive != nil {
		isActive = *input.IsActive
	}

	dataflow := models.Dataflow{
		ID:          uuid.New().String(),
		Name:        input.Name,
		Description: input.Description,
		UserID:      userID,
		Schedule:    input.Schedule,
		IsActive:    isActive,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := database.DB.Create(&dataflow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(dataflow)
}

// UpdateDataflow updates an existing dataflow
func UpdateDataflow(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	// Find existing dataflow and verify ownership
	var dataflow models.Dataflow
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&dataflow).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataflow not found"})
	}

	// Parse update data
	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Schedule    *string `json:"schedule"`
		IsActive    *bool   `json:"isActive"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Update allowed fields (explicit mapping to prevent mass assignment)
	if input.Name != nil {
		dataflow.Name = *input.Name
	}
	if input.Description != nil {
		dataflow.Description = input.Description
	}
	if input.Schedule != nil {
		dataflow.Schedule = input.Schedule
	}
	if input.IsActive != nil {
		dataflow.IsActive = *input.IsActive
	}

	dataflow.UpdatedAt = time.Now()

	if err := database.DB.Save(&dataflow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(dataflow)
}

// DeleteDataflow deletes a dataflow
func DeleteDataflow(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	// Find existing dataflow and verify ownership
	var dataflow models.Dataflow
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&dataflow).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataflow not found"})
	}

	// Delete dataflow
	if err := database.DB.Delete(&dataflow).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Dataflow deleted successfully"})
}

// RunDataflow executes a dataflow
func RunDataflow(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	dataflowID := c.Params("id")

	var dataflow models.Dataflow
	if err := database.DB.First(&dataflow, "id = ?", dataflowID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Dataflow not found"})
	}

	// Verify ownership
	if dataflow.UserID != userID {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
	}

	// Create dataflow run record
	run := models.DataflowRun{
		ID:         uuid.New().String(),
		DataflowID: dataflowID,
		Status:     "PENDING",
		StartedAt:  time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := database.DB.Create(&run).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Enqueue job for background processing
	services.GlobalJobQueue.Enqueue(services.Job{
		ID:        run.ID,
		Type:      services.JobTypeDataflow,
		EntityID:  dataflowID,
		CreatedAt: time.Now(),
		Retries:   0,
	})

	return c.Status(201).JSON(run)
}
