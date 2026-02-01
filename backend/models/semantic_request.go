package models

import (
	"time"
)

// SemanticRequest represents an AI semantic operation request (explain, query, formula, chat)
type SemanticRequest struct {
	ID               string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	UserID           string    `json:"userId" gorm:"not null;index;column:userId"`
	WorkspaceID      *string   `json:"workspaceId" gorm:"index;column:workspaceId"`
	ProviderID       string    `json:"providerId" gorm:"not null;index;column:providerId"`
	DataSourceID     *string   `json:"dataSourceId" gorm:"index;column:dataSourceId"`
	ConversationID   *string   `json:"conversationId" gorm:"index;column:conversationId"`
	MessageIndex     int       `json:"messageIndex" gorm:"default:0;column:messageIndex"`   // Position in conversation (0-based)
	ParentRequestID  *string   `json:"parentRequestId" gorm:"index;column:parentRequestId"` // Link to previous message
	Type             string    `json:"type" gorm:"not null;index"`                          // explain, query, formula, chat
	Prompt           string    `json:"prompt" gorm:"type:text;not null"`
	Context          JSONB     `json:"context" gorm:"type:jsonb"`
	Response         string    `json:"response" gorm:"type:text"`
	GeneratedSQL     *string   `json:"generatedSql" gorm:"type:text;column:generatedSql"`
	GeneratedFormula *string   `json:"generatedFormula" gorm:"type:text;column:generatedFormula"`
	IsValid          bool      `json:"isValid" gorm:"default:true;column:isValid"`
	Error            *string   `json:"error" gorm:"type:text"`
	TokensUsed       int       `json:"tokensUsed" gorm:"default:0;column:tokensUsed"`
	Cost             float64   `json:"cost" gorm:"default:0"`
	DurationMs       int       `json:"durationMs" gorm:"default:0;column:durationMs"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// TableName specifies the table name for SemanticRequest
func (SemanticRequest) TableName() string {
	return "semantic_requests"
}

// Semantic request types
const (
	SemanticTypeExplain = "explain"
	SemanticTypeQuery   = "query"
	SemanticTypeFormula = "formula"
	SemanticTypeChat    = "chat"
)
