package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// AuditHandler handles audit log API requests
type AuditHandler struct {
	auditService *services.AuditService
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(auditService *services.AuditService) *AuditHandler {
	return &AuditHandler{
		auditService: auditService,
	}
}

// GetAuditLogsRequest represents the query parameters for fetching audit logs
type GetAuditLogsRequest struct {
	UserID       *uint  `query:"user_id"`
	Username     string `query:"username"`
	Action       string `query:"action"`
	ResourceType string `query:"resource_type"`
	ResourceID   *uint  `query:"resource_id"`
	StartDate    string `query:"start_date"` // ISO 8601 format
	EndDate      string `query:"end_date"`   // ISO 8601 format
	IPAddress    string `query:"ip_address"`
	Limit        int    `query:"limit"`
	Offset       int    `query:"offset"`
}

// GetAuditLogsResponse represents the response for audit logs
type GetAuditLogsResponse struct {
	Logs       []models.AuditLog `json:"logs"`
	Total      int64             `json:"total"`
	Limit      int               `json:"limit"`
	Offset     int               `json:"offset"`
	TotalPages int               `json:"total_pages"`
}

// GetAuditLogs handles GET /api/admin/audit-logs
func (h *AuditHandler) GetAuditLogs(c *fiber.Ctx) error {
	// Parse query parameters
	var req GetAuditLogsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Build filter
	filter := &models.AuditLogFilter{
		UserID:       req.UserID,
		Username:     req.Username,
		Action:       req.Action,
		ResourceType: req.ResourceType,
		ResourceID:   req.ResourceID,
		IPAddress:    req.IPAddress,
		Limit:        req.Limit,
		Offset:       req.Offset,
	}

	// Parse date range if provided
	if req.StartDate != "" {
		startDate, err := time.Parse(time.RFC3339, req.StartDate)
		if err == nil {
			filter.StartDate = &startDate
		}
	}

	if req.EndDate != "" {
		endDate, err := time.Parse(time.RFC3339, req.EndDate)
		if err == nil {
			filter.EndDate = &endDate
		}
	}

	// Retrieve audit logs
	logs, total, err := h.auditService.GetAuditLogs(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve audit logs",
		})
	}

	// Calculate total pages
	limit := filter.Limit
	if limit == 0 {
		limit = 50
	}
	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	// Return response
	return c.JSON(GetAuditLogsResponse{
		Logs:       logs,
		Total:      total,
		Limit:      limit,
		Offset:     filter.Offset,
		TotalPages: totalPages,
	})
}

// GetUserActivity handles GET /api/admin/audit-logs/user/:id
func (h *AuditHandler) GetUserActivity(c *fiber.Ctx) error {
	// Parse user ID
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse limit
	limit := 100
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Retrieve user activity
	logs, err := h.auditService.GetUserActivity(c.Context(), uint(userID), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve user activity",
		})
	}

	return c.JSON(fiber.Map{
		"logs":  logs,
		"total": len(logs),
	})
}

// GetRecentActivity handles GET /api/admin/audit-logs/recent
func (h *AuditHandler) GetRecentActivity(c *fiber.Ctx) error {
	// Parse limit
	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Retrieve recent activity
	logs, err := h.auditService.GetRecentActivity(c.Context(), limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve recent activity",
		})
	}

	return c.JSON(fiber.Map{
		"logs":  logs,
		"total": len(logs),
	})
}

// GetAuditSummary handles GET /api/admin/audit-logs/summary
func (h *AuditHandler) GetAuditSummary(c *fiber.Ctx) error {
	// Parse date range (optional)
	var startDate, endDate *time.Time

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if parsed, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			startDate = &parsed
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if parsed, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			endDate = &parsed
		}
	}

	// Retrieve summary
	summary, err := h.auditService.GetAuditSummary(c.Context(), startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve audit summary",
		})
	}

	return c.JSON(summary)
}

// ExportAuditLogs handles GET /api/admin/audit-logs/export (CSV format)
func (h *AuditHandler) ExportAuditLogs(c *fiber.Ctx) error {
	// Parse query parameters (same as GetAuditLogs)
	var req GetAuditLogsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Build filter (no limit for export)
	filter := &models.AuditLogFilter{
		UserID:       req.UserID,
		Username:     req.Username,
		Action:       req.Action,
		ResourceType: req.ResourceType,
		ResourceID:   req.ResourceID,
		IPAddress:    req.IPAddress,
		Limit:        10000, // Max export limit
		Offset:       0,
	}

	// Parse date range
	if req.StartDate != "" {
		if startDate, err := time.Parse(time.RFC3339, req.StartDate); err == nil {
			filter.StartDate = &startDate
		}
	}
	if req.EndDate != "" {
		if endDate, err := time.Parse(time.RFC3339, req.EndDate); err == nil {
			filter.EndDate = &endDate
		}
	}

	// Retrieve audit logs
	logs, _, err := h.auditService.GetAuditLogs(c.Context(), filter)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve audit logs",
		})
	}

	// Generate CSV
	csv := "ID,User ID,Username,Action,Resource Type,Resource ID,Resource Name,IP Address,Created At\n"
	for _, log := range logs {
		userID := ""
		if log.UserID != nil {
			userID = strconv.Itoa(int(*log.UserID))
		}
		resourceID := ""
		if log.ResourceID != nil {
			resourceID = strconv.Itoa(int(*log.ResourceID))
		}

		csv += strconv.Itoa(int(log.ID)) + ","
		csv += userID + ","
		csv += "\"" + log.Username + "\","
		csv += log.Action + ","
		csv += log.ResourceType + ","
		csv += resourceID + ","
		csv += "\"" + log.ResourceName + "\","
		csv += log.IPAddress + ","
		csv += log.CreatedAt.Format(time.RFC3339) + "\n"
	}

	// Set headers for CSV download
	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", "attachment; filename=audit_logs_"+time.Now().Format("2006-01-02")+".csv")

	return c.SendString(csv)
}
