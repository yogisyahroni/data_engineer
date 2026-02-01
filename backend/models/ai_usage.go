package models

import (
	"time"

	"github.com/google/uuid"
)

// RateLimitConfig represents a UI-configurable rate limit
type RateLimitConfig struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name              string    `gorm:"size:100;not null;uniqueIndex" json:"name"`
	LimitType         string    `gorm:"size:20;not null" json:"limitType"` // 'provider', 'user', 'global'
	Target            *string   `gorm:"size:50" json:"target"`             // Provider name for 'provider' type
	RequestsPerMinute int       `gorm:"not null;default:60" json:"requestsPerMinute"`
	RequestsPerHour   *int      `json:"requestsPerHour"`
	RequestsPerDay    *int      `json:"requestsPerDay"`
	Enabled           bool      `gorm:"not null;default:true" json:"enabled"`
	Description       *string   `gorm:"type:text" json:"description"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updatedAt"`
}

// TableName specifies the table name
func (RateLimitConfig) TableName() string {
	return "rate_limit_configs"
}

// AIUsageRequest represents an AI request audit log for usage tracking
type AIUsageRequest struct {
	ID               uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID           uuid.UUID              `gorm:"type:uuid;not null" json:"userId"`
	WorkspaceID      *uuid.UUID             `gorm:"type:uuid" json:"workspaceId"`
	Provider         string                 `gorm:"size:50;not null" json:"provider"`
	Model            string                 `gorm:"size:100;not null" json:"model"`
	RequestType      string                 `gorm:"size:50;not null" json:"requestType"` // 'chat', 'query', 'formula', 'explain'
	Prompt           *string                `gorm:"type:text" json:"prompt"`
	Response         *string                `gorm:"type:text" json:"response"`
	PromptTokens     int                    `gorm:"default:0" json:"promptTokens"`
	CompletionTokens int                    `gorm:"default:0" json:"completionTokens"`
	TotalTokens      int                    `gorm:"default:0" json:"totalTokens"`
	EstimatedCost    float64                `gorm:"type:decimal(10,6);default:0" json:"estimatedCost"`
	ActualCost       *float64               `gorm:"type:decimal(10,6)" json:"actualCost"`
	DurationMs       *int                   `json:"durationMs"`
	Status           string                 `gorm:"size:20;default:'success'" json:"status"` // 'success', 'error', 'rate_limited', 'budget_exceeded'
	ErrorMessage     *string                `gorm:"type:text" json:"errorMessage"`
	Metadata         map[string]interface{} `gorm:"type:jsonb" json:"metadata"`
	CreatedAt        time.Time              `gorm:"autoCreateTime" json:"createdAt"`
}

// TableName specifies the table name
func (AIUsageRequest) TableName() string {
	return "ai_requests"
}

// AIBudget represents a budget limit for AI usage
type AIBudget struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID          *uuid.UUID `gorm:"type:uuid" json:"userId"`
	WorkspaceID     *uuid.UUID `gorm:"type:uuid" json:"workspaceId"`
	Name            string     `gorm:"size:100;not null" json:"name"`
	BudgetType      string     `gorm:"size:20;not null" json:"budgetType"` // 'user', 'workspace'
	Period          string     `gorm:"size:20;not null" json:"period"`     // 'hourly', 'daily', 'monthly', 'total'
	MaxTokens       *int       `json:"maxTokens"`
	MaxCost         *float64   `gorm:"type:decimal(10,2)" json:"maxCost"`
	MaxRequests     *int       `json:"maxRequests"`
	CurrentTokens   int        `gorm:"default:0" json:"currentTokens"`
	CurrentCost     float64    `gorm:"type:decimal(10,6);default:0" json:"currentCost"`
	CurrentRequests int        `gorm:"default:0" json:"currentRequests"`
	ResetAt         *time.Time `json:"resetAt"`
	AlertThreshold  float64    `gorm:"type:decimal(5,2);default:80.00" json:"alertThreshold"` // Alert at 80%
	AlertSent       bool       `gorm:"not null;default:false" json:"alertSent"`
	Enabled         bool       `gorm:"not null;default:true" json:"enabled"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt       time.Time  `gorm:"autoUpdateTime" json:"updatedAt"`
}

// TableName specifies the table name
func (AIBudget) TableName() string {
	return "ai_budgets"
}

// BudgetAlert represents a budget alert notification
type BudgetAlert struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	BudgetID       uuid.UUID `gorm:"type:uuid;not null" json:"budgetId"`
	UserID         uuid.UUID `gorm:"type:uuid;not null" json:"userId"`
	AlertType      string    `gorm:"size:20;not null" json:"alertType"` // 'threshold', 'exceeded'
	PercentageUsed float64   `gorm:"type:decimal(5,2);not null" json:"percentageUsed"`
	Message        string    `gorm:"type:text;not null" json:"message"`
	SentAt         time.Time `gorm:"autoCreateTime" json:"sentAt"`
	Acknowledged   bool      `gorm:"not null;default:false" json:"acknowledged"`
}

// TableName specifies the table name
func (BudgetAlert) TableName() string {
	return "budget_alerts"
}

// RateLimitViolation represents a rate limit violation log
type RateLimitViolation struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID       uuid.UUID `gorm:"type:uuid;not null" json:"userId"`
	ConfigID     uuid.UUID `gorm:"type:uuid;not null" json:"configId"`
	Provider     *string   `gorm:"size:50" json:"provider"`
	Endpoint     *string   `gorm:"size:200" json:"endpoint"`
	RequestsMade int       `gorm:"not null" json:"requestsMade"`
	LimitValue   int       `gorm:"not null" json:"limitValue"`
	WindowType   string    `gorm:"size:20;not null" json:"windowType"` // 'minute', 'hour', 'day'
	ViolatedAt   time.Time `gorm:"autoCreateTime" json:"violatedAt"`
}

// TableName specifies the table name
func (RateLimitViolation) TableName() string {
	return "rate_limit_violations"
}

// UsageStats represents aggregated usage statistics
type UsageStats struct {
	TotalRequests int                      `json:"totalRequests"`
	TotalTokens   int                      `json:"totalTokens"`
	TotalCost     float64                  `json:"totalCost"`
	ByProvider    map[string]ProviderStats `json:"byProvider"`
	ByRequestType map[string]TypeStats     `json:"byRequestType"`
	TopModels     []ModelStats             `json:"topModels"`
	DailyUsage    []DailyStats             `json:"dailyUsage"`
}

// ProviderStats represents usage stats per provider
type ProviderStats struct {
	Provider      string  `json:"provider"`
	Requests      int     `json:"requests"`
	Tokens        int     `json:"tokens"`
	Cost          float64 `json:"cost"`
	AvgDurationMs float64 `json:"avgDurationMs"`
	SuccessRate   float64 `json:"successRate"`
}

// TypeStats represents usage stats per request type
type TypeStats struct {
	RequestType string  `json:"requestType"`
	Requests    int     `json:"requests"`
	Tokens      int     `json:"tokens"`
	Cost        float64 `json:"cost"`
}

// ModelStats represents usage stats per model
type ModelStats struct {
	Provider string  `json:"provider"`
	Model    string  `json:"model"`
	Requests int     `json:"requests"`
	Tokens   int     `json:"tokens"`
	Cost     float64 `json:"cost"`
}

// DailyStats represents daily usage statistics
type DailyStats struct {
	Date     string  `json:"date"`
	Requests int     `json:"requests"`
	Tokens   int     `json:"tokens"`
	Cost     float64 `json:"cost"`
}
