package models

import (
	"time"
)

// Connection represents a database connection
type Connection struct {
	ID        string                  `gorm:"primaryKey;type:text" json:"id"`
	Name      string                  `gorm:"type:text;not null" json:"name"`
	Type      string                  `gorm:"type:text;not null" json:"type"` // postgres, mysql, bigquery, etc
	Host      *string                 `gorm:"type:text" json:"host"`
	Port      *int                    `gorm:"type:integer" json:"port"`
	Database  string                  `gorm:"type:text;not null" json:"database"`
	Username  *string                 `gorm:"type:text" json:"username"`
	Password  *string                 `gorm:"type:text" json:"password"` // AES-256 Encrypted
	Options   *map[string]interface{} `gorm:"type:jsonb" json:"options"` // Database-specific options (warehouse, role, schema, etc)
	IsActive  bool                    `gorm:"default:true" json:"isActive"`
	UserID    string                  `gorm:"type:text;not null" json:"userId"`
	CreatedAt time.Time               `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time               `gorm:"autoUpdateTime" json:"updatedAt"`
}

// TableName overrides the table name
func (Connection) TableName() string {
	return "connections"
}

// ConnectionDTO for API responses (without password)
type ConnectionDTO struct {
	ID        string                  `json:"id"`
	Name      string                  `json:"name"`
	Type      string                  `json:"type"`
	Host      *string                 `json:"host"`
	Port      *int                    `json:"port"`
	Database  string                  `json:"database"`
	Username  *string                 `json:"username"`
	Options   *map[string]interface{} `json:"options"`
	IsActive  bool                    `json:"isActive"`
	UserID    string                  `json:"userId"`
	CreatedAt time.Time               `json:"createdAt"`
	UpdatedAt time.Time               `json:"updatedAt"`
}

// ToDTO converts Connection to DTO (strips password)
func (c *Connection) ToDTO() ConnectionDTO {
	return ConnectionDTO{
		ID:        c.ID,
		Name:      c.Name,
		Type:      c.Type,
		Host:      c.Host,
		Port:      c.Port,
		Database:  c.Database,
		Username:  c.Username,
		Options:   c.Options,
		IsActive:  c.IsActive,
		UserID:    c.UserID,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}
