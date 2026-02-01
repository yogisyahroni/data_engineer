package models

import (
	"time"
)

// Dataflow represents a dataflow configuration
type Dataflow struct {
	ID          string  `json:"id" gorm:"primaryKey;type:varchar(30)"`
	Name        string  `json:"name" gorm:"not null"`
	Description *string `json:"description"`
	Schedule    *string `json:"schedule"` // Cron expression
	IsActive    bool    `json:"isActive" gorm:"default:true"`

	UserID string `json:"userId" gorm:"not null;index;column:userId"`

	// Relationships
	Steps []DataflowStep `json:"steps,omitempty" gorm:"foreignKey:DataflowID"`
	Runs  []DataflowRun  `json:"runs,omitempty" gorm:"foreignKey:DataflowID"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (Dataflow) TableName() string {
	return "Dataflow"
}

// DataflowStep represents a step in a dataflow
type DataflowStep struct {
	ID         string `json:"id" gorm:"primaryKey;type:varchar(30)"`
	DataflowID string `json:"dataflowId" gorm:"not null;index;column:dataflowId"`
	Order      int    `json:"order" gorm:"not null"`

	Type   string `json:"type" gorm:"not null"` // QUERY, MATERIALIZE
	Name   string `json:"name" gorm:"not null"`
	Config string `json:"config" gorm:"type:jsonb;not null"`

	// Relationship
	Dataflow Dataflow `json:"dataflow,omitempty" gorm:"foreignKey:DataflowID"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (DataflowStep) TableName() string {
	return "DataflowStep"
}

// DataflowRun represents a dataflow execution record
type DataflowRun struct {
	ID         string `json:"id" gorm:"primaryKey;type:varchar(30)"`
	DataflowID string `json:"dataflowId" gorm:"not null;index;column:dataflowId"`

	Status      string     `json:"status" gorm:"not null"` // RUNNING, COMPLETED, FAILED
	StartedAt   time.Time  `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt"`
	Error       *string    `json:"error"`
	Logs        *string    `json:"logs" gorm:"type:jsonb"`

	// Relationship
	Dataflow Dataflow `json:"dataflow,omitempty" gorm:"foreignKey:DataflowID"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (DataflowRun) TableName() string {
	return "DataflowRun"
}
