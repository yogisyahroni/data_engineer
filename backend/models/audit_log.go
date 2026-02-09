package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// AuditAction represents the type of action performed
type AuditAction string

const (
	ActionCreate  AuditAction = "CREATE"
	ActionRead    AuditAction = "READ"
	ActionUpdate  AuditAction = "UPDATE"
	ActionDelete  AuditAction = "DELETE"
	ActionExecute AuditAction = "EXECUTE"
	ActionLogin   AuditAction = "LOGIN"
	ActionLogout  AuditAction = "LOGOUT"
	ActionExport  AuditAction = "EXPORT"
	ActionShare   AuditAction = "SHARE"
)

// JSONMap is a custom type for JSONB columns
type JSONMap map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for database retrieval
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, j)
}

// AuditLog represents a single audit log entry
type AuditLog struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	UserID       *uint     `gorm:"index" json:"user_id"`  // Nullable if system action
	Username     string    `gorm:"index" json:"username"` // Denormalized
	Action       string    `gorm:"type:varchar(50);not null;index" json:"action"`
	ResourceType string    `gorm:"type:varchar(100);not null;index" json:"resource_type"`
	ResourceID   *uint     `json:"resource_id"`                            // Nullable for bulk operations
	ResourceName string    `gorm:"type:varchar(255)" json:"resource_name"` // Denormalized
	OldValue     JSONMap   `gorm:"type:jsonb" json:"old_value,omitempty"`
	NewValue     JSONMap   `gorm:"type:jsonb" json:"new_value,omitempty"`
	IPAddress    string    `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent    string    `gorm:"type:text" json:"user_agent"`
	Metadata     JSONMap   `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt    time.Time `gorm:"index" json:"created_at"`
}

// TableName specifies the table name for GORM
func (AuditLog) TableName() string {
	return "audit_logs"
}

// AuditLogFilter represents filter criteria for querying audit logs
type AuditLogFilter struct {
	UserID       *uint      `json:"user_id"`
	Username     string     `json:"username"`
	Action       string     `json:"action"`
	ResourceType string     `json:"resource_type"`
	ResourceID   *uint      `json:"resource_id"`
	StartDate    *time.Time `json:"start_date"`
	EndDate      *time.Time `json:"end_date"`
	IPAddress    string     `json:"ip_address"`
	Limit        int        `json:"limit"`
	Offset       int        `json:"offset"`
}

// AuditLogSummary represents aggregated audit statistics
type AuditLogSummary struct {
	TotalLogs       int64            `json:"total_logs"`
	LogsByAction    map[string]int64 `json:"logs_by_action"`
	LogsByResource  map[string]int64 `json:"logs_by_resource"`
	LogsByUser      map[string]int64 `json:"logs_by_user"`
	MostActiveUsers []UserActivity   `json:"most_active_users"`
}

// UserActivity represents user activity statistics
type UserActivity struct {
	UserID     uint      `json:"user_id"`
	Username   string    `json:"username"`
	LogCount   int64     `json:"log_count"`
	LastAction time.Time `json:"last_action"`
}

// AuditLogEntry is a helper struct for creating audit logs
type AuditLogEntry struct {
	UserID       *uint
	Username     string
	Action       AuditAction
	ResourceType string
	ResourceID   *uint
	ResourceName string
	OldValue     interface{}
	NewValue     interface{}
	IPAddress    string
	UserAgent    string
	Metadata     map[string]interface{}
}

// ToAuditLog converts AuditLogEntry to AuditLog model
func (e *AuditLogEntry) ToAuditLog() *AuditLog {
	log := &AuditLog{
		UserID:       e.UserID,
		Username:     e.Username,
		Action:       string(e.Action),
		ResourceType: e.ResourceType,
		ResourceID:   e.ResourceID,
		ResourceName: e.ResourceName,
		IPAddress:    e.IPAddress,
		UserAgent:    e.UserAgent,
		CreatedAt:    time.Now(),
	}

	// Convert OldValue to JSONMap
	if e.OldValue != nil {
		if oldMap, ok := e.OldValue.(map[string]interface{}); ok {
			log.OldValue = JSONMap(oldMap)
		} else {
			// Convert struct to map via JSON marshaling
			if bytes, err := json.Marshal(e.OldValue); err == nil {
				var m map[string]interface{}
				if err := json.Unmarshal(bytes, &m); err == nil {
					log.OldValue = JSONMap(m)
				}
			}
		}
	}

	// Convert NewValue to JSONMap
	if e.NewValue != nil {
		if newMap, ok := e.NewValue.(map[string]interface{}); ok {
			log.NewValue = JSONMap(newMap)
		} else {
			// Convert struct to map via JSON marshaling
			if bytes, err := json.Marshal(e.NewValue); err == nil {
				var m map[string]interface{}
				if err := json.Unmarshal(bytes, &m); err == nil {
					log.NewValue = JSONMap(m)
				}
			}
		}
	}

	// Convert Metadata to JSONMap
	if e.Metadata != nil {
		log.Metadata = JSONMap(e.Metadata)
	}

	return log
}
