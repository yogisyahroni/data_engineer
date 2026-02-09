package models

import (
	"time"

	"gorm.io/datatypes"
)

// FrontendLog represents a log entry from the frontend application
type FrontendLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    *uint          `gorm:"index" json:"user_id,omitempty"`               // Optional: user who generated the log
	Level     string         `gorm:"type:varchar(10);not null;index" json:"level"` // debug, info, warn, error
	Operation string         `gorm:"type:varchar(100);not null;index" json:"operation"`
	Message   string         `gorm:"type:text;not null" json:"message"`
	Metadata  datatypes.JSON `gorm:"type:jsonb" json:"metadata,omitempty"`
	UserAgent string         `gorm:"type:text" json:"user_agent,omitempty"`
	URL       string         `gorm:"type:text" json:"url,omitempty"`
	IPAddress string         `gorm:"type:varchar(45)" json:"ip_address,omitempty"` // IPv4/IPv6
	CreatedAt time.Time      `gorm:"index" json:"created_at"`
}

// TableName specifies the table name for FrontendLog
func (FrontendLog) TableName() string {
	return "frontend_logs"
}
