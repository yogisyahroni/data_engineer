package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ==================== APP HANDLERS ====================

// GetApps returns all apps for the authenticated user
func GetApps(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var apps []models.App
	if err := database.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&apps).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(apps)
}

// CreateApp creates a new app
func CreateApp(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		WorkspaceID *string `json:"workspaceId"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}

	app := models.App{
		ID:          uuid.New().String(),
		Name:        input.Name,
		Description: input.Description,
		UserID:      userID,
		WorkspaceID: input.WorkspaceID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := database.DB.Create(&app).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(app)
}

// GetApp returns a single app by ID
func GetApp(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "App not found"})
	}

	return c.JSON(app)
}

// UpdateApp updates an app (owner only)
func UpdateApp(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "App not found"})
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Explicit field mapping
	if input.Name != nil {
		app.Name = *input.Name
	}
	if input.Description != nil {
		app.Description = input.Description
	}

	app.UpdatedAt = time.Now()

	if err := database.DB.Save(&app).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(app)
}

// DeleteApp deletes an app (owner only, cascade delete canvases & widgets)
func DeleteApp(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "App not found"})
	}

	// Delete all canvases and widgets (cascade)
	var canvases []models.Canvas
	database.DB.Where("app_id = ?", id).Find(&canvases)
	for _, canvas := range canvases {
		database.DB.Where("canvas_id = ?", canvas.ID).Delete(&models.Widget{})
	}
	database.DB.Where("app_id = ?", id).Delete(&models.Canvas{})

	// Delete app
	if err := database.DB.Delete(&app).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "App deleted successfully"})
}

// ==================== CANVAS HANDLERS ====================

// GetCanvases returns all canvases for an app
func GetCanvases(c *fiber.Ctx) error {
	appID := c.Query("appId")
	userID := c.Locals("userID").(string)

	if appID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "appId is required"})
	}

	// Verify app ownership
	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", appID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "App not found"})
	}

	var canvases []models.Canvas
	if err := database.DB.Where("app_id = ?", appID).
		Order("created_at DESC").
		Find(&canvases).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(canvases)
}

// CreateCanvas creates a new canvas
func CreateCanvas(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		AppID  string       `json:"appId"`
		Name   string       `json:"name"`
		Config models.JSONB `json:"config"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}

	// Verify app ownership
	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", input.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "App not found"})
	}

	canvas := models.Canvas{
		ID:        uuid.New().String(),
		AppID:     input.AppID,
		Name:      input.Name,
		Config:    input.Config,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&canvas).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(canvas)
}

// GetCanvas returns a single canvas by ID
func GetCanvas(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var canvas models.Canvas
	if err := database.DB.First(&canvas, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Canvas not found"})
	}

	// Verify app ownership
	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", canvas.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Access denied"})
	}

	return c.JSON(canvas)
}

// UpdateCanvas updates a canvas
func UpdateCanvas(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var canvas models.Canvas
	if err := database.DB.First(&canvas, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Canvas not found"})
	}

	// Verify app ownership
	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", canvas.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Access denied"})
	}

	var input struct {
		Name   *string      `json:"name"`
		Config models.JSONB `json:"config"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Explicit field mapping
	if input.Name != nil {
		canvas.Name = *input.Name
	}
	if input.Config != nil {
		canvas.Config = input.Config
	}

	canvas.UpdatedAt = time.Now()

	if err := database.DB.Save(&canvas).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(canvas)
}

// DeleteCanvas deletes a canvas (cascade delete widgets)
func DeleteCanvas(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var canvas models.Canvas
	if err := database.DB.First(&canvas, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Canvas not found"})
	}

	// Verify app ownership
	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", canvas.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Access denied"})
	}

	// Delete all widgets (cascade)
	database.DB.Where("canvas_id = ?", id).Delete(&models.Widget{})

	// Delete canvas
	if err := database.DB.Delete(&canvas).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Canvas deleted successfully"})
}

// ==================== WIDGET HANDLERS ====================

// GetWidgets returns all widgets for a canvas
func GetWidgets(c *fiber.Ctx) error {
	canvasID := c.Query("canvasId")
	userID := c.Locals("userID").(string)

	if canvasID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "canvasId is required"})
	}

	// Verify canvas ownership (through app)
	var canvas models.Canvas
	if err := database.DB.First(&canvas, "id = ?", canvasID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Canvas not found"})
	}

	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", canvas.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Access denied"})
	}

	var widgets []models.Widget
	if err := database.DB.Where("canvas_id = ?", canvasID).
		Order("created_at ASC").
		Find(&widgets).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(widgets)
}

// CreateWidget creates a new widget
func CreateWidget(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		CanvasID string       `json:"canvasId"`
		Type     string       `json:"type"` // 'chart', 'table', 'metric'
		Config   models.JSONB `json:"config"`
		Position models.JSONB `json:"position"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Type == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Type is required"})
	}

	// Verify canvas ownership (through app)
	var canvas models.Canvas
	if err := database.DB.First(&canvas, "id = ?", input.CanvasID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Canvas not found"})
	}

	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", canvas.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Access denied"})
	}

	widget := models.Widget{
		ID:        uuid.New().String(),
		CanvasID:  input.CanvasID,
		Type:      input.Type,
		Config:    input.Config,
		Position:  input.Position,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&widget).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(widget)
}

// UpdateWidget updates a widget
func UpdateWidget(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var widget models.Widget
	if err := database.DB.First(&widget, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Widget not found"})
	}

	// Verify canvas ownership (through app)
	var canvas models.Canvas
	if err := database.DB.First(&canvas, "id = ?", widget.CanvasID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Canvas not found"})
	}

	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", canvas.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Access denied"})
	}

	var input struct {
		Type     *string      `json:"type"`
		Config   models.JSONB `json:"config"`
		Position models.JSONB `json:"position"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Explicit field mapping
	if input.Type != nil {
		widget.Type = *input.Type
	}
	if input.Config != nil {
		widget.Config = input.Config
	}
	if input.Position != nil {
		widget.Position = input.Position
	}

	widget.UpdatedAt = time.Now()

	if err := database.DB.Save(&widget).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(widget)
}

// DeleteWidget deletes a widget
func DeleteWidget(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var widget models.Widget
	if err := database.DB.First(&widget, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Widget not found"})
	}

	// Verify canvas ownership (through app)
	var canvas models.Canvas
	if err := database.DB.First(&canvas, "id = ?", widget.CanvasID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Canvas not found"})
	}

	var app models.App
	if err := database.DB.Where("id = ? AND user_id = ?", canvas.AppID, userID).First(&app).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Access denied"})
	}

	if err := database.DB.Delete(&widget).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Widget deleted successfully"})
}
