package handlers

import (
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// MaterializedViewHandler handles API requests for materialized views
type MaterializedViewHandler struct {
	db      *gorm.DB
	service *services.MaterializedViewService
}

// NewMaterializedViewHandler creates a new materialized view handler
func NewMaterializedViewHandler(db *gorm.DB, service *services.MaterializedViewService) *MaterializedViewHandler {
	return &MaterializedViewHandler{
		db:      db,
		service: service,
	}
}

// CreateMaterializedViewRequest represents the request to create a materialized view
type CreateMaterializedViewRequest struct {
	ConnectionID string `json:"connectionId"`
	Name         string `json:"name"`
	SourceQuery  string `json:"sourceQuery"`
	RefreshMode  string `json:"refreshMode"` // "full" or "incremental"
	Schedule     string `json:"schedule"`    // cron expression (optional)
}

// UpdateScheduleRequest represents the request to update refresh schedule
type UpdateScheduleRequest struct {
	Schedule string `json:"schedule"` // cron expression
}

// CreateMaterializedView handles POST /api/materialized-views
func (h *MaterializedViewHandler) CreateMaterializedView(c *fiber.Ctx) error {
	var req CreateMaterializedViewRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request",
			"message": err.Error(),
		})
	}

	// Validate required fields
	if req.ConnectionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": "connectionId is required",
		})
	}
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": "name is required",
		})
	}
	if req.SourceQuery == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": "sourceQuery is required",
		})
	}
	if req.RefreshMode == "" {
		req.RefreshMode = "full" // Default to full refresh
	}

	// Get user ID from context (set by auth middleware)
	userID := c.Locals("userId").(string)

	// Create materialized view
	mv, err := h.service.CreateMaterializedView(
		c.Context(),
		userID,
		req.ConnectionID,
		req.Name,
		req.SourceQuery,
		req.RefreshMode,
		req.Schedule,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create materialized view",
			"message": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(mv)
}

// ListMaterializedViews handles GET /api/materialized-views
func (h *MaterializedViewHandler) ListMaterializedViews(c *fiber.Ctx) error {
	connectionID := c.Query("connectionId")
	if connectionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing parameter",
			"message": "connectionId query parameter is required",
		})
	}

	mvs, err := h.service.ListMaterializedViews(connectionID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to list materialized views",
			"message": err.Error(),
		})
	}

	return c.JSON(mvs)
}

// GetMaterializedView handles GET /api/materialized-views/:id
func (h *MaterializedViewHandler) GetMaterializedView(c *fiber.Ctx) error {
	mvID := c.Params("id")
	if mvID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing parameter",
			"message": "materialized view ID is required",
		})
	}

	mv, err := h.service.GetMaterializedView(mvID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Not found",
				"message": "Materialized view not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get materialized view",
			"message": err.Error(),
		})
	}

	return c.JSON(mv)
}

// RefreshMaterializedView handles POST /api/materialized-views/:id/refresh
func (h *MaterializedViewHandler) RefreshMaterializedView(c *fiber.Ctx) error {
	mvID := c.Params("id")
	if mvID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing parameter",
			"message": "materialized view ID is required",
		})
	}

	if err := h.service.RefreshMaterializedView(c.Context(), mvID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to refresh materialized view",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Refresh started successfully",
		"status":  "refreshing",
	})
}

// DropMaterializedView handles DELETE /api/materialized-views/:id
func (h *MaterializedViewHandler) DropMaterializedView(c *fiber.Ctx) error {
	mvID := c.Params("id")
	if mvID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing parameter",
			"message": "materialized view ID is required",
		})
	}

	if err := h.service.DropMaterializedView(c.Context(), mvID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to drop materialized view",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Materialized view dropped successfully",
	})
}

// GetRefreshHistory handles GET /api/materialized-views/:id/history
func (h *MaterializedViewHandler) GetRefreshHistory(c *fiber.Ctx) error {
	mvID := c.Params("id")
	if mvID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing parameter",
			"message": "materialized view ID is required",
		})
	}

	// Optional limit parameter
	limit := c.QueryInt("limit", 10)

	history, err := h.service.GetRefreshHistory(mvID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get refresh history",
			"message": err.Error(),
		})
	}

	return c.JSON(history)
}

// UpdateSchedule handles PUT /api/materialized-views/:id/schedule
func (h *MaterializedViewHandler) UpdateSchedule(c *fiber.Ctx) error {
	mvID := c.Params("id")
	if mvID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing parameter",
			"message": "materialized view ID is required",
		})
	}

	var req UpdateScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request",
			"message": err.Error(),
		})
	}

	if err := h.service.UpdateSchedule(mvID, req.Schedule); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update schedule",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message":  "Schedule updated successfully",
		"schedule": req.Schedule,
	})
}

// GetStatus handles GET /api/materialized-views/:id/status
func (h *MaterializedViewHandler) GetStatus(c *fiber.Ctx) error {
	mvID := c.Params("id")
	if mvID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing parameter",
			"message": "materialized view ID is required",
		})
	}

	mv, err := h.service.GetMaterializedView(mvID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Not found",
				"message": "Materialized view not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get status",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"id":           mv.ID,
		"name":         mv.Name,
		"status":       mv.Status,
		"lastRefresh":  mv.LastRefresh,
		"nextRefresh":  mv.NextRefresh,
		"rowCount":     mv.RowCount,
		"refreshCount": mv.RefreshCount,
		"errorMessage": mv.ErrorMessage,
	})
}
