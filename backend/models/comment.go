package models

import "time"

type Comment struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	EntityType string    `json:"entityType" gorm:"not null"` // 'pipeline', 'dataflow', 'collection'
	EntityID   string    `json:"entityId" gorm:"not null"`
	UserID     string    `json:"userId" gorm:"not null"`
	Content    string    `json:"content" gorm:"type:text;not null"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
