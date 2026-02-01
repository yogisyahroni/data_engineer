package models

import (
	"time"
)

// Pipeline represents a data pipeline configuration
type Pipeline struct {
	ID          string  `json:"id" gorm:"primaryKey;type:varchar(30)"`
	Name        string  `json:"name" gorm:"not null"`
	Description *string `json:"description"`
	WorkspaceID string  `json:"workspaceId" gorm:"not null;index;column:workspaceId"`

	// Source Configuration
	SourceType   string `json:"sourceType" gorm:"not null"` // POSTGRES, REST_API, CSV
	SourceConfig string `json:"sourceConfig" gorm:"type:jsonb;not null"`

	// ELT vs ETL
	Mode                string  `json:"mode" gorm:"default:ELT"` // ETL | ELT
	TransformationSteps *string `json:"transformationSteps" gorm:"type:jsonb"`

	// Destination Configuration
	DestinationType   string  `json:"destinationType" gorm:"default:INTERNAL_RAW"`
	DestinationConfig *string `json:"destinationConfig" gorm:"type:jsonb"`

	// Schedule
	ScheduleCron *string `json:"scheduleCron"`
	IsActive     bool    `json:"isActive" gorm:"default:true;index"`

	// Execution Tracking
	LastRunAt  *time.Time `json:"lastRunAt"`
	LastStatus *string    `json:"lastStatus"` // SUCCESS, FAILED

	// Relationships
	Executions   []JobExecution `json:"executions,omitempty" gorm:"foreignKey:PipelineID"`
	QualityRules []QualityRule  `json:"qualityRules,omitempty" gorm:"foreignKey:PipelineID"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Pipeline) TableName() string {
	return "Pipeline"
}
