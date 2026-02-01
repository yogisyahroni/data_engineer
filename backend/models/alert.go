package models

import (
	"time"
)

type Alert struct {
	ID             string  `gorm:"primaryKey;type:text"`
	Name           string  `gorm:"type:text;not null"`
	Description    *string `gorm:"type:text"`
	QueryId        string  `gorm:"type:text;not null"`
	Column         string  `gorm:"type:text;not null"`
	Operator       string  `gorm:"type:text;not null"`
	Threshold      float64 `gorm:"type:float;not null"`
	Schedule       string  `gorm:"type:text;not null"`
	IsActive       bool    `gorm:"default:true"`
	Email          string  `gorm:"type:text;not null"`
	WebhookUrl     *string `gorm:"type:text"`
	WebhookHeaders []byte  `gorm:"type:jsonb"` // Using []byte for raw JSON
	LastRunAt      *time.Time
	LastStatus     *string
	UserId         string    `gorm:"type:text;not null"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
}

// TableName overrides the table name used by User to `Alert`
func (Alert) TableName() string {
	return "Alert" // Prisma default naming (Capitalized if not mapped)
}
