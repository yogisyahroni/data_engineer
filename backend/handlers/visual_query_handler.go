package handlers

import (
	"encoding/json"
	"fmt"
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// VisualQueryHandler handles visual query builder API endpoints
type VisualQueryHandler struct {
	db              *gorm.DB
	queryBuilder    *services.QueryBuilder
	queryExecutor   *services.QueryExecutor
	schemaDiscovery *services.SchemaDiscovery
	queryCache      *services.QueryCache
}

// NewVisualQueryHandler creates a new visual query handler
func NewVisualQueryHandler(
	db *gorm.DB,
	queryBuilder *services.QueryBuilder,
	queryExecutor *services.QueryExecutor,
	schemaDiscovery *services.SchemaDiscovery,
	queryCache *services.QueryCache,
) *VisualQueryHandler {
	return &VisualQueryHandler{
		db:              db,
		queryBuilder:    queryBuilder,
		queryExecutor:   queryExecutor,
		schemaDiscovery: schemaDiscovery,
		queryCache:      queryCache,
	}
}

// getUserContext helper to extract user context for RLS
func (h *VisualQueryHandler) getUserContext(c *fiber.Ctx) (string, string, *string) {
	// User ID from auth middleware
	userID := c.Locals("userID").(string)

	// Workspace ID from query param or header
	// This is the standard approach for multi-tenancy context
	workspaceID := c.Query("workspaceId")
	if workspaceID == "" {
		workspaceID = c.Get("X-Workspace-ID")
	}

	// User Role
	// Check if role is in locals (from middleware)
	var userRole *string
	if role, ok := c.Locals("role").(string); ok && role != "" {
		userRole = &role
	}

	return userID, workspaceID, userRole
}

// CreateVisualQuery creates a new visual query
// POST /api/visual-queries
func (h *VisualQueryHandler) CreateVisualQuery(c *fiber.Ctx) error {
	// Get user ID from context (set by auth middleware)
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Name         string                   `json:"name"`
		Description  *string                  `json:"description"`
		ConnectionID string                   `json:"connectionId"`
		CollectionID string                   `json:"collectionId"`
		Config       models.VisualQueryConfig `json:"config"`
		Tags         []string                 `json:"tags"`
		Pinned       bool                     `json:"pinned"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Validate required fields
	if req.Name == "" || req.ConnectionID == "" || req.CollectionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name, connectionId, and collectionId are required"})
	}

	// Get connection to validate and generate SQL
	var conn models.Connection
	if err := h.db.Where("id = ? AND user_id = ?", req.ConnectionID, userID).First(&conn).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Connection not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch connection"})
	}

	// Get context for RLS
	userIDStr, workspaceID, userRole := h.getUserContext(c)

	// Generate SQL from config
	generatedSQL, _, err := h.queryBuilder.BuildSQL(c.Context(), &req.Config, &conn, userIDStr, workspaceID, userRole)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate SQL: %v", err)})
	}

	// Marshal config to JSON
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to marshal config"})
	}

	// Create visual query
	visualQuery := models.VisualQuery{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Description:  req.Description,
		ConnectionID: req.ConnectionID,
		CollectionID: req.CollectionID,
		UserID:       userID.(string),
		Config:       configJSON,
		GeneratedSQL: &generatedSQL,
		Tags:         req.Tags,
		Pinned:       req.Pinned,
	}

	if err := h.db.Create(&visualQuery).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create visual query"})
	}

	return c.Status(fiber.StatusCreated).JSON(visualQuery.ToDTO())
}

// GetVisualQuery retrieves a visual query by ID
// GET /api/visual-queries/:id
func (h *VisualQueryHandler) GetVisualQuery(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")

	var visualQuery models.VisualQuery
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&visualQuery).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Visual query not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch visual query"})
	}

	return c.JSON(visualQuery.ToDTO())
}

// UpdateVisualQuery updates a visual query
// PUT /api/visual-queries/:id
func (h *VisualQueryHandler) UpdateVisualQuery(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")

	var req struct {
		Name        string                   `json:"name"`
		Description *string                  `json:"description"`
		Config      models.VisualQueryConfig `json:"config"`
		Tags        []string                 `json:"tags"`
		Pinned      bool                     `json:"pinned"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Fetch existing visual query
	var visualQuery models.VisualQuery
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&visualQuery).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Visual query not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch visual query"})
	}

	// Get connection for validation
	var conn models.Connection
	if err := h.db.Where("id = ?", visualQuery.ConnectionID).First(&conn).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch connection"})
	}

	// Get context for RLS
	userIDStr, workspaceID, userRole := h.getUserContext(c)

	// Generate SQL from new config
	generatedSQL, _, err := h.queryBuilder.BuildSQL(c.Context(), &req.Config, &conn, userIDStr, workspaceID, userRole)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate SQL: %v", err)})
	}

	// Marshal config to JSON
	configJSON, err := json.Marshal(req.Config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to marshal config"})
	}

	// Update visual query
	visualQuery.Name = req.Name
	visualQuery.Description = req.Description
	visualQuery.Config = configJSON
	visualQuery.GeneratedSQL = &generatedSQL
	visualQuery.Tags = req.Tags
	visualQuery.Pinned = req.Pinned

	if err := h.db.Save(&visualQuery).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update visual query"})
	}

	// Invalidate cache for this query (if cache is enabled)
	if h.queryCache != nil {
		if err := h.queryCache.InvalidateQuery(c.Context(), id); err != nil {
			// Log error but don't fail the request
			services.LogWarn("cache_invalidation_failed", "Failed to invalidate cache for query", map[string]interface{}{
				"query_id": id,
				"error":    err,
			})
		}
	}

	return c.JSON(visualQuery.ToDTO())
}

