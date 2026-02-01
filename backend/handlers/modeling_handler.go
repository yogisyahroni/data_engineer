package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ModelingHandler struct {
	service *services.ModelingService
}

func NewModelingHandler(service *services.ModelingService) *ModelingHandler {
	return &ModelingHandler{service: service}
}

// Model Definitions Handlers

func (h *ModelingHandler) ListModelDefinitions(c *fiber.Ctx) error {
	workspaceID := c.Locals("workspaceID").(string)

	definitions, err := h.service.ListModelDefinitions(workspaceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve model definitions",
		})
	}

	return c.JSON(definitions)
}

func (h *ModelingHandler) GetModelDefinition(c *fiber.Ctx) error {
	id := c.Params("id")

	definition, err := h.service.GetModelDefinition(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Model definition not found",
		})
	}

	return c.JSON(definition)
}

func (h *ModelingHandler) CreateModelDefinition(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	workspaceID := c.Locals("workspaceID").(string)

	var req struct {
		Name        string                 `json:"name"`
		Description string                 `json:"description"`
		Type        string                 `json:"type"`
		SourceTable string                 `json:"sourceTable"`
		SourceQuery string                 `json:"sourceQuery"`
		Metadata    map[string]interface{} `json:"metadata"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name is required",
		})
	}

	if req.Type == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Type is required",
		})
	}

	// Build model
	model := &models.ModelDefinition{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		Type:        req.Type,
		SourceTable: req.SourceTable,
		SourceQuery: req.SourceQuery,
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
	}

	// Create model
	if err := h.service.CreateModelDefinition(model); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(model)
}

func (h *ModelingHandler) UpdateModelDefinition(c *fiber.Ctx) error {
	id := c.Params("id")

	// Get existing model
	existing, err := h.service.GetModelDefinition(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Model definition not found",
		})
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Type        string `json:"type"`
		SourceTable string `json:"sourceTable"`
		SourceQuery string `json:"sourceQuery"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update fields
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Type != "" {
		existing.Type = req.Type
	}
	if req.SourceTable != "" {
		existing.SourceTable = req.SourceTable
	}
	if req.SourceQuery != "" {
		existing.SourceQuery = req.SourceQuery
	}

	// Update model
	if err := h.service.UpdateModelDefinition(existing); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(existing)
}

func (h *ModelingHandler) DeleteModelDefinition(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.service.DeleteModelDefinition(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete model definition",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Model definition deleted successfully",
	})
}

// Metric Definitions Handlers

func (h *ModelingHandler) ListMetricDefinitions(c *fiber.Ctx) error {
	workspaceID := c.Locals("workspaceID").(string)
	modelID := c.Query("modelId")

	var modelIDPtr *string
	if modelID != "" {
		modelIDPtr = &modelID
	}

	metrics, err := h.service.ListMetricDefinitions(workspaceID, modelIDPtr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve metric definitions",
		})
	}

	return c.JSON(metrics)
}

func (h *ModelingHandler) GetMetricDefinition(c *fiber.Ctx) error {
	id := c.Params("id")

	metric, err := h.service.GetMetricDefinition(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Metric definition not found",
		})
	}

	return c.JSON(metric)
}

func (h *ModelingHandler) CreateMetricDefinition(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	workspaceID := c.Locals("workspaceID").(string)

	var req struct {
		Name            string                 `json:"name"`
		Description     string                 `json:"description"`
		Formula         string                 `json:"formula"`
		ModelID         *string                `json:"modelId"`
		DataType        string                 `json:"dataType"`
		Format          string                 `json:"format"`
		AggregationType string                 `json:"aggregationType"`
		Metadata        map[string]interface{} `json:"metadata"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name is required",
		})
	}

	if req.Formula == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Formula is required",
		})
	}

	if req.DataType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Data type is required",
		})
	}

	// Build metric
	metric := &models.MetricDefinition{
		ID:              uuid.New().String(),
		Name:            req.Name,
		Description:     req.Description,
		Formula:         req.Formula,
		ModelID:         req.ModelID,
		DataType:        req.DataType,
		Format:          req.Format,
		AggregationType: req.AggregationType,
		WorkspaceID:     workspaceID,
		CreatedBy:       userID,
	}

	// Create metric
	if err := h.service.CreateMetricDefinition(metric); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(metric)
}

func (h *ModelingHandler) UpdateMetricDefinition(c *fiber.Ctx) error {
	id := c.Params("id")

	// Get existing metric
	existing, err := h.service.GetMetricDefinition(id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Metric definition not found",
		})
	}

	var req struct {
		Name            string  `json:"name"`
		Description     string  `json:"description"`
		Formula         string  `json:"formula"`
		ModelID         *string `json:"modelId"`
		DataType        string  `json:"dataType"`
		Format          string  `json:"format"`
		AggregationType string  `json:"aggregationType"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update fields
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.Formula != "" {
		existing.Formula = req.Formula
	}
	if req.ModelID != nil {
		existing.ModelID = req.ModelID
	}
	if req.DataType != "" {
		existing.DataType = req.DataType
	}
	if req.Format != "" {
		existing.Format = req.Format
	}
	if req.AggregationType != "" {
		existing.AggregationType = req.AggregationType
	}

	// Update metric
	if err := h.service.UpdateMetricDefinition(existing); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(existing)
}

func (h *ModelingHandler) DeleteMetricDefinition(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.service.DeleteMetricDefinition(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete metric definition",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Metric definition deleted successfully",
	})
}
