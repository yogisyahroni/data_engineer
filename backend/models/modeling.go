package models

import (
	"time"

	"gorm.io/datatypes"
)

// ModelDefinition represents a data model definition
type ModelDefinition struct {
	ID          string             `gorm:"primaryKey" json:"id"`
	Name        string             `gorm:"uniqueIndex:idx_workspace_model;not null" json:"name"`
	Description string             `json:"description"`
	Type        string             `gorm:"not null" json:"type"` // table, view, query
	SourceTable string             `json:"sourceTable,omitempty"`
	SourceQuery string             `json:"sourceQuery,omitempty"`
	WorkspaceID string             `gorm:"uniqueIndex:idx_workspace_model;not null" json:"workspaceId"`
	CreatedBy   string             `gorm:"not null" json:"createdBy"`
	Metadata    datatypes.JSON     `json:"metadata,omitempty"`
	Metrics     []MetricDefinition `gorm:"foreignKey:ModelID" json:"metrics,omitempty"`
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (ModelDefinition) TableName() string {
	return "model_definitions"
}

// MetricDefinition represents a metric definition
type MetricDefinition struct {
	ID              string         `gorm:"primaryKey" json:"id"`
	Name            string         `gorm:"uniqueIndex:idx_workspace_metric;not null" json:"name"`
	Description     string         `json:"description"`
	Formula         string         `gorm:"not null" json:"formula"`
	ModelID         *string        `json:"modelId,omitempty"`
	DataType        string         `gorm:"not null" json:"dataType"` // number, currency, percentage, count, decimal
	Format          string         `json:"format,omitempty"`
	AggregationType string         `json:"aggregationType,omitempty"` // sum, avg, count, min, max, count_distinct
	WorkspaceID     string         `gorm:"uniqueIndex:idx_workspace_metric;not null" json:"workspaceId"`
	CreatedBy       string         `gorm:"not null" json:"createdBy"`
	Metadata        datatypes.JSON `json:"metadata,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (MetricDefinition) TableName() string {
	return "metric_definitions"
}
