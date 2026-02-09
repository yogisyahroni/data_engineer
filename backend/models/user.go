package models

import (
	"time"
)

// User represents a system user
type User struct {
	ID                       string     `gorm:"primaryKey;type:text" json:"id"`
	Email                    string     `gorm:"uniqueIndex;not null" json:"email"`
	Username                 string     `gorm:"uniqueIndex;type:text" json:"username"`
	Name                     string     `gorm:"type:text" json:"name"`
	Password                 string     `gorm:"type:text" json:"-"`                   // Never return password, nullable for OAuth
	Role                     string     `gorm:"type:text;default:'user'" json:"role"` // user, admin
	EmailVerified            bool       `gorm:"default:false" json:"emailVerified"`
	EmailVerifiedAt          *time.Time `gorm:"type:timestamp" json:"emailVerifiedAt,omitempty"`
	EmailVerificationToken   string     `gorm:"type:text;index" json:"-"` // Never return token
	EmailVerificationExpires *time.Time `gorm:"type:timestamp" json:"-"`  // Never return expiration
	PasswordResetToken       string     `gorm:"type:text;index" json:"-"` // Never return token
	PasswordResetExpires     *time.Time `gorm:"type:timestamp" json:"-"`  // Never return expiration
	// OAuth fields
	Provider   string    `gorm:"type:text;index" json:"provider,omitempty"`   // e.g., "google", "github"
	ProviderID string    `gorm:"type:text;index" json:"providerId,omitempty"` // OAuth provider user ID
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

// TableName overrides the table name
func (User) TableName() string {
	return "users"
}
