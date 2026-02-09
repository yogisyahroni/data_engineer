package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"

	"github.com/gofiber/fiber/v2"
)

// IngestData handles data ingestion from various sources
func IngestData(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		WorkspaceID  string                 `json:"workspaceId"`
		SourceType   string                 `json:"sourceType"` // CSV, JSON, API, DATABASE
		SourceConfig map[string]interface{} `json:"sourceConfig"`
		TargetTable  string                 `json:"targetTable"`
		Mode         string                 `json:"mode"` // OVERWRITE, APPEND
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Verify workspace access (ADMIN, OWNER, EDITOR only)
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", input.WorkspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied to workspace"})
	}

	if membership.Role != "ADMIN" && membership.Role != "OWNER" && membership.Role != "EDITOR" {
		return c.Status(403).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	// Data ingestion feature not yet implemented
	// This endpoint is reserved for future CSV/JSON/API/Database ingestion capabilities
	// For now, return 501 Not Implemented per HTTP standards
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error":   "Feature not implemented",
		"message": "Data ingestion is planned for a future release. Currently supports direct database connections via Connection Manager.",
		"status":  501,
	})
}

// PreviewIngest previews data before ingestion
func PreviewIngest(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		WorkspaceID  string                 `json:"workspaceId"`
		SourceType   string                 `json:"sourceType"` // CSV, JSON, API, DATABASE
		SourceConfig map[string]interface{} `json:"sourceConfig"`
		Limit        int                    `json:"limit"` // Number of rows to preview
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Verify workspace access
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", input.WorkspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied to workspace"})
	}

	if input.Limit == 0 {
		input.Limit = 10
	}

	// Data ingestion preview not yet implemented
	// This endpoint is reserved for future data preview capabilities
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error":   "Feature not implemented",
		"message": "Data ingestion preview is planned for a future release.",
		"status":  501,
	})
}
