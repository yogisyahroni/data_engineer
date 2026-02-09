package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// FrontendLogHandler handles frontend logging requests
type FrontendLogHandler struct {
	db *gorm.DB
}

// NewFrontendLogHandler creates a new frontend log handler
func NewFrontendLogHandler(db *gorm.DB) *FrontendLogHandler {
	return &FrontendLogHandler{db: db}
}

// CreateFrontendLogRequest represents the request body for creating a frontend log
type CreateFrontendLogRequest struct {
	Level     string                 `json:"level" validate:"required,oneof=debug info warn error"`
	Operation string                 `json:"operation" validate:"required,min=1,max=100"`
	Message   string                 `json:"message" validate:"required,min=1"`
	Metadata  map[string]interface{} `json:"metadata"`
	UserAgent string                 `json:"userAgent"`
	URL       string                 `json:"url"`
}

// CreateFrontendLog handles POST /api/logs/frontend
// Creates a new frontend log entry
func (h *FrontendLogHandler) CreateFrontendLog(c *fiber.Ctx) error {
	var req CreateFrontendLogRequest
	if err := c.BodyParser(&req); err != nil {
		services.LogWarn("frontend_log_parse_error", "Failed to parse frontend log request", map[string]interface{}{
			"error": err.Error(),
		})
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validation
	if req.Level == "" || req.Operation == "" || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Missing required fields: level, operation, message",
		})
	}

	// Validate level
	validLevels := map[string]bool{"debug": true, "info": true, "warn": true, "error": true}
	if !validLevels[strings.ToLower(req.Level)] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid log level. Must be one of: debug, info, warn, error",
		})
	}

	// Get user ID from context (optional - may be nil for unauthenticated users)
	var userID *uint
	if userIDValue := c.Locals("userID"); userIDValue != nil {
		if uid, ok := userIDValue.(uint); ok {
			userID = &uid
		}
	}

	// Get client IP address
	ipAddress := c.IP()

	// Create log entry
	log := models.FrontendLog{
		UserID:    userID,
		Level:     strings.ToLower(req.Level),
		Operation: req.Operation,
		Message:   req.Message,
		UserAgent: req.UserAgent,
		URL:       req.URL,
		IPAddress: ipAddress,
	}

	// Set metadata if provided
	if req.Metadata != nil {
		if err := log.Metadata.Scan(req.Metadata); err != nil {
			services.LogWarn("frontend_log_metadata_error", "Failed to serialize metadata", map[string]interface{}{
				"error": err.Error(),
			})
		}
	}

	// Save to database
	if err := h.db.Create(&log).Error; err != nil {
		services.LogError("frontend_log_create_error", "Failed to create frontend log", map[string]interface{}{
			"error":     err.Error(),
			"operation": req.Operation,
			"level":     req.Level,
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save log entry",
		})
	}

	// Also log to backend structured logging for high-severity logs
	if req.Level == "error" {
		services.LogError("frontend_error", req.Message, map[string]interface{}{
			"operation": req.Operation,
			"metadata":  req.Metadata,
			"url":       req.URL,
			"user_id":   userID,
		})
	} else if req.Level == "warn" {
		services.LogWarn("frontend_warning", req.Message, map[string]interface{}{
			"operation": req.Operation,
			"metadata":  req.Metadata,
			"url":       req.URL,
			"user_id":   userID,
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Log entry created successfully",
		"id":      log.ID,
	})
}

// GetFrontendLogs handles GET /api/logs/frontend
// Retrieves frontend logs with filtering (admin only)
func (h *FrontendLogHandler) GetFrontendLogs(c *fiber.Ctx) error {
	// Parse query parameters
	level := c.Query("level")
	operation := c.Query("operation")
	limit := c.QueryInt("limit", 100) // Default 100
	offset := c.QueryInt("offset", 0)

	// Build query
	query := h.db.Model(&models.FrontendLog{}).Order("created_at DESC")

	if level != "" {
		query = query.Where("level = ?", strings.ToLower(level))
	}

	if operation != "" {
		query = query.Where("operation = ?", operation)
	}

	// Pagination
	query = query.Limit(limit).Offset(offset)

	// Execute query
	var logs []models.FrontendLog
	if err := query.Find(&logs).Error; err != nil {
		services.LogError("frontend_log_fetch_error", "Failed to fetch frontend logs", map[string]interface{}{
			"error": err.Error(),
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch logs",
		})
	}

	// Get total count
	var total int64
	countQuery := h.db.Model(&models.FrontendLog{})
	if level != "" {
		countQuery = countQuery.Where("level = ?", strings.ToLower(level))
	}
	if operation != "" {
		countQuery = countQuery.Where("operation = ?", operation)
	}
	countQuery.Count(&total)

	return c.JSON(fiber.Map{
		"logs":   logs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// CleanupOldLogs handles DELETE /api/logs/frontend/cleanup
// Deletes frontend logs older than specified days (admin only)
func (h *FrontendLogHandler) CleanupOldLogs(c *fiber.Ctx) error {
	days := c.QueryInt("days", 30) // Default 30 days

	result := h.db.Exec("DELETE FROM frontend_logs WHERE created_at < NOW() - INTERVAL '? days'", days)
	if result.Error != nil {
		services.LogError("frontend_log_cleanup_error", "Failed to cleanup old frontend logs", map[string]interface{}{
			"error": result.Error.Error(),
			"days":  days,
		})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to cleanup logs",
		})
	}

	services.LogInfo("frontend_log_cleanup", "Cleaned up old frontend logs", map[string]interface{}{
		"deleted_count": result.RowsAffected,
		"days":          days,
	})

	return c.JSON(fiber.Map{
		"message": "Cleanup completed successfully",
		"deleted": result.RowsAffected,
	})
}
