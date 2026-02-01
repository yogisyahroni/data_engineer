package handlers

import (
	"encoding/json"
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetPipelines returns all pipelines for a workspace (with optional pagination)
func GetPipelines(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	workspaceID := c.Query("workspaceId")

	if workspaceID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "workspaceId query parameter required"})
	}

	// Verify workspace access
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied to workspace"})
	}

	// Parse pagination params (0 = no pagination for backward compatibility)
	limit := c.QueryInt("limit", 0)
	offset := c.QueryInt("offset", 0)

	var pipelines []models.Pipeline
	query := database.DB.Where("workspace_id = ?", workspaceID).
		Order("created_at DESC") // Consistent ordering for pagination

	// Backward compatibility: If no pagination params, return old format
	if limit == 0 {
		if err := query.Find(&pipelines).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(pipelines)
	}

	// Paginated response
	var total int64
	if err := database.DB.Model(&models.Pipeline{}).
		Where("workspace_id = ?", workspaceID).
		Count(&total).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	if err := query.Limit(limit).Offset(offset).Find(&pipelines).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": pipelines,
		"pagination": fiber.Map{
			"total":   total,
			"limit":   limit,
			"offset":  offset,
			"hasMore": offset+limit < int(total),
		},
	})
}

// GetPipeline returns a single pipeline by ID
func GetPipeline(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	pipelineID := c.Params("id")

	var pipeline models.Pipeline
	if err := database.DB.Preload("QualityRules").First(&pipeline, "id = ?", pipelineID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Pipeline not found"})
	}

	// Verify workspace access
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", pipeline.WorkspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
	}

	return c.JSON(pipeline)
}

// CreatePipeline creates a new pipeline
func CreatePipeline(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		Name                string                 `json:"name"`
		Description         *string                `json:"description"`
		WorkspaceID         string                 `json:"workspaceId"`
		SourceType          string                 `json:"sourceType"`
		SourceConfig        map[string]interface{} `json:"sourceConfig"`
		DestinationType     string                 `json:"destinationType"`
		DestinationConfig   map[string]interface{} `json:"destinationConfig"`
		Mode                string                 `json:"mode"`
		TransformationSteps []interface{}          `json:"transformationSteps"`
		QualityRules        []interface{}          `json:"qualityRules"`
		ScheduleCron        *string                `json:"scheduleCron"`
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

	// Convert maps to JSON strings
	sourceConfigJSON, err := json.Marshal(input.SourceConfig)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source config"})
	}

	var destinationConfigStr *string
	if input.DestinationConfig != nil {
		destinationConfigJSON, err := json.Marshal(input.DestinationConfig)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid destination config"})
		}
		str := string(destinationConfigJSON)
		destinationConfigStr = &str
	}

	var transformationStepsStr *string
	if input.TransformationSteps != nil {
		transformationStepsJSON, err := json.Marshal(input.TransformationSteps)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid transformation steps"})
		}
		str := string(transformationStepsJSON)
		transformationStepsStr = &str
	}

	pipeline := models.Pipeline{
		ID:                  uuid.New().String(),
		Name:                input.Name,
		Description:         input.Description,
		WorkspaceID:         input.WorkspaceID,
		SourceType:          input.SourceType,
		SourceConfig:        string(sourceConfigJSON),
		DestinationType:     input.DestinationType,
		DestinationConfig:   destinationConfigStr,
		Mode:                input.Mode,
		TransformationSteps: transformationStepsStr,
		ScheduleCron:        input.ScheduleCron,
		IsActive:            true,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	if err := database.DB.Create(&pipeline).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(pipeline)
}

