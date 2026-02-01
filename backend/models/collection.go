package models

import "time"

type Collection struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description *string   `json:"description"`
	UserID      string    `json:"userId" gorm:"not null"`
	WorkspaceID *string   `json:"workspaceId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	// Relations
	Items []CollectionItem `json:"items,omitempty" gorm:"foreignKey:CollectionID"`
}

type CollectionItem struct {
	ID           string    `json:"id" gorm:"primaryKey"`
	CollectionID string    `json:"collectionId" gorm:"not null"`
	ItemType     string    `json:"itemType" gorm:"not null"` // 'pipeline' or 'dataflow'
	ItemID       string    `json:"itemId" gorm:"not null"`
	CreatedAt    time.Time `json:"createdAt"`
}
