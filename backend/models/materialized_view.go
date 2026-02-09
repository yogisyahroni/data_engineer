package models

import "time"

// MaterializedView represents a materialized view configuration
type MaterializedView struct {
	ID           string                 `json:"id" gorm:"primaryKey"`
	ConnectionID string                 `json:"connectionId" gorm:"not null;index"`
	UserID       string                 `json:"userId" gorm:"not null;index"`
	Name         string                 `json:"name" gorm:"not null"`
	SourceQuery  string                 `json:"sourceQuery" gorm:"type:text;not null"`
	TargetTable  string                 `json:"targetTable" gorm:"not null;uniqueIndex"`
	RefreshMode  string                 `json:"refreshMode" gorm:"not null;default:'full'"` // "full" or "incremental"
	Schedule     string                 `json:"schedule" gorm:"default:''"`                 // cron expression, empty = manual only
	Metadata     map[string]interface{} `json:"metadata" gorm:"type:jsonb"`                 // Stores primary_keys, timestamp_column, etc.
	LastRefresh  *time.Time             `json:"lastRefresh" gorm:"index"`
	NextRefresh  *time.Time             `json:"nextRefresh"`
	Status       string                 `json:"status" gorm:"not null;default:'idle'"` // "idle", "refreshing", "error"
	ErrorMessage string                 `json:"errorMessage" gorm:"type:text"`
	RowCount     int64                  `json:"rowCount" gorm:"default:0"`
	RefreshCount int                    `json:"refreshCount" gorm:"default:0"`
	CreatedAt    time.Time              `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt    time.Time              `json:"updatedAt" gorm:"autoUpdateTime"`
}

// TableName overrides the table name
func (MaterializedView) TableName() string {
	return "materialized_views"
}

// RefreshHistory tracks materialized view refresh history
type RefreshHistory struct {
	ID               string     `json:"id" gorm:"primaryKey"`
	MaterializedView string     `json:"materializedViewId" gorm:"not null;index"`
	RefreshMode      string     `json:"refreshMode" gorm:"not null"`
	StartedAt        time.Time  `json:"startedAt" gorm:"not null;index"`
	CompletedAt      *time.Time `json:"completedAt"`
	Status           string     `json:"status" gorm:"not null"` // "running", "success", "failed"
	RowsAffected     int64      `json:"rowsAffected" gorm:"default:0"`
	ErrorMessage     string     `json:"errorMessage" gorm:"type:text"`
	Duration         int64      `json:"duration"` // milliseconds
}

// TableName overrides the table name
func (RefreshHistory) TableName() string {
	return "refresh_history"
}
