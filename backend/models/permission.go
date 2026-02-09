package models

import (
	"time"
)

// Permission represents a granular permission in the system
type Permission struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"` // e.g., 'query:create'
	Resource    string    `gorm:"type:varchar(50);not null;index" json:"resource"`    // e.g., 'query', 'dashboard'
	Action      string    `gorm:"type:varchar(50);not null;index" json:"action"`      // e.g., 'create', 'read', 'update', 'delete'
	Description string    `gorm:"type:text" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// TableName specifies the table name for Permission
func (Permission) TableName() string {
	return "permissions"
}

// Role represents a user role
type Role struct {
	ID           uint         `gorm:"primaryKey" json:"id"`
	Name         string       `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Description  string       `gorm:"type:text" json:"description"`
	IsSystemRole bool         `gorm:"default:false" json:"is_system_role"` // TRUE for built-in roles
	Permissions  []Permission `gorm:"many2many:role_permissions;" json:"permissions"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

// TableName specifies the table name for Role
func (Role) TableName() string {
	return "roles"
}

// RolePermission represents the many-to-many relationship between roles and permissions
type RolePermission struct {
	RoleID       uint      `gorm:"primaryKey" json:"role_id"`
	PermissionID uint      `gorm:"primaryKey" json:"permission_id"`
	GrantedAt    time.Time `gorm:"autoCreateTime" json:"granted_at"`
}

// TableName specifies the table name for RolePermission
func (RolePermission) TableName() string {
	return "role_permissions"
}

// UserRole represents the many-to-many relationship between users and roles
type UserRole struct {
	UserID     uint      `gorm:"primaryKey" json:"user_id"`
	RoleID     uint      `gorm:"primaryKey" json:"role_id"`
	AssignedAt time.Time `gorm:"autoCreateTime" json:"assigned_at"`
	AssignedBy *uint     `json:"assigned_by,omitempty"` // Who assigned this role
	Role       *Role     `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

// TableName specifies the table name for UserRole
func (UserRole) TableName() string {
	return "user_roles"
}
