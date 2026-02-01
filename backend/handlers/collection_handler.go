package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetCollections returns all collections for a user
func GetCollections(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var collections []models.Collection
	if err := database.DB.Where("user_id = ?", userID).
		Preload("Items").
		Order("created_at DESC").
		Find(&collections).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(collections)
}

// CreateCollection creates a new collection
func CreateCollection(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		WorkspaceID *string `json:"workspaceId"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	collection := models.Collection{
		ID:          uuid.New().String(),
		Name:        input.Name,
		Description: input.Description,
		UserID:      userID,
		WorkspaceID: input.WorkspaceID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := database.DB.Create(&collection).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(collection)
}

// GetCollection returns a single collection
func GetCollection(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var collection models.Collection
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).
		Preload("Items").
		First(&collection).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Collection not found"})
	}

	return c.JSON(collection)
}

// UpdateCollection updates a collection
func UpdateCollection(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var collection models.Collection
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&collection).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Collection not found"})
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Explicit field mapping (anti-mass assignment)
	if input.Name != nil {
		collection.Name = *input.Name
	}
	if input.Description != nil {
		collection.Description = input.Description
	}

	collection.UpdatedAt = time.Now()

	if err := database.DB.Save(&collection).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(collection)
}

// DeleteCollection deletes a collection
func DeleteCollection(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var collection models.Collection
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&collection).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Collection not found"})
	}

	if err := database.DB.Delete(&collection).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Collection deleted successfully"})
}

// AddCollectionItem adds an item to a collection
func AddCollectionItem(c *fiber.Ctx) error {
	collectionID := c.Params("id")
	userID := c.Locals("userID").(string)

	// Verify collection ownership
	var collection models.Collection
	if err := database.DB.Where("id = ? AND user_id = ?", collectionID, userID).First(&collection).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Collection not found"})
	}

	var input struct {
		ItemType string `json:"itemType"` // 'pipeline' or 'dataflow'
		ItemID   string `json:"itemId"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	item := models.CollectionItem{
		ID:           uuid.New().String(),
		CollectionID: collectionID,
		ItemType:     input.ItemType,
		ItemID:       input.ItemID,
		CreatedAt:    time.Now(),
	}

	if err := database.DB.Create(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(item)
}

// RemoveCollectionItem removes an item from a collection
func RemoveCollectionItem(c *fiber.Ctx) error {
	collectionID := c.Params("id")
	itemID := c.Params("itemId")
	userID := c.Locals("userID").(string)

	// Verify collection ownership
	var collection models.Collection
	if err := database.DB.Where("id = ? AND user_id = ?", collectionID, userID).First(&collection).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Collection not found"})
	}

	if err := database.DB.Where("id = ? AND collection_id = ?", itemID, collectionID).
		Delete(&models.CollectionItem{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Item removed successfully"})
}
