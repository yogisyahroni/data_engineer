package models

import (
	"time"
)

// JobExecution represents a pipeline execution record
type JobExecution struct {
	ID         string `json:"id" gorm:"primaryKey;type:varchar(30)"`
	PipelineID string `json:"pipelineId" gorm:"not null;index;column:pipelineId"`

	Status      string     `json:"status" gorm:"not null"` // PENDING, PROCESSING, COMPLETED, FAILED
	StartedAt   time.Time  `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt"`
	DurationMs  *int       `json:"durationMs"`

	RowsProcessed int     `json:"rowsProcessed" gorm:"default:0"`
	Error         *string `json:"error"`
	Logs          *string `json:"logs" gorm:"type:jsonb"` // Array of log strings

	// Relationship
	Pipeline Pipeline `json:"pipeline,omitempty" gorm:"foreignKey:PipelineID"`
}

// TableName specifies the table name for GORM
func (JobExecution) TableName() string {
	return "JobExecution"
}
