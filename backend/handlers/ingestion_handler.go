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

	// TODO: Implement actual ingestion logic
	// For now, return success with metadata
	result := fiber.Map{
		"status":       "PENDING",
		"sourceType":   input.SourceType,
		"targetTable":  input.TargetTable,
		"mode":         input.Mode,
		"rowsIngested": 0,
		"message":      "Ingestion job queued for processing",
	}

	return c.Status(202).JSON(result)
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

	// Set default limit
	if input.Limit == 0 {
		input.Limit = 10
	}

	// TODO: Implement actual preview logic based on source type
	// For now, return mock preview data
	preview := fiber.Map{
		"sourceType": input.SourceType,
		"columns":    []string{"column1", "column2", "column3"},
		"rows": []map[string]interface{}{
			{"column1": "value1", "column2": "value2", "column3": "value3"},
			{"column1": "value4", "column2": "value5", "column3": "value6"},
		},
		"totalRows":     2,
		"previewLimit":  input.Limit,
		"detectedTypes": map[string]string{"column1": "string", "column2": "string", "column3": "string"},
	}

	return c.JSON(preview)
}
