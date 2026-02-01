package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// Notification represents a user notification
type Notification struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    uuid.UUID      `gorm:"not null;type:uuid" json:"userId"`
	Title     string         `gorm:"not null" json:"title"`
	Message   string         `gorm:"not null;type:text" json:"message"`
	Type      string         `gorm:"not null;default:'info'" json:"type"` // info, success, warning, error
	Link      string         `json:"link,omitempty"`
	IsRead    bool           `gorm:"not null;default:false" json:"isRead"`
	Metadata  datatypes.JSON `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

// ActivityLog represents an audit log entry
type ActivityLog struct {
	ID         uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID     *uuid.UUID     `gorm:"type:uuid" json:"userId,omitempty"`
	WorkspaceID *uuid.UUID    `gorm:"type:uuid" json:"workspaceId,omitempty"`
	Action     string         `gorm:"not null" json:"action"`     // created_model, updated_budget
	EntityType string         `gorm:"not null" json:"entityType"` // model, metric, budget
	EntityID   *uuid.UUID     `gorm:"type:uuid" json:"entityId,omitempty"`
	Metadata   datatypes.JSON `json:"metadata,omitempty"`
	IPAddress  string         `json:"ipAddress,omitempty"`
	UserAgent  string         `json:"userAgent,omitempty"`
	CreatedAt  time.Time      `json:"createdAt"`
}

func (n *Notification) TableName() string {
	return "notifications"
}

func (a *ActivityLog) TableName() string {
	return "activity_logs"
}
