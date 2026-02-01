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

// CohereProvider implements the AIProvider interface for Cohere
type CohereProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewCohereProvider creates a new Cohere provider
func NewCohereProvider(config ProviderConfig) *CohereProvider {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://api.cohere.ai/v1"
	}

	return &CohereProvider{
		apiKey:  config.APIKey,
		baseURL: baseURL,
		model:   config.Model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Generate generates content using Cohere API
func (p *CohereProvider) Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	// Build Cohere request
	cohereReq := map[string]interface{}{
		"model":  p.model,
		"prompt": req.Prompt,
	}

	// Add optional parameters
	if req.Temperature > 0 {
		cohereReq["temperature"] = req.Temperature
	}

	if req.MaxTokens > 0 {
		cohereReq["max_tokens"] = req.MaxTokens
	}

	// Add context as preamble if provided
	if len(req.Context) > 0 {
		contextStr, _ := json.Marshal(req.Context)
		cohereReq["preamble"] = string(contextStr)
	}

	// Marshal request
	reqBody, err := json.Marshal(cohereReq)
	if err != nil {
		return nil, err
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/generate", bytes.NewBuffer(reqBody))
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
		return nil, fmt.Errorf("Cohere API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var cohereResp struct {
		Generations []struct {
			Text string `json:"text"`
		} `json:"generations"`
		Meta struct {
			BilledUnits struct {
				InputTokens  int `json:"input_tokens"`
				OutputTokens int `json:"output_tokens"`
			} `json:"billed_units"`
		} `json:"meta"`
	}

	if err := json.Unmarshal(body, &cohereResp); err != nil {
		return nil, err
	}

	if len(cohereResp.Generations) == 0 {
		return nil, errors.New("no generations in Cohere response")
	}

	totalTokens := cohereResp.Meta.BilledUnits.InputTokens + cohereResp.Meta.BilledUnits.OutputTokens

	return &GenerateResponse{
		Content:      cohereResp.Generations[0].Text,
		TokensUsed:   totalTokens,
		Model:        p.model,
		FinishReason: "stop",
	}, nil
}

// StreamGenerate generates content using Cohere API with streaming
func (p *CohereProvider) StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan GenerateResponse, error) {
	// Not implemented for Cohere yet
	return nil, errors.New("streaming not supported for Cohere provider")
}

// GetInfo returns provider information
func (p *CohereProvider) GetInfo() ProviderInfo {
	return ProviderInfo{
		Name: "Cohere",
		Type: "cohere",
		SupportedModels: []string{
			"command",
			"command-light",
			"command-nightly",
			"command-r",
			"command-r-plus",
		},
	}
}
