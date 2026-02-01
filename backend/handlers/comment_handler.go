package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetComments returns comments for a specific entity
func GetComments(c *fiber.Ctx) error {
	entityType := c.Query("entityType")
	entityID := c.Query("entityId")

	if entityType == "" || entityID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "entityType and entityId are required"})
	}

	var comments []models.Comment
	if err := database.DB.Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("created_at DESC").
		Find(&comments).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(comments)
}

// CreateComment creates a new comment
func CreateComment(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		EntityType string `json:"entityType"` // 'pipeline', 'dataflow', 'collection'
		EntityID   string `json:"entityId"`
		Content    string `json:"content"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Content == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Content is required"})
	}

	comment := models.Comment{
		ID:         uuid.New().String(),
		EntityType: input.EntityType,
		EntityID:   input.EntityID,
		UserID:     userID,
		Content:    input.Content,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(comment)
}

// UpdateComment updates a comment (only by owner)
func UpdateComment(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var comment models.Comment
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&comment).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Comment not found or access denied"})
	}

	var input struct {
		Content *string `json:"content"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Explicit field mapping (anti-mass assignment)
	if input.Content != nil {
		comment.Content = *input.Content
	}

	comment.UpdatedAt = time.Now()

	if err := database.DB.Save(&comment).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(comment)
}

// DeleteComment deletes a comment (only by owner)
func DeleteComment(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var comment models.Comment
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&comment).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Comment not found or access denied"})
	}

	if err := database.DB.Delete(&comment).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Comment deleted successfully"})
}
