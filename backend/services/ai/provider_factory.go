package ai

import (
	"errors"
)

// ProviderFactory creates AI provider instances
type ProviderFactory struct{}

// NewProviderFactory creates a new provider factory
func NewProviderFactory() *ProviderFactory {
	return &ProviderFactory{}
}

// CreateProvider creates a provider instance based on configuration
func (f *ProviderFactory) CreateProvider(config ProviderConfig) (AIProvider, error) {
	if config.APIKey == "" && config.Type != ProviderTypeCustom {
		return nil, errors.New("API key is required")
	}

	switch config.Type {
	case "openai":
		return NewOpenAIProvider(config), nil

	case "gemini":
		return NewGeminiProvider(config), nil

	case "anthropic":
		return NewAnthropicProvider(config), nil

	case "cohere":
		return NewCohereProvider(config), nil

	case "openrouter":
		return NewOpenRouterProvider(config), nil

	case "custom":
		if config.BaseURL == "" {
			return nil, errors.New("base URL is required for custom provider")
		}
		return NewCustomProvider(config), nil

	default:
		return nil, errors.New("unsupported provider type: " + config.Type)
	}
}

// GetSupportedProviders returns list of supported provider types
func (f *ProviderFactory) GetSupportedProviders() []string {
	return []string{
		"openai",
		"gemini",
		"anthropic",
		"cohere",
		"openrouter",
		"custom",
	}
}

// Provider type constants (for consistency)
const (
	ProviderTypeOpenAI     = "openai"
	ProviderTypeGemini     = "gemini"
	ProviderTypeAnthropic  = "anthropic"
	ProviderTypeCohere     = "cohere"
	ProviderTypeOpenRouter = "openrouter"
	ProviderTypeCustom     = "custom"
)
