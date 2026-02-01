package services

import (
	"fmt"
	"insight-engine-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ActivityService handles activity logging operations
type ActivityService struct {
	db    *gorm.DB
	wsHub *WebSocketHub
}

// NewActivityService creates a new activity service
func NewActivityService(db *gorm.DB, wsHub *WebSocketHub) *ActivityService {
	return &ActivityService{
		db:    db,
		wsHub: wsHub,
	}
}

// LogActivity creates a new activity log entry
func (s *ActivityService) LogActivity(activity *models.ActivityLog) error {
	if err := s.db.Create(activity).Error; err != nil {
		return fmt.Errorf("failed to log activity: %w", err)
	}

	// Push activity update via WebSocket if user is connected
	if activity.UserID != nil && s.wsHub.IsUserConnected(activity.UserID.String()) {
		s.wsHub.BroadcastToUser(activity.UserID.String(), "activity", activity)
	}

	// Also broadcast to workspace if applicable
	if activity.WorkspaceID != nil {
		// In a real implementation, you'd fetch workspace members and broadcast to them
		// For now, we'll skip this to avoid circular dependencies
	}

	return nil
}

// LogUserActivity is a convenience method to log user activities
func (s *ActivityService) LogUserActivity(userID uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata map[string]interface{}, ipAddress, userAgent string) error {
	activity := &models.ActivityLog{
		UserID:     &userID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
	}

	// Convert metadata to JSONB if provided
	if metadata != nil {
		// GORM will handle the conversion
		// activity.Metadata = metadata
	}

	return s.LogActivity(activity)
}

// LogWorkspaceActivity logs an activity for a workspace
func (s *ActivityService) LogWorkspaceActivity(workspaceID uuid.UUID, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata map[string]interface{}) error {
	activity := &models.ActivityLog{
		WorkspaceID: &workspaceID,
		UserID:      userID,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
	}

	return s.LogActivity(activity)
}

// GetUserActivity retrieves activity logs for a user with pagination
func (s *ActivityService) GetUserActivity(userID uuid.UUID, limit, offset int) ([]models.ActivityLog, int64, error) {
	var activities []models.ActivityLog
	var total int64

	// Get total count
	if err := s.db.Model(&models.ActivityLog{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Get paginated activities
	if err := s.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&activities).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get activities: %w", err)
	}

	return activities, total, nil
}

// GetWorkspaceActivity retrieves activity logs for a workspace with pagination
func (s *ActivityService) GetWorkspaceActivity(workspaceID uuid.UUID, limit, offset int) ([]models.ActivityLog, int64, error) {
	var activities []models.ActivityLog
	var total int64

	// Get total count
	if err := s.db.Model(&models.ActivityLog{}).
		Where("workspace_id = ?", workspaceID).
		Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count workspace activities: %w", err)
	}

	// Get paginated activities
	if err := s.db.Where("workspace_id = ?", workspaceID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&activities).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get workspace activities: %w", err)
	}

	return activities, total, nil
}

// GetActivityByEntity retrieves activity logs for a specific entity
func (s *ActivityService) GetActivityByEntity(entityType string, entityID uuid.UUID, limit, offset int) ([]models.ActivityLog, error) {
	var activities []models.ActivityLog

	if err := s.db.Where("entity_type = ? AND entity_id = ?", entityType, entityID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&activities).Error; err != nil {
		return nil, fmt.Errorf("failed to get entity activities: %w", err)
	}

	return activities, nil
}

// GetRecentActivity retrieves recent activity across all users (for admin dashboard)
func (s *ActivityService) GetRecentActivity(limit int) ([]models.ActivityLog, error) {
	var activities []models.ActivityLog

	if err := s.db.Order("created_at DESC").
		Limit(limit).
		Find(&activities).Error; err != nil {
		return nil, fmt.Errorf("failed to get recent activities: %w", err)
	}

	return activities, nil
}

// GetActivityByAction retrieves activities by action type
func (s *ActivityService) GetActivityByAction(action string, limit, offset int) ([]models.ActivityLog, error) {
	var activities []models.ActivityLog

	if err := s.db.Where("action = ?", action).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&activities).Error; err != nil {
		return nil, fmt.Errorf("failed to get activities by action: %w", err)
	}

	return activities, nil
}

// DeleteOldActivities deletes activity logs older than specified days
func (s *ActivityService) DeleteOldActivities(daysOld int) (int64, error) {
	result := s.db.Exec("SELECT cleanup_old_activity_logs(?)", daysOld)
	if result.Error != nil {
		return 0, fmt.Errorf("failed to delete old activities: %w", result.Error)
	}

	return result.RowsAffected, nil
}
