package models

import (
	"time"
)

// SemanticModel represents a business-friendly view of a data source
type SemanticModel struct {
	ID           string              `gorm:"primaryKey" json:"id"`
	Name         string              `gorm:"uniqueIndex:idx_workspace_model_name;not null" json:"name"`
	Description  string              `json:"description"`
	DataSourceID string              `gorm:"not null" json:"dataSourceId"`
	Table        string              `gorm:"column:table_name;not null" json:"tableName"`
	WorkspaceID  string              `gorm:"uniqueIndex:idx_workspace_model_name;not null" json:"workspaceId"`
	CreatedBy    string              `gorm:"not null" json:"createdBy"`
	Dimensions   []SemanticDimension `gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE" json:"dimensions,omitempty"`
	Metrics      []SemanticMetric    `gorm:"foreignKey:ModelID;constraint:OnDelete:CASCADE" json:"metrics,omitempty"`
	CreatedAt    time.Time           `json:"createdAt"`
	UpdatedAt    time.Time           `json:"updatedAt"`
}

// SemanticDimension represents a column that can be used for grouping/filtering
type SemanticDimension struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	ModelID     string    `gorm:"uniqueIndex:idx_model_dimension_name;not null" json:"modelId"`
	Name        string    `gorm:"uniqueIndex:idx_model_dimension_name;not null" json:"name"`
	ColumnName  string    `gorm:"not null" json:"columnName"`
	DataType    string    `gorm:"not null" json:"dataType"` // string, number, date, boolean
	Description string    `json:"description"`
	IsHidden    bool      `gorm:"default:false" json:"isHidden"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// SemanticMetric represents a calculated field (aggregation or formula)
type SemanticMetric struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	ModelID     string    `gorm:"uniqueIndex:idx_model_metric_name;not null" json:"modelId"`
	Name        string    `gorm:"uniqueIndex:idx_model_metric_name;not null" json:"name"`
	Formula     string    `gorm:"not null" json:"formula"` // e.g., "SUM(revenue)", "COUNT(*)", "AVG(price)"
	Description string    `json:"description"`
	Format      string    `json:"format"` // currency, percentage, number, etc.
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// SemanticRelationship defines joins between semantic models
type SemanticRelationship struct {
	ID               string    `gorm:"primaryKey" json:"id"`
	FromModelID      string    `gorm:"not null" json:"fromModelId"`
	ToModelID        string    `gorm:"not null" json:"toModelId"`
	FromColumn       string    `gorm:"not null" json:"fromColumn"`
	ToColumn         string    `gorm:"not null" json:"toColumn"`
	RelationshipType string    `gorm:"not null" json:"relationshipType"` // one_to_one, one_to_many, many_to_one, many_to_many
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// TableName overrides
func (SemanticModel) TableName() string {
	return "semantic_models"
}

func (SemanticDimension) TableName() string {
	return "semantic_dimensions"
}

func (SemanticMetric) TableName() string {
	return "semantic_metrics"
}

func (SemanticRelationship) TableName() string {
	return "semantic_relationships"
}
