package services

import (
	"context"
	"errors"
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services/ai"
	"time"

	"github.com/google/uuid"
)

// AIService provides AI operations
type AIService struct {
	encryptionService *EncryptionService
	providerFactory   *ai.ProviderFactory
}

// NewAIService creates a new AI service
func NewAIService(encryptionService *EncryptionService) *AIService {
	return &AIService{
		encryptionService: encryptionService,
		providerFactory:   ai.NewProviderFactory(),
	}
}

// Generate generates content using the specified provider
func (s *AIService) Generate(ctx context.Context, providerID, userID, prompt string, context map[string]interface{}) (*models.AIRequest, error) {
	startTime := time.Now()

	// Get provider from database
	var provider models.AIProvider
	if err := database.DB.Where("id = ? AND user_id = ?", providerID, userID).First(&provider).Error; err != nil {
		return nil, errors.New("provider not found or access denied")
	}

	// Check if provider is active
	if !provider.IsActive {
		return nil, errors.New("provider is not active")
	}

	// Decrypt API key
	apiKey, err := s.encryptionService.Decrypt(provider.APIKeyEncrypted)
	if err != nil {
		return nil, errors.New("failed to decrypt API key")
	}

	// Create provider instance
	providerConfig := ai.ProviderConfig{
		Type:    provider.ProviderType,
		APIKey:  apiKey,
		BaseURL: "",
		Model:   provider.Model,
		Config:  provider.Config,
	}

	if provider.BaseURL != nil {
		providerConfig.BaseURL = *provider.BaseURL
	}

	aiProvider, err := s.providerFactory.CreateProvider(providerConfig)
	if err != nil {
		return nil, err
	}

	// Generate content
	req := ai.GenerateRequest{
		Prompt:      prompt,
		Context:     context,
		Temperature: 0.7, // Default
		MaxTokens:   0,   // Use provider default
	}

	resp, err := aiProvider.Generate(ctx, req)

	// Calculate duration
	duration := time.Since(startTime)

	// Create AI request record
	aiRequest := models.AIRequest{
		ID:         uuid.New().String(),
		ProviderID: providerID,
		UserID:     userID,
		Prompt:     prompt,
		Context:    models.JSONB(context),
		DurationMs: int(duration.Milliseconds()),
		CreatedAt:  time.Now(),
	}

	if err != nil {
		// Log error
		errMsg := err.Error()
		aiRequest.Error = &errMsg
		aiRequest.Status = models.RequestStatusError
	} else {
		// Log success
		aiRequest.Response = &resp.Content
		aiRequest.TokensUsed = resp.TokensUsed
		aiRequest.Status = models.RequestStatusSuccess

		// Calculate cost (simplified - should be provider-specific)
		aiRequest.Cost = s.calculateCost(provider.ProviderType, resp.TokensUsed)
	}

	// Save to database
	if dbErr := database.DB.Create(&aiRequest).Error; dbErr != nil {
		// Log database error but don't fail the request
		// In production, use proper logging
	}

	if err != nil {
		return nil, err
	}

	return &aiRequest, nil
}

// StreamGenerate generates content using the specified provider with streaming
func (s *AIService) StreamGenerate(ctx context.Context, providerID, userID, prompt string, context map[string]interface{}) (<-chan ai.GenerateResponse, error) {
	// Get provider from database
	var provider models.AIProvider
	if err := database.DB.Where("id = ? AND user_id = ?", providerID, userID).First(&provider).Error; err != nil {
		return nil, errors.New("provider not found or access denied")
	}

	// Check if provider is active
	if !provider.IsActive {
		return nil, errors.New("provider is not active")
	}

	// Decrypt API key
	apiKey, err := s.encryptionService.Decrypt(provider.APIKeyEncrypted)
	if err != nil {
		return nil, errors.New("failed to decrypt API key")
	}

	// Create provider instance
	providerConfig := ai.ProviderConfig{
		Type:    provider.ProviderType,
		APIKey:  apiKey,
		BaseURL: "",
		Model:   provider.Model,
		Config:  provider.Config,
	}

	if provider.BaseURL != nil {
		providerConfig.BaseURL = *provider.BaseURL
	}

	aiProvider, err := s.providerFactory.CreateProvider(providerConfig)
	if err != nil {
		return nil, err
	}

	// Generate content with streaming
	req := ai.GenerateRequest{
		Prompt:      prompt,
		Context:     context,
		Temperature: 0.7, // Default
		MaxTokens:   0,   // Use provider default
	}

	return aiProvider.StreamGenerate(ctx, req)
}

// GetDefaultProvider gets the user's default provider
func (s *AIService) GetDefaultProvider(userID string) (*models.AIProvider, error) {
	var provider models.AIProvider
	err := database.DB.Where("user_id = ? AND is_default = ? AND is_active = ?", userID, true, true).First(&provider).Error
	if err != nil {
		// If no default, get any active provider
		err = database.DB.Where("user_id = ? AND is_active = ?", userID, true).First(&provider).Error
	}
	return &provider, err
}

// TestProvider tests a provider connection
func (s *AIService) TestProvider(ctx context.Context, providerID, userID string) error {
	// Get provider
	var provider models.AIProvider
	if err := database.DB.Where("id = ? AND user_id = ?", providerID, userID).First(&provider).Error; err != nil {
		return errors.New("provider not found or access denied")
	}

	// Decrypt API key
	apiKey, err := s.encryptionService.Decrypt(provider.APIKeyEncrypted)
	if err != nil {
		return errors.New("failed to decrypt API key")
	}

	// Create provider instance
	providerConfig := ai.ProviderConfig{
		Type:    provider.ProviderType,
		APIKey:  apiKey,
		BaseURL: "",
		Model:   provider.Model,
	}

	if provider.BaseURL != nil {
		providerConfig.BaseURL = *provider.BaseURL
	}

	aiProvider, err := s.providerFactory.CreateProvider(providerConfig)
	if err != nil {
		return err
	}

	// Test with simple prompt
	req := ai.GenerateRequest{
		Prompt:      "Say 'test successful' if you can read this.",
		Context:     nil,
		Temperature: 0.7,
		MaxTokens:   20,
	}

	_, err = aiProvider.Generate(ctx, req)
	return err
}

// calculateCost calculates the cost based on provider and tokens
// This is simplified - in production, use actual pricing
func (s *AIService) calculateCost(providerType string, tokens int) float64 {
	switch providerType {
	case "openai":
		// GPT-4: ~$0.03 per 1K tokens (average of input/output)
		return float64(tokens) * 0.00003
	case "gemini":
		// Gemini Pro: Free tier or very cheap
		return float64(tokens) * 0.000001
	case "anthropic":
		// Claude: ~$0.015 per 1K tokens (average)
		return float64(tokens) * 0.000015
	case "cohere":
		// Cohere: ~$0.001 per 1K tokens
		return float64(tokens) * 0.000001
	default:
		return 0.0
	}
}
