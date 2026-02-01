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

// OpenAIProvider implements the AIProvider interface for OpenAI
type OpenAIProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewOpenAIProvider creates a new OpenAI provider
func NewOpenAIProvider(config ProviderConfig) *OpenAIProvider {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}

	return &OpenAIProvider{
		apiKey:  config.APIKey,
		baseURL: baseURL,
		model:   config.Model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Generate generates content using OpenAI API
func (p *OpenAIProvider) Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	// Build OpenAI request
	openAIReq := map[string]interface{}{
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
		openAIReq["temperature"] = req.Temperature
	} else {
		openAIReq["temperature"] = 0.7 // Default
	}

	if req.MaxTokens > 0 {
		openAIReq["max_tokens"] = req.MaxTokens
	}

	// Add context as system message if provided
	if len(req.Context) > 0 {
		contextStr, _ := json.Marshal(req.Context)
		messages := openAIReq["messages"].([]map[string]string)
		openAIReq["messages"] = append([]map[string]string{
			{
				"role":    "system",
				"content": string(contextStr),
			},
		}, messages...)
	}

	// Marshal request
	reqBody, err := json.Marshal(openAIReq)
	if err != nil {
		return nil, err
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/chat/completions", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

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
		return nil, fmt.Errorf("OpenAI API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var openAIResp struct {
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

	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return nil, err
	}

	if len(openAIResp.Choices) == 0 {
		return nil, errors.New("no choices in OpenAI response")
	}

	return &GenerateResponse{
		Content:      openAIResp.Choices[0].Message.Content,
		TokensUsed:   openAIResp.Usage.TotalTokens,
		Model:        openAIResp.Model,
		FinishReason: openAIResp.Choices[0].FinishReason,
	}, nil
}

// StreamGenerate generates content using OpenAI API with streaming
func (p *OpenAIProvider) StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan GenerateResponse, error) {
	// Not implemented for OpenAI yet
	return nil, errors.New("streaming not supported for OpenAI provider")
}

// GetInfo returns provider information
func (p *OpenAIProvider) GetInfo() ProviderInfo {
	return ProviderInfo{
		Name: "OpenAI",
		Type: "openai",
		SupportedModels: []string{
			"gpt-4",
			"gpt-4-turbo",
			"gpt-4-turbo-preview",
			"gpt-3.5-turbo",
			"gpt-3.5-turbo-16k",
		},
	}
}
