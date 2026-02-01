package models

import (
	"time"
)

// ReportSchedule represents a scheduled dashboard report
type ReportSchedule struct {
	ID          string    `gorm:"primaryKey;type:varchar(255)" json:"id"`
	DashboardID string    `gorm:"type:varchar(255);not null;index" json:"dashboardId"`
	Frequency   string    `gorm:"type:varchar(50);not null" json:"frequency"` // DAILY, WEEKLY, MONTHLY
	Email       string    `gorm:"type:varchar(255);not null" json:"email"`
	Format      string    `gorm:"type:varchar(10);not null" json:"format"` // PDF, PNG
	IsActive    bool      `gorm:"default:true" json:"isActive"`
	NextRunAt   time.Time `gorm:"not null" json:"nextRunAt"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updatedAt"`

	// Relationships
	Dashboard *Dashboard `gorm:"foreignKey:DashboardID" json:"dashboard,omitempty"`
}

// TableName specifies the table name for ReportSchedule
func (ReportSchedule) TableName() string {
	return "ReportSchedule"
}

// CalculateNextRun calculates the next run time based on frequency
func CalculateNextRun(frequency string) time.Time {
	now := time.Now()
	next := now

	switch frequency {
	case "DAILY":
		// Tomorrow at 9 AM
		next = now.AddDate(0, 0, 1)
		next = time.Date(next.Year(), next.Month(), next.Day(), 9, 0, 0, 0, next.Location())
	case "WEEKLY":
		// Next Monday at 9 AM
		daysUntilMonday := (8 - int(now.Weekday())) % 7
		if daysUntilMonday == 0 {
			daysUntilMonday = 7
		}
		next = now.AddDate(0, 0, daysUntilMonday)
		next = time.Date(next.Year(), next.Month(), next.Day(), 9, 0, 0, 0, next.Location())
	case "MONTHLY":
		// 1st of next month at 9 AM
		next = now.AddDate(0, 1, 0)
		next = time.Date(next.Year(), next.Month(), 1, 9, 0, 0, 0, next.Location())
	}

	return next
}
