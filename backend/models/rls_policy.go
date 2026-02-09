package models

import (
	"time"
)

// RLSPolicy represents a Row-Level Security policy
type RLSPolicy struct {
	ID           string    `gorm:"primaryKey;type:text" json:"id"`
	Name         string    `gorm:"type:text;not null" json:"name"`
	Description  string    `gorm:"type:text" json:"description"`
	ConnectionID string    `gorm:"type:text;not null;column:connection_id" json:"connectionId"` // Which database connection
	Table        string    `gorm:"type:text;not null;column:table_name" json:"tableName"`       // Target table (supports wildcards like "orders_*")
	Condition    string    `gorm:"type:text;not null" json:"condition"`                         // SQL WHERE clause template (e.g., "user_id = {{current_user.id}}")
	RoleIDs      *[]string `gorm:"type:jsonb" json:"roleIds"`                                   // Which roles this applies to (null = all users)
	Enabled      bool      `gorm:"default:true" json:"enabled"`
	Priority     int       `gorm:"default:0" json:"priority"`           // Higher priority = applied first (for conflict resolution)
	Mode         string    `gorm:"type:text;default:'AND'" json:"mode"` // 'AND' (restrictive) or 'OR' (permissive) when multiple policies apply
	UserID       string    `gorm:"type:text;not null" json:"userId"`    // Creator/owner
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

// TableName overrides the table name
func (RLSPolicy) TableName() string {
	return "rls_policies"
}

// RLSPolicyDTO for API responses
type RLSPolicyDTO struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	ConnectionID string    `json:"connectionId"`
	TableName    string    `json:"tableName"`
	Condition    string    `json:"condition"`
	RoleIDs      *[]string `json:"roleIds"`
	Enabled      bool      `json:"enabled"`
	Priority     int       `json:"priority"`
	Mode         string    `json:"mode"`
	UserID       string    `json:"userId"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// ToDTO converts RLSPolicy to DTO
func (p *RLSPolicy) ToDTO() RLSPolicyDTO {
	return RLSPolicyDTO{
		ID:           p.ID,
		Name:         p.Name,
		Description:  p.Description,
		ConnectionID: p.ConnectionID,
		TableName:    p.Table, // Map Table field to TableName in DTO
		Condition:    p.Condition,
		RoleIDs:      p.RoleIDs,
		Enabled:      p.Enabled,
		Priority:     p.Priority,
		Mode:         p.Mode,
		UserID:       p.UserID,
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
	}
}

// UserContext provides context about the current user for RLS evaluation
type UserContext struct {
	UserID     string                 `json:"userId"`
	Email      string                 `json:"email"`
	Roles      []string               `json:"roles"`
	TeamIDs    []string               `json:"teamIds"`
	Attributes map[string]interface{} `json:"attributes"` // Custom attributes (region, department, etc.)
}
