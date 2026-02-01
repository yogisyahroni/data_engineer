package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SemanticLayerHandler struct {
	service *services.SemanticLayerService
}

func NewSemanticLayerHandler(service *services.SemanticLayerService) *SemanticLayerHandler {
	return &SemanticLayerHandler{service: service}
}

// ListSemanticModels godoc
// @Summary List semantic models
// @Description Get all semantic models for the user's workspace
// @Tags semantic-layer
// @Accept json
// @Produce json
// @Success 200 {array} models.SemanticModel
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/semantic/models [get]
func (h *SemanticLayerHandler) ListSemanticModels(c *fiber.Ctx) error {
	// Get workspace ID from context (set by auth middleware)
	workspaceID := c.Locals("workspaceID").(string)

	models, err := h.service.ListModelsByWorkspace(workspaceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve semantic models",
		})
	}

	return c.JSON(models)
}

// CreateSemanticModel godoc
// @Summary Create semantic model
// @Description Create a new semantic model with dimensions and metrics
// @Tags semantic-layer
// @Accept json
// @Produce json
// @Param model body CreateSemanticModelRequest true "Model data"
// @Success 201 {object} models.SemanticModel
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/semantic/models [post]
func (h *SemanticLayerHandler) CreateSemanticModel(c *fiber.Ctx) error {
	// Get user and workspace from context
	userID := c.Locals("userID").(string)
	workspaceID := c.Locals("workspaceID").(string)

	var req CreateSemanticModelRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Model name is required",
		})
	}
	if req.DataSourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Data source ID is required",
		})
	}
	if req.TableName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Table name is required",
		})
	}

	// Build model
	model := &models.SemanticModel{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Description:  req.Description,
		DataSourceID: req.DataSourceID,
		Table:        req.TableName,
		WorkspaceID:  workspaceID,
		CreatedBy:    userID,
	}

	// Add dimensions
	for _, dimReq := range req.Dimensions {
		dimension := models.SemanticDimension{
			ID:          uuid.New().String(),
			ModelID:     model.ID,
			Name:        dimReq.Name,
			ColumnName:  dimReq.ColumnName,
			DataType:    dimReq.DataType,
			Description: dimReq.Description,
			IsHidden:    dimReq.IsHidden,
		}
		model.Dimensions = append(model.Dimensions, dimension)
	}

	// Add metrics
	for _, metricReq := range req.Metrics {
		metric := models.SemanticMetric{
			ID:          uuid.New().String(),
			ModelID:     model.ID,
			Name:        metricReq.Name,
			Formula:     metricReq.Formula,
			Description: metricReq.Description,
			Format:      metricReq.Format,
		}
		model.Metrics = append(model.Metrics, metric)
	}

	// Create model
	if err := h.service.CreateModel(model); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(model)
}

// ListSemanticMetrics godoc
// @Summary List semantic metrics
// @Description Get all metrics for a model or workspace
// @Tags semantic-layer
// @Accept json
// @Produce json
// @Param modelId query string false "Model ID to filter by"
// @Success 200 {array} models.SemanticMetric
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/semantic/metrics [get]
func (h *SemanticLayerHandler) ListSemanticMetrics(c *fiber.Ctx) error {
	workspaceID := c.Locals("workspaceID").(string)
	modelID := c.Query("modelId")

	var metrics []models.SemanticMetric
	var err error

	if modelID != "" {
		metrics, err = h.service.ListMetricsByModel(modelID)
	} else {
		metrics, err = h.service.ListAllMetrics(workspaceID)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve metrics",
		})
	}

	return c.JSON(metrics)
}

// ExecuteSemanticQuery godoc
// @Summary Execute semantic query
// @Description Execute a query using business terms (dimensions and metrics)
// @Tags semantic-layer
// @Accept json
// @Produce json
// @Param query body SemanticQueryRequest true "Query data"
// @Success 200 {object} SemanticQueryResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/semantic/query [post]
func (h *SemanticLayerHandler) ExecuteSemanticQuery(c *fiber.Ctx) error {
	var req SemanticQueryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.ModelID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Model ID is required",
		})
	}
	if len(req.Dimensions) == 0 && len(req.Metrics) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "At least one dimension or metric is required",
		})
	}

	// Get model
	model, err := h.service.GetModelByID(req.ModelID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Model not found",
		})
	}

	// Set default limit
	limit := req.Limit
	if limit == 0 {
		limit = 100
	}

	// Translate semantic query to SQL
	sql, args, err := h.service.TranslateSemanticQuery(model, req.Dimensions, req.Metrics, req.Filters, limit)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Execute query
	// Note: In production, this should execute against the actual data source
	// For now, we'll return the generated SQL
	response := SemanticQueryResponse{
		SQL:        sql,
		Args:       args,
		Dimensions: req.Dimensions,
		Metrics:    req.Metrics,
		RowCount:   0, // Would be populated after execution
	}

	return c.JSON(response)
}

// Request/Response types

type CreateSemanticModelRequest struct {
	Name         string                   `json:"name"`
	Description  string                   `json:"description"`
	DataSourceID string                   `json:"dataSourceId"`
	TableName    string                   `json:"tableName"`
	Dimensions   []CreateDimensionRequest `json:"dimensions"`
	Metrics      []CreateMetricRequest    `json:"metrics"`
}

type CreateDimensionRequest struct {
	Name        string `json:"name"`
	ColumnName  string `json:"columnName"`
	DataType    string `json:"dataType"`
	Description string `json:"description"`
	IsHidden    bool   `json:"isHidden"`
}

type CreateMetricRequest struct {
	Name        string `json:"name"`
	Formula     string `json:"formula"`
	Description string `json:"description"`
	Format      string `json:"format"`
}

type SemanticQueryRequest struct {
	ModelID    string                 `json:"modelId"`
	Dimensions []string               `json:"dimensions"`
	Metrics    []string               `json:"metrics"`
	Filters    map[string]interface{} `json:"filters"`
	Limit      int                    `json:"limit"`
}

type SemanticQueryResponse struct {
	SQL        string        `json:"sql"`
	Args       []interface{} `json:"args"`
	Dimensions []string      `json:"dimensions"`
	Metrics    []string      `json:"metrics"`
	RowCount   int           `json:"rowCount"`
}
