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

// AnthropicProvider implements the AIProvider interface for Anthropic Claude
type AnthropicProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewAnthropicProvider creates a new Anthropic provider
func NewAnthropicProvider(config ProviderConfig) *AnthropicProvider {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://api.anthropic.com/v1"
	}

	return &AnthropicProvider{
		apiKey:  config.APIKey,
		baseURL: baseURL,
		model:   config.Model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Generate generates content using Anthropic API
func (p *AnthropicProvider) Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	// Build Anthropic request
	anthropicReq := map[string]interface{}{
		"model": p.model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": req.Prompt,
			},
		},
		"max_tokens": 1024, // Required by Anthropic
	}

	// Add optional parameters
	if req.Temperature > 0 {
		anthropicReq["temperature"] = req.Temperature
	}

	if req.MaxTokens > 0 {
		anthropicReq["max_tokens"] = req.MaxTokens
	}

	// Add context as system message if provided
	if len(req.Context) > 0 {
		contextStr, _ := json.Marshal(req.Context)
		anthropicReq["system"] = string(contextStr)
	}

	// Marshal request
	reqBody, err := json.Marshal(anthropicReq)
	if err != nil {
		return nil, err
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/messages", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", p.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

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
		return nil, fmt.Errorf("Anthropic API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var anthropicResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
		Usage struct {
			InputTokens  int `json:"input_tokens"`
			OutputTokens int `json:"output_tokens"`
		} `json:"usage"`
		Model      string `json:"model"`
		StopReason string `json:"stop_reason"`
	}

	if err := json.Unmarshal(body, &anthropicResp); err != nil {
		return nil, err
	}

	if len(anthropicResp.Content) == 0 {
		return nil, errors.New("no content in Anthropic response")
	}

	totalTokens := anthropicResp.Usage.InputTokens + anthropicResp.Usage.OutputTokens

	return &GenerateResponse{
		Content:      anthropicResp.Content[0].Text,
		TokensUsed:   totalTokens,
		Model:        anthropicResp.Model,
		FinishReason: anthropicResp.StopReason,
	}, nil
}

// StreamGenerate generates content using Anthropic API with streaming
func (p *AnthropicProvider) StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan GenerateResponse, error) {
	// Not implemented for Anthropic yet
	return nil, errors.New("streaming not supported for Anthropic provider")
}

// GetInfo returns provider information
func (p *AnthropicProvider) GetInfo() ProviderInfo {
	return ProviderInfo{
		Name: "Anthropic Claude",
		Type: "anthropic",
		SupportedModels: []string{
			"claude-3-opus-20240229",
			"claude-3-sonnet-20240229",
			"claude-3-haiku-20240307",
			"claude-2.1",
			"claude-2.0",
		},
	}
}
