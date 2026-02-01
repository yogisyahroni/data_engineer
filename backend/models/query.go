package models

import (
	"time"
)

// SavedQuery represents a saved SQL query
type SavedQuery struct {
	ID                  string    `gorm:"primaryKey;type:text" json:"id"`
	Name                string    `gorm:"type:text;not null" json:"name"`
	Description         *string   `gorm:"type:text" json:"description"`
	SQL                 string    `gorm:"type:text;not null" json:"sql"`
	AIPrompt            *string   `gorm:"type:text" json:"aiPrompt"`
	ConnectionID        string    `gorm:"type:text;not null" json:"connectionId"`
	CollectionID        string    `gorm:"type:text;not null" json:"collectionId"`
	UserID              string    `gorm:"type:text;not null" json:"userId"`
	VisualizationConfig []byte    `gorm:"type:jsonb" json:"visualizationConfig"` // JSON
	Tags                []string  `gorm:"type:text[]" json:"tags"`
	Pinned              bool      `gorm:"default:false" json:"pinned"`
	BusinessMetricID    *string   `gorm:"type:text" json:"businessMetricId"`
	CreatedAt           time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt           time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relationships (optional for queries)
	Connection *Connection `gorm:"foreignKey:ConnectionID" json:"connection,omitempty"`
}

// TableName overrides the table name
func (SavedQuery) TableName() string {
	return "SavedQuery"
}
