package services

import (
	"context"
	"fmt"
	"insight-engine-backend/models"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// AuditService handles audit logging operations
type AuditService struct {
	db         *gorm.DB
	logChannel chan *models.AuditLog
	wg         sync.WaitGroup
	shutdown   chan struct{}
	workers    int
}

// NewAuditService creates a new audit service with async logging
func NewAuditService(db *gorm.DB) *AuditService {
	svc := &AuditService{
		db:         db,
		logChannel: make(chan *models.AuditLog, 1000), // Buffer 1000 logs
		shutdown:   make(chan struct{}),
		workers:    5, // 5 concurrent workers
	}

	// Start worker goroutines for async logging
	for i := 0; i < svc.workers; i++ {
		svc.wg.Add(1)
		go svc.worker(i)
	}

	LogInfo("audit_service_init", "Audit service initialized", map[string]interface{}{"workers": svc.workers, "buffer_size": 1000})
	return svc
}

// worker processes audit logs from the channel
func (s *AuditService) worker(id int) {
	defer s.wg.Done()

	for {
		select {
		case auditLog, ok := <-s.logChannel:
			if !ok {
				LogInfo("audit_worker_stop", "Audit worker channel closed", map[string]interface{}{"worker_id": id})
				return
			}

			// Insert into database (blocking operation, but doesn't block caller)
			if err := s.db.Create(auditLog).Error; err != nil {
				LogError("audit_insert_failed", "Audit worker failed to insert log", map[string]interface{}{"worker_id": id, "error": err})
			}

		case <-s.shutdown:
			LogInfo("audit_worker_shutdown", "Audit worker shutdown signal received", map[string]interface{}{"worker_id": id})
			return
		}
	}
}

// Stop gracefully shuts down the audit service
func (s *AuditService) Stop() {
	LogInfo("audit_service_shutdown", "Shutting down audit service", nil)

	// Close shutdown channel to signal workers
	close(s.shutdown)

	// Close log channel (no more logs accepted)
	close(s.logChannel)

	// Wait for all workers to finish processing
	s.wg.Wait()

	LogInfo("audit_service_shutdown_complete", "Audit service shutdown complete", nil)
}

// Log sends an audit log entry asynchronously (non-blocking)
func (s *AuditService) Log(entry *models.AuditLogEntry) {
	auditLog := entry.ToAuditLog()

	select {
	case s.logChannel <- auditLog:
		// Successfully queued (non-blocking)
	default:
		// Channel full - log warning but don't block
		LogWarn("audit_channel_full", "Audit log channel full, dropping log", map[string]interface{}{"action": entry.Action, "resource_type": entry.ResourceType})
	}
}

// LogWithContext creates audit log from Fiber context
func (s *AuditService) LogWithContext(c *fiber.Ctx, entry *models.AuditLogEntry) {
	// Extract IP address
	entry.IPAddress = c.IP()

	// Extract User-Agent
	entry.UserAgent = c.Get("User-Agent")

	// Log asynchronously
	s.Log(entry)
}

// Helper methods for common audit actions

// LogCreate logs a CREATE operation
func (s *AuditService) LogCreate(c *fiber.Ctx, userID *uint, username string, resourceType string, resourceID *uint, resourceName string, newValue interface{}) {
	s.LogWithContext(c, &models.AuditLogEntry{
		UserID:       userID,
		Username:     username,
		Action:       models.ActionCreate,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		NewValue:     newValue,
	})
}

// LogUpdate logs an UPDATE operation
func (s *AuditService) LogUpdate(c *fiber.Ctx, userID *uint, username string, resourceType string, resourceID *uint, resourceName string, oldValue interface{}, newValue interface{}) {
	s.LogWithContext(c, &models.AuditLogEntry{
		UserID:       userID,
		Username:     username,
		Action:       models.ActionUpdate,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		OldValue:     oldValue,
		NewValue:     newValue,
	})
}

// LogDelete logs a DELETE operation
func (s *AuditService) LogDelete(c *fiber.Ctx, userID *uint, username string, resourceType string, resourceID *uint, resourceName string, oldValue interface{}) {
	s.LogWithContext(c, &models.AuditLogEntry{
		UserID:       userID,
		Username:     username,
		Action:       models.ActionDelete,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		OldValue:     oldValue,
	})
}

// LogExecute logs an EXECUTE operation (e.g., query execution)
func (s *AuditService) LogExecute(c *fiber.Ctx, userID *uint, username string, resourceType string, resourceID *uint, resourceName string, metadata map[string]interface{}) {
	s.LogWithContext(c, &models.AuditLogEntry{
		UserID:       userID,
		Username:     username,
		Action:       models.ActionExecute,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		ResourceName: resourceName,
		Metadata:     metadata,
	})
}

// LogLogin logs a LOGIN operation
func (s *AuditService) LogLogin(c *fiber.Ctx, userID *uint, username string, success bool) {
	metadata := map[string]interface{}{
		"success": success,
	}

	if !success {
		metadata["error"] = "invalid_credentials"
	}

	s.LogWithContext(c, &models.AuditLogEntry{
		UserID:       userID,
		Username:     username,
		Action:       models.ActionLogin,
		ResourceType: "auth",
		Metadata:     metadata,
	})
}

// LogLogout logs a LOGOUT operation
func (s *AuditService) LogLogout(c *fiber.Ctx, userID *uint, username string) {
	s.LogWithContext(c, &models.AuditLogEntry{
		UserID:       userID,
		Username:     username,
		Action:       models.ActionLogout,
		ResourceType: "auth",
	})
}

// Query methods for retrieving audit logs

// GetAuditLogs retrieves audit logs with optional filters
func (s *AuditService) GetAuditLogs(ctx context.Context, filter *models.AuditLogFilter) ([]models.AuditLog, int64, error) {
	query := s.db.Model(&models.AuditLog{})

	// Apply filters
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}

	if filter.Username != "" {
		query = query.Where("username ILIKE ?", "%"+filter.Username+"%")
	}

	if filter.Action != "" {
		query = query.Where("action = ?", filter.Action)
	}

	if filter.ResourceType != "" {
		query = query.Where("resource_type = ?", filter.ResourceType)
	}

	if filter.ResourceID != nil {
		query = query.Where("resource_id = ?", *filter.ResourceID)
	}

	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}

	if filter.EndDate != nil {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	if filter.IPAddress != "" {
		query = query.Where("ip_address = ?", filter.IPAddress)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	// Apply pagination
	limit := filter.Limit
	if limit == 0 {
		limit = 50 // Default limit
	}
	if limit > 1000 {
		limit = 1000 // Max limit
	}

	query = query.Limit(limit).Offset(filter.Offset)

	// Order by created_at DESC
	query = query.Order("created_at DESC")

	// Execute query
	var logs []models.AuditLog
	if err := query.Find(&logs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to retrieve audit logs: %w", err)
	}

	return logs, total, nil
}

// GetUserActivity retrieves audit logs for a specific user
func (s *AuditService) GetUserActivity(ctx context.Context, userID uint, limit int) ([]models.AuditLog, error) {
	if limit == 0 {
		limit = 100
	}

	var logs []models.AuditLog
	err := s.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve user activity: %w", err)
	}

	return logs, nil
}

