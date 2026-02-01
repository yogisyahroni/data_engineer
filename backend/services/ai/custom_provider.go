package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// CustomProvider implements the AIProvider interface for custom/generic providers
// Supports OpenAI-compatible APIs (Ollama, LM Studio, LocalAI, etc.)
type CustomProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewCustomProvider creates a new custom provider
func NewCustomProvider(config ProviderConfig) *CustomProvider {
	return &CustomProvider{
		apiKey:  config.APIKey,
		baseURL: config.BaseURL,
		model:   config.Model,
		client: &http.Client{
			Timeout: 120 * time.Second, // Longer timeout for local models
		},
	}
}

// Generate generates content using custom provider API
// Assumes OpenAI-compatible chat completions format
func (p *CustomProvider) Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	// Build OpenAI-compatible request
	customReq := map[string]interface{}{
		"model": p.model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": req.Prompt,
			},
		},
	}

	// Add optional parameters
	if req.Temperature > 0 {
		customReq["temperature"] = req.Temperature
	} else {
		customReq["temperature"] = 0.7 // Default
	}

	if req.MaxTokens > 0 {
		customReq["max_tokens"] = req.MaxTokens
	}

	// Add context as system message if provided
	if len(req.Context) > 0 {
		contextStr, _ := json.Marshal(req.Context)
		messages := customReq["messages"].([]map[string]string)
		customReq["messages"] = append([]map[string]string{
			{
				"role":    "system",
				"content": string(contextStr),
			},
		}, messages...)
	}

	// Marshal request
	reqBody, err := json.Marshal(customReq)
	if err != nil {
		return nil, err
	}

	// Create HTTP request
	endpoint := p.baseURL + "/chat/completions"
	if p.baseURL == "" {
		return nil, errors.New("base URL is required for custom provider")
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Add API key if provided (some local models don't require it)
	if p.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	}

	// Execute request
	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Custom provider API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response (OpenAI-compatible format)
	var customResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
			FinishReason string `json:"finish_reason"`
		} `json:"choices"`
		Usage struct {
			TotalTokens int `json:"total_tokens"`
		} `json:"usage"`
		Model string `json:"model"`
	}

	if err := json.Unmarshal(body, &customResp); err != nil {
		return nil, err
	}

	if len(customResp.Choices) == 0 {
		return nil, errors.New("no choices in custom provider response")
	}

	return &GenerateResponse{
		Content:      customResp.Choices[0].Message.Content,
		TokensUsed:   customResp.Usage.TotalTokens,
		Model:        customResp.Model,
		FinishReason: customResp.Choices[0].FinishReason,
	}, nil
}

// StreamGenerate generates content using Custom Provider API with streaming
func (p *CustomProvider) StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan GenerateResponse, error) {
	// Not implemented for CustomProvider yet
	return nil, errors.New("streaming not supported for Custom provider")
}

// GetInfo returns provider information
func (p *CustomProvider) GetInfo() ProviderInfo {
	return ProviderInfo{
		Name: "Custom Provider",
		Type: "custom",
		SupportedModels: []string{
			"any", // Custom providers can use any model
		},
	}
}
