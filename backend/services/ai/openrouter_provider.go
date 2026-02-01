package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// OpenRouterProvider implements AIProvider for OpenRouter API
// OpenRouter is an aggregator that provides access to multiple AI models
// through a unified OpenAI-compatible API
type OpenRouterProvider struct {
	apiKey string
	model  string
	client *http.Client
}

// NewOpenRouterProvider creates a new OpenRouter provider
func NewOpenRouterProvider(config ProviderConfig) *OpenRouterProvider {
	return &OpenRouterProvider{
		apiKey: config.APIKey,
		model:  config.Model,
		client: &http.Client{
			Timeout: 60 * time.Second, // Longer timeout for various models
		},
	}
}

// Generate generates content using OpenRouter API
func (p *OpenRouterProvider) Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	// Prepare messages
	messages := []map[string]interface{}{}

	// Add context as system message if provided
	if req.Context != nil {
		if systemMsg, ok := req.Context["system"].(string); ok && systemMsg != "" {
			messages = append(messages, map[string]interface{}{
				"role":    "system",
				"content": systemMsg,
			})
		}
	}

	// Add user prompt
	messages = append(messages, map[string]interface{}{
		"role":    "user",
		"content": req.Prompt,
	})

	// Prepare request body (OpenAI-compatible format)
	requestBody := map[string]interface{}{
		"model":       p.model,
		"messages":    messages,
		"temperature": 0.7,
		"max_tokens":  2000,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(
		ctx,
		"POST",
		"https://openrouter.ai/api/v1/chat/completions",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	httpReq.Header.Set("HTTP-Referer", "https://insight-engine.ai") // Optional: for tracking
	httpReq.Header.Set("X-Title", "InsightEngine AI")               // Optional: for tracking

	// Send request
	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from API")
	}

	return &GenerateResponse{
		Content:    apiResp.Choices[0].Message.Content,
		TokensUsed: apiResp.Usage.TotalTokens,
	}, nil
}

// StreamGenerate generates content using OpenRouter API with streaming
func (p *OpenRouterProvider) StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan GenerateResponse, error) {
	// Not implemented for OpenRouter yet
	return nil, fmt.Errorf("streaming not supported for OpenRouter provider")
}

// GetInfo returns provider information
func (p *OpenRouterProvider) GetInfo() ProviderInfo {
	return ProviderInfo{
		Name: "OpenRouter",
		Type: "openrouter",
	}
}