// GetRecentActivity retrieves recent audit logs across all users
func (s *AuditService) GetRecentActivity(ctx context.Context, limit int) ([]models.AuditLog, error) {
	if limit == 0 {
		limit = 50
	}

	var logs []models.AuditLog
	err := s.db.Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve recent activity: %w", err)
	}

	return logs, nil
}

// GetAuditSummary retrieves aggregated audit statistics
func (s *AuditService) GetAuditSummary(ctx context.Context, startDate, endDate *time.Time) (*models.AuditLogSummary, error) {
	query := s.db.Model(&models.AuditLog{})

	// Apply date range filter
	if startDate != nil {
		query = query.Where("created_at >= ?", *startDate)
	}
	if endDate != nil {
		query = query.Where("created_at <= ?", *endDate)
	}

	summary := &models.AuditLogSummary{
		LogsByAction:   make(map[string]int64),
		LogsByResource: make(map[string]int64),
		LogsByUser:     make(map[string]int64),
	}

	// Get total logs
	query.Count(&summary.TotalLogs)

	// Group by action
	var actionCounts []struct {
		Action string
		Count  int64
	}
	s.db.Model(&models.AuditLog{}).
		Select("action, COUNT(*) as count").
		Group("action").
		Scan(&actionCounts)

	for _, ac := range actionCounts {
		summary.LogsByAction[ac.Action] = ac.Count
	}

	// Group by resource type
	var resourceCounts []struct {
		ResourceType string
		Count        int64
	}
	s.db.Model(&models.AuditLog{}).
		Select("resource_type, COUNT(*) as count").
		Group("resource_type").
		Scan(&resourceCounts)

	for _, rc := range resourceCounts {
		summary.LogsByResource[rc.ResourceType] = rc.Count
	}

	// Get most active users
	var userActivities []models.UserActivity
	s.db.Model(&models.AuditLog{}).
		Select("user_id, username, COUNT(*) as log_count, MAX(created_at) as last_action").
		Where("user_id IS NOT NULL").
		Group("user_id, username").
		Order("log_count DESC").
		Limit(10).
		Scan(&userActivities)

	summary.MostActiveUsers = userActivities

	return summary, nil
}

// CleanupOldLogs removes audit logs older than the specified retention period
func (s *AuditService) CleanupOldLogs(ctx context.Context, retentionDays int) (int64, error) {
	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)

	result := s.db.Where("created_at < ?", cutoffDate).Delete(&models.AuditLog{})
	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup old logs: %w", result.Error)
	}

	LogInfo("audit_cleanup", "Cleaned up old audit logs", map[string]interface{}{"logs_deleted": result.RowsAffected, "retention_days": retentionDays})
	return result.RowsAffected, nil
}
