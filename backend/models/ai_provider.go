package models

import (
	"time"
)

// AIProvider represents an AI provider configuration
type AIProvider struct {
	ID              string  `json:"id" gorm:"primaryKey;type:varchar(36)"`
	UserID          string  `json:"userId" gorm:"not null;index;column:userId"`
	WorkspaceID     *string `json:"workspaceId" gorm:"index;column:workspaceId"`
	Name            string  `json:"name" gorm:"not null"`
	ProviderType    string  `json:"providerType" gorm:"not null;column:providerType"` // openai, gemini, anthropic, cohere, custom
	BaseURL         *string `json:"baseUrl" gorm:"column:baseUrl"`                    // For custom providers
	APIKeyEncrypted string  `json:"-" gorm:"not null;column:apiKeyEncrypted"`         // Never in JSON response
	APIKeyMasked    string  `json:"apiKeyMasked" gorm:"-"`                            // Computed field for display
	Model           string  `json:"model" gorm:"not null"`                            // gpt-4, gemini-pro, claude-3-opus, etc
	IsActive        bool    `json:"isActive" gorm:"default:true;column:isActive"`
	IsDefault       bool    `json:"isDefault" gorm:"default:false;column:isDefault"`
	Config          JSONB   `json:"config" gorm:"type:jsonb"` // Provider-specific config

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (AIProvider) TableName() string {
	return "AIProvider"
}

// Provider type constants
const (
	ProviderTypeOpenAI    = "openai"
	ProviderTypeGemini    = "gemini"
	ProviderTypeAnthropic = "anthropic"
	ProviderTypeCohere    = "cohere"
	ProviderTypeCustom    = "custom"
)

// AIRequest represents an AI request for audit trail
type AIRequest struct {
	ID         string  `json:"id" gorm:"primaryKey;type:varchar(36)"`
	ProviderID string  `json:"providerId" gorm:"not null;index;column:providerId"`
	UserID     string  `json:"userId" gorm:"not null;index;column:userId"`
	Prompt     string  `json:"prompt" gorm:"type:text"`
	Context    JSONB   `json:"context" gorm:"type:jsonb"`
	Response   *string `json:"response" gorm:"type:text"`
	TokensUsed int     `json:"tokensUsed" gorm:"column:tokensUsed"`
	DurationMs int     `json:"durationMs" gorm:"column:durationMs"`
	Cost       float64 `json:"cost"`
	Status     string  `json:"status" gorm:"not null"` // success, error, rate_limited
	Error      *string `json:"error" gorm:"type:text"`

	CreatedAt time.Time `json:"createdAt"`
}

// TableName specifies the table name for GORM
func (AIRequest) TableName() string {
	return "AIRequest"
}

// Request status constants
const (
	RequestStatusSuccess     = "success"
	RequestStatusError       = "error"
	RequestStatusRateLimited = "rate_limited"
)
