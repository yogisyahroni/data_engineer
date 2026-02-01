package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// SchedulerJob represents a scheduled background job
type SchedulerJob struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string         `gorm:"unique;not null" json:"name"`
	Schedule  string         `gorm:"not null" json:"schedule"` // Cron expression
	Status    string         `gorm:"not null;default:'active'" json:"status"` // active, paused, error
	LastRun   *time.Time     `json:"lastRun,omitempty"`
	NextRun   *time.Time     `json:"nextRun,omitempty"`
	LastError string         `json:"lastError,omitempty"`
	Config    datatypes.JSON `json:"config,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

func (j *SchedulerJob) TableName() string {
	return "scheduler_jobs"
}