// UpdatePipeline updates an existing pipeline
func UpdatePipeline(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	pipelineID := c.Params("id")

	var pipeline models.Pipeline
	if err := database.DB.First(&pipeline, "id = ?", pipelineID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Pipeline not found"})
	}

	// Verify workspace access (ADMIN, OWNER, EDITOR only)
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", pipeline.WorkspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
	}

	if membership.Role != "ADMIN" && membership.Role != "OWNER" && membership.Role != "EDITOR" {
		return c.Status(403).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	var input struct {
		Name                *string                `json:"name"`
		Description         *string                `json:"description"`
		SourceType          *string                `json:"sourceType"`
		SourceConfig        map[string]interface{} `json:"sourceConfig"`
		DestinationType     *string                `json:"destinationType"`
		DestinationConfig   map[string]interface{} `json:"destinationConfig"`
		Mode                *string                `json:"mode"`
		TransformationSteps []interface{}          `json:"transformationSteps"`
		ScheduleCron        *string                `json:"scheduleCron"`
		IsActive            *bool                  `json:"isActive"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Update fields
	updates := make(map[string]interface{})
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.SourceType != nil {
		updates["source_type"] = *input.SourceType
	}
	if input.SourceConfig != nil {
		sourceConfigJSON, _ := json.Marshal(input.SourceConfig)
		updates["source_config"] = string(sourceConfigJSON)
	}
	if input.DestinationType != nil {
		updates["destination_type"] = *input.DestinationType
	}
	if input.DestinationConfig != nil {
		destinationConfigJSON, _ := json.Marshal(input.DestinationConfig)
		updates["destination_config"] = string(destinationConfigJSON)
	}
	if input.Mode != nil {
		updates["mode"] = *input.Mode
	}
	if input.TransformationSteps != nil {
		transformationStepsJSON, _ := json.Marshal(input.TransformationSteps)
		updates["transformation_steps"] = string(transformationStepsJSON)
	}
	if input.ScheduleCron != nil {
		updates["schedule_cron"] = *input.ScheduleCron
	}
	if input.IsActive != nil {
		updates["is_active"] = *input.IsActive
	}
	updates["updated_at"] = time.Now()

	if err := database.DB.Model(&pipeline).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Reload to get updated data
	database.DB.First(&pipeline, "id = ?", pipelineID)

	return c.JSON(pipeline)
}

// DeletePipeline deletes a pipeline
func DeletePipeline(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	pipelineID := c.Params("id")

	var pipeline models.Pipeline
	if err := database.DB.First(&pipeline, "id = ?", pipelineID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Pipeline not found"})
	}

	// Verify workspace access (ADMIN, OWNER only)
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", pipeline.WorkspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
	}

	if membership.Role != "ADMIN" && membership.Role != "OWNER" {
		return c.Status(403).JSON(fiber.Map{"error": "Only workspace admins/owners can delete pipelines"})
	}

	// Delete pipeline (cascade will delete executions and quality rules)
	if err := database.DB.Delete(&pipeline).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(204)
}

// RunPipeline executes a pipeline (creates a job execution record)
func RunPipeline(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	pipelineID := c.Params("id")

	var pipeline models.Pipeline
	if err := database.DB.First(&pipeline, "id = ?", pipelineID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Pipeline not found"})
	}

	// Verify workspace access
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", pipeline.WorkspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
	}

	// Create execution record
	execution := models.JobExecution{
		ID:            uuid.New().String(),
		PipelineID:    pipelineID,
		Status:        "PENDING",
		StartedAt:     time.Now(),
		RowsProcessed: 0,
	}

	if err := database.DB.Create(&execution).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Enqueue job for background processing
	services.GlobalJobQueue.Enqueue(services.Job{
		ID:        execution.ID,
		Type:      services.JobTypePipeline,
		EntityID:  pipelineID,
		CreatedAt: time.Now(),
		Retries:   0,
	})

	return c.Status(201).JSON(execution)
}

// GetPipelineStats returns pipeline statistics for a workspace
func GetPipelineStats(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	workspaceID := c.Query("workspaceId")

	if workspaceID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "workspaceId query parameter required"})
	}

	// Verify workspace access
	var membership models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).First(&membership).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Access denied to workspace"})
	}

	// 1. Pipeline Counts
	var totalPipelines int64
	database.DB.Model(&models.Pipeline{}).Where("workspace_id = ?", workspaceID).Count(&totalPipelines)

	var activePipelines int64
	database.DB.Model(&models.Pipeline{}).Where("workspace_id = ? AND is_active = ?", workspaceID, true).Count(&activePipelines)

	// 2. Recent Executions (Last 24h)
	oneDayAgo := time.Now().Add(-24 * time.Hour)

	var recentExecutions []models.JobExecution
	database.DB.Joins("JOIN \"Pipeline\" ON \"JobExecution\".pipeline_id = \"Pipeline\".id").
		Where("\"Pipeline\".workspace_id = ? AND \"JobExecution\".started_at >= ?", workspaceID, oneDayAgo).
		Find(&recentExecutions)

	totalExecutions := len(recentExecutions)
	failedExecutions := 0
	successExecutions := 0
	totalRowsProcessed := 0

	for _, exec := range recentExecutions {
		if exec.Status == "FAILED" {
			failedExecutions++
		} else if exec.Status == "COMPLETED" {
			successExecutions++
		}
		totalRowsProcessed += exec.RowsProcessed
	}

	successRate := 0.0
	if totalExecutions > 0 {
		successRate = float64(successExecutions) / float64(totalExecutions) * 100
	}

	// 3. Recent Failures (Top 5)
	var recentFailures []struct {
		ID           string    `json:"id"`
		PipelineName string    `json:"pipelineName"`
		StartedAt    time.Time `json:"startedAt"`
		Error        *string   `json:"error"`
	}

	database.DB.Table("\"JobExecution\"").
		Select("\"JobExecution\".id, \"Pipeline\".name as pipeline_name, \"JobExecution\".started_at, \"JobExecution\".error").
		Joins("JOIN \"Pipeline\" ON \"JobExecution\".pipeline_id = \"Pipeline\".id").
		Where("\"Pipeline\".workspace_id = ? AND \"JobExecution\".status = ?", workspaceID, "FAILED").
		Order("\"JobExecution\".started_at DESC").
		Limit(5).
		Scan(&recentFailures)

	// 4. All Pipelines for Heatmap
	var allPipelines []struct {
		ID         string     `json:"id"`
		Name       string     `json:"name"`
		LastStatus *string    `json:"lastStatus"`
		LastRunAt  *time.Time `json:"lastRunAt"`
	}

	database.DB.Table("\"Pipeline\"").
		Select("id, name, last_status, last_run_at").
		Where("workspace_id = ?", workspaceID).
		Order("last_run_at DESC").
		Scan(&allPipelines)

	return c.JSON(fiber.Map{
		"overview": fiber.Map{
			"totalPipelines":     totalPipelines,
			"activePipelines":    activePipelines,
			"successRate":        successRate,
			"totalRowsProcessed": totalRowsProcessed,
			"totalExecutions":    totalExecutions,
		},
		"pipelines":      allPipelines,
		"recentFailures": recentFailures,
	})
}
