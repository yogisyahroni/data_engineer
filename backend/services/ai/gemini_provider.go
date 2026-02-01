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

// GeminiProvider implements the AIProvider interface for Google Gemini
type GeminiProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewGeminiProvider creates a new Gemini provider
func NewGeminiProvider(config ProviderConfig) *GeminiProvider {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1beta"
	}

	return &GeminiProvider{
		apiKey:  config.APIKey,
		baseURL: baseURL,
		model:   config.Model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Generate generates content using Gemini API
func (p *GeminiProvider) Generate(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	// Build Gemini request
	geminiReq := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{
						"text": req.Prompt,
					},
				},
			},
		},
	}

	// Add generation config
	generationConfig := make(map[string]interface{})
	if req.Temperature > 0 {
		generationConfig["temperature"] = req.Temperature
	}
	if req.MaxTokens > 0 {
		generationConfig["maxOutputTokens"] = req.MaxTokens
	}
	if len(generationConfig) > 0 {
		geminiReq["generationConfig"] = generationConfig
	}

	// Add context as system instruction if provided
	if len(req.Context) > 0 {
		contextStr, _ := json.Marshal(req.Context)
		geminiReq["systemInstruction"] = map[string]interface{}{
			"parts": []map[string]string{
				{
					"text": string(contextStr),
				},
			},
		}
	}

	// Marshal request
	reqBody, err := json.Marshal(geminiReq)
	if err != nil {
		return nil, err
	}

	// Create HTTP request
	url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", p.baseURL, p.model, p.apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")

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
		return nil, fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
			FinishReason string `json:"finishReason"`
		} `json:"candidates"`
		UsageMetadata struct {
			TotalTokenCount int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 {
		return nil, errors.New("no candidates in Gemini response")
	}

	candidate := geminiResp.Candidates[0]
	if len(candidate.Content.Parts) == 0 {
		return nil, errors.New("no parts in Gemini response")
	}

	return &GenerateResponse{
		Content:      candidate.Content.Parts[0].Text,
		TokensUsed:   geminiResp.UsageMetadata.TotalTokenCount,
		Model:        p.model,
		FinishReason: candidate.FinishReason,
	}, nil
}

// StreamGenerate generates content using Gemini API with streaming
func (p *GeminiProvider) StreamGenerate(ctx context.Context, req GenerateRequest) (<-chan GenerateResponse, error) {
	// Build Gemini request
	geminiReq := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{
						"text": req.Prompt,
					},
				},
			},
		},
	}

	// Add generation config
	generationConfig := make(map[string]interface{})
	if req.Temperature > 0 {
		generationConfig["temperature"] = req.Temperature
	}
	if req.MaxTokens > 0 {
		generationConfig["maxOutputTokens"] = req.MaxTokens
	}
	if len(generationConfig) > 0 {
		geminiReq["generationConfig"] = generationConfig
	}

	// Add context as system instruction if provided
	if len(req.Context) > 0 {
		contextStr, _ := json.Marshal(req.Context)
		geminiReq["systemInstruction"] = map[string]interface{}{
			"parts": []map[string]string{
				{
					"text": string(contextStr),
				},
			},
		}
	}

	// Marshal request
	reqBody, err := json.Marshal(geminiReq)
	if err != nil {
		return nil, err
	}

	// Create HTTP request with alt=sse
	url := fmt.Sprintf("%s/models/%s:streamGenerateContent?alt=sse&key=%s", p.baseURL, p.model, p.apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Execute request
	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	// Note: We do NOT close the body here, it will be closed in the goroutine

	// Check status code
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("Gemini API error (status %d)", resp.StatusCode)
	}

	// Create channel
	respChan := make(chan GenerateResponse)

	// Launch goroutine to stream response
	go func() {
		defer resp.Body.Close()
		defer close(respChan)

		reader := io.Reader(resp.Body)
		// Simple line reader
		var buf []byte
		tmp := make([]byte, 1024)

		for {
			n, err := reader.Read(tmp)
			if n > 0 {
				buf = append(buf, tmp[:n]...)

				// Process complete lines
				for {
					idx := bytes.Index(buf, []byte("\n\n"))
					if idx == -1 {
						break
					}

					line := buf[:idx]
					buf = buf[idx+2:]

					lineStr := string(line)
					if len(lineStr) > 6 && lineStr[:6] == "data: " {
						jsonStr := lineStr[6:]

						// Parse JSON
						var geminiResp struct {
							Candidates []struct {
								Content struct {
									Parts []struct {
										Text string `json:"text"`
									} `json:"parts"`
								} `json:"content"`
								FinishReason string `json:"finishReason"`
							} `json:"candidates"`
							UsageMetadata struct {
								TotalTokenCount int `json:"totalTokenCount"`
							} `json:"usageMetadata"`
						}

						if err := json.Unmarshal([]byte(jsonStr), &geminiResp); err != nil {
							continue
						}

						if len(geminiResp.Candidates) > 0 {
							c := geminiResp.Candidates[0]
							content := ""
							if len(c.Content.Parts) > 0 {
								content = c.Content.Parts[0].Text
							}

							respChan <- GenerateResponse{
								Content:      content,
								TokensUsed:   geminiResp.UsageMetadata.TotalTokenCount,
								Model:        p.model,
								FinishReason: c.FinishReason,
							}
						}
					}
				}
			}

			if err != nil {
				break
			}
		}
	}()

	return respChan, nil
}

// GetInfo returns provider information
func (p *GeminiProvider) GetInfo() ProviderInfo {
	return ProviderInfo{
		Name: "Google Gemini",
		Type: "gemini",
		SupportedModels: []string{
			"gemini-pro",
			"gemini-pro-vision",
			"gemini-1.5-pro",
			"gemini-1.5-flash",
		},
	}
}