// DeleteVisualQuery deletes a visual query
// DELETE /api/visual-queries/:id
func (h *VisualQueryHandler) DeleteVisualQuery(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")

	// Check ownership
	var visualQuery models.VisualQuery
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&visualQuery).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Visual query not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch visual query"})
	}

	// Delete
	if err := h.db.Delete(&visualQuery).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete visual query"})
	}

	// Invalidate cache for this query (if cache is enabled)
	if h.queryCache != nil {
		if err := h.queryCache.InvalidateQuery(c.Context(), id); err != nil {
			// Log error but don't fail the request
			services.LogWarn("cache_invalidation_failed", "Failed to invalidate cache for query", map[string]interface{}{
				"query_id": id,
				"error":    err,
			})
		}
	}

	return c.JSON(fiber.Map{"message": "Visual query deleted successfully"})
}

// GenerateSQL generates SQL from visual configuration
// POST /api/visual-queries/generate-sql
func (h *VisualQueryHandler) GenerateSQL(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		ConnectionID string                   `json:"connectionId"`
		Config       models.VisualQueryConfig `json:"config"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.ConnectionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "connectionId is required"})
	}

	// Get connection
	var conn models.Connection
	if err := h.db.Where("id = ? AND user_id = ?", req.ConnectionID, userID).First(&conn).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Connection not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch connection"})
	}

	// Get context for RLS
	userIDStr, workspaceID, userRole := h.getUserContext(c)

	// Generate SQL
	generatedSQL, params, err := h.queryBuilder.BuildSQL(c.Context(), &req.Config, &conn, userIDStr, workspaceID, userRole)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate SQL: %v", err)})
	}

	return c.JSON(fiber.Map{
		"sql":    generatedSQL,
		"params": params,
	})
}

// PreviewVisualQuery executes a visual query and returns preview results (max 100 rows)
// POST /api/visual-queries/:id/preview
func (h *VisualQueryHandler) PreviewVisualQuery(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id := c.Params("id")

	// Fetch visual query
	var visualQuery models.VisualQuery
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&visualQuery).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Visual query not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch visual query"})
	}

	// Get connection
	var conn models.Connection
	if err := h.db.Where("id = ?", visualQuery.ConnectionID).First(&conn).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch connection"})
	}

	// Unmarshal config
	var config models.VisualQueryConfig
	if err := json.Unmarshal(visualQuery.Config, &config); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse config"})
	}

	// Limit to 100 rows for preview
	previewLimit := 100
	config.Limit = &previewLimit

	// Get context for RLS
	userIDStr, workspaceID, userRole := h.getUserContext(c)

	// Generate SQL
	generatedSQL, params, err := h.queryBuilder.BuildSQL(c.Context(), &config, &conn, userIDStr, workspaceID, userRole)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate SQL: %v", err)})
	}

	// Execute query using query builder's ExecuteQuery method
	result, err := h.queryBuilder.ExecuteQuery(c.Context(), &config, &conn, h.queryExecutor, userIDStr, id, workspaceID, userRole)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to execute query: %v", err)})
	}

	// Store params for debugging
	_ = params

	return c.JSON(fiber.Map{
		"sql":     generatedSQL,
		"results": result,
	})
}

// GetVisualQueries retrieves user's visual queries with pagination
// GET /api/visual-queries
func (h *VisualQueryHandler) GetVisualQueries(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Parse query parameters
	collectionID := c.Query("collectionId")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// Build query
	query := h.db.Where("user_id = ?", userID)
	if collectionID != "" {
		query = query.Where("collection_id = ?", collectionID)
	}

	// Get total count
	var total int64
	if err := query.Model(&models.VisualQuery{}).Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to count visual queries"})
	}

	// Get visual queries
	var visualQueries []models.VisualQuery
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&visualQueries).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch visual queries"})
	}

	// Convert to DTOs
	dtos := make([]models.VisualQueryDTO, len(visualQueries))
	for i, vq := range visualQueries {
		dtos[i] = vq.ToDTO()
	}

	return c.JSON(fiber.Map{
		"data":  dtos,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetCacheStats returns cache statistics
// GET /api/v1/visual-queries/cache/stats
func (h *VisualQueryHandler) GetCacheStats(c *fiber.Ctx) error {
	// Check if cache is enabled
	if h.queryCache == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Cache is not enabled",
			"message": "Redis cache is not configured or unavailable",
		})
	}

	// Get cache statistics
	stats, err := h.queryCache.GetStats(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to get cache stats: %v", err),
		})
	}

	return c.JSON(stats)
}

// GetJoinSuggestions suggests joins for selected tables
// POST /api/visual-queries/join-suggestions
func (h *VisualQueryHandler) GetJoinSuggestions(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		ConnectionID string   `json:"connectionId"`
		TableNames   []string `json:"tableNames"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if req.ConnectionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "connectionId is required"})
	}

	if len(req.TableNames) == 0 {
		return c.JSON(fiber.Map{"suggestions": []interface{}{}})
	}

	// Get connection
	var conn models.Connection
	if err := h.db.Where("id = ? AND user_id = ?", req.ConnectionID, userID).First(&conn).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Connection not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch connection"})
	}

	// Get join suggestions
	suggestions, err := h.schemaDiscovery.GetJoinSuggestions(c.Context(), &conn, req.TableNames)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": fmt.Sprintf("Failed to get join suggestions: %v", err)})
	}

	return c.JSON(fiber.Map{"suggestions": suggestions})
}
