package models

import (
	"time"
)

// QualityRule represents a data quality validation rule
type QualityRule struct {
	ID         string `json:"id" gorm:"primaryKey;type:varchar(30)"`
	PipelineID string `json:"pipelineId" gorm:"not null;index;column:pipelineId"`

	Column      string  `json:"column" gorm:"not null"`
	RuleType    string  `json:"ruleType" gorm:"not null"`     // NOT_NULL, UNIQUE, RANGE, REGEX
	Value       *string `json:"value"`                        // validation parameter
	Severity    string  `json:"severity" gorm:"default:WARN"` // WARN, FAIL
	Description *string `json:"description"`

	// Relationship
	Pipeline Pipeline `json:"pipeline,omitempty" gorm:"foreignKey:PipelineID"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (QualityRule) TableName() string {
	return "QualityRule"
}
