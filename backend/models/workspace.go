package models

import (
	"time"
)

// Workspace represents a collaborative workspace
type Workspace struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Description *string   `json:"description"`
	OwnerID     string    `json:"ownerId" gorm:"not null"` // Creator of the workspace
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// WorkspaceMember represents a user's membership in a workspace
type WorkspaceMember struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	WorkspaceID string     `json:"workspaceId" gorm:"not null"`
	UserID      string     `json:"userId" gorm:"not null"`
	Role        string     `json:"role" gorm:"not null"` // 'OWNER', 'ADMIN', 'EDITOR', 'VIEWER'
	InvitedAt   time.Time  `json:"invitedAt"`
	JoinedAt    *time.Time `json:"joinedAt"`
}

// Role constants
const (
	RoleOwner  = "OWNER"
	RoleAdmin  = "ADMIN"
	RoleEditor = "EDITOR"
	RoleViewer = "VIEWER"
)
