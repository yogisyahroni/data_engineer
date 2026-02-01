package models

import (
	"time"
)

// DashboardCard represents a visualization or text card on a dashboard
type DashboardCard struct {
	ID                  string    `gorm:"primaryKey;type:varchar(255)" json:"id"`
	DashboardID         string    `gorm:"type:varchar(255);not null;index" json:"dashboardId"`
	QueryID             *string   `gorm:"type:varchar(255)" json:"queryId"`
	Type                string    `gorm:"type:varchar(50);default:'visualization'" json:"type"` // visualization | text
	Title               *string   `gorm:"type:varchar(255)" json:"title"`
	TextContent         *string   `gorm:"type:text" json:"textContent"`
	Position            string    `gorm:"type:jsonb;not null" json:"position"` // {x, y, w, h}
	VisualizationConfig *string   `gorm:"type:jsonb" json:"visualizationConfig"`
	CreatedAt           time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt           time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relationships
	Dashboard *Dashboard  `gorm:"foreignKey:DashboardID" json:"dashboard,omitempty"`
	Query     *SavedQuery `gorm:"foreignKey:QueryID" json:"query,omitempty"`
}

// TableName specifies the table name for DashboardCard
func (DashboardCard) TableName() string {
	return "DashboardCard"
}
