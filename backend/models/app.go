package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type App struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description *string   `json:"description"`
	UserID      string    `json:"userId" gorm:"not null"`
	WorkspaceID *string   `json:"workspaceId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Canvas struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	AppID     string    `json:"appId" gorm:"not null"`
	Name      string    `json:"name" gorm:"not null"`
	Config    JSONB     `json:"config" gorm:"type:jsonb"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Widget struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	CanvasID  string    `json:"canvasId" gorm:"not null"`
	Type      string    `json:"type" gorm:"not null"` // 'chart', 'table', 'metric'
	Config    JSONB     `json:"config" gorm:"type:jsonb"`
	Position  JSONB     `json:"position" gorm:"type:jsonb"` // {x, y, w, h}
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// JSONB is a custom type for JSONB columns
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}
