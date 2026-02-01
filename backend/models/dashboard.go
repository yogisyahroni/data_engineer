package models

import (
	"time"
)

// Dashboard represents a user's analytics dashboard
type Dashboard struct {
	ID           string    `gorm:"primaryKey;type:varchar(255)" json:"id"`
	Name         string    `gorm:"type:varchar(255);not null" json:"name"`
	Description  *string   `gorm:"type:text" json:"description"`
	CollectionID string    `gorm:"type:varchar(255);not null;index" json:"collectionId"`
	UserID       string    `gorm:"type:varchar(255);not null;index" json:"userId"`
	Filters      *string   `gorm:"type:jsonb" json:"filters"` // JSONB for filter configuration
	IsPublic     bool      `gorm:"default:false" json:"isPublic"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relationships (loaded on demand)
	Cards []DashboardCard `gorm:"foreignKey:DashboardID" json:"cards,omitempty"`
}

// TableName specifies the table name for Dashboard
func (Dashboard) TableName() string {
	return "Dashboard"
}
