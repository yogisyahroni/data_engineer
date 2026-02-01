package ai

import (
	"context"
)

// AIProvider is the interface that all AI providers must implement
type AIProvider interface {
	// Generate generates content based on the request
	Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error)

	// StreamGenerate generates content with streaming response
	StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan GenerateResponse, error)

	// GetInfo returns provider information
	GetInfo() ProviderInfo
}

// GenerateRequest represents a request to generate content
type GenerateRequest struct {
	Prompt      string                 `json:"prompt"`
	Context     map[string]interface{} `json:"context"`
	Temperature float64                `json:"temperature"` // 0.0 to 1.0
	MaxTokens   int                    `json:"maxTokens"`   // Maximum tokens to generate
}

// GenerateResponse represents the response from content generation
type GenerateResponse struct {
	Content      string `json:"content"`
	TokensUsed   int    `json:"tokensUsed"`
	Model        string `json:"model"`
	FinishReason string `json:"finishReason"` // stop, length, error
}

// ProviderInfo contains information about the provider
type ProviderInfo struct {
	Name            string   `json:"name"`
	Type            string   `json:"type"`
	SupportedModels []string `json:"supportedModels"`
}

// Provider configuration
type ProviderConfig struct {
	Type    string
	APIKey  string // Decrypted API key
	BaseURL string
	Model   string
	Config  map[string]interface{}
}
