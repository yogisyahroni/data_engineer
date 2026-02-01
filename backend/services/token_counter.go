package services

import (
	"strings"
	"unicode/utf8"
)

// TokenCounter provides token estimation and cost calculation for AI providers
type TokenCounter struct {
	// Provider-specific pricing (cost per 1K tokens in USD)
	pricingMatrix map[string]map[string]float64
}

// NewTokenCounter creates a new token counter with pricing matrix
func NewTokenCounter() *TokenCounter {
	return &TokenCounter{
		pricingMatrix: map[string]map[string]float64{
			// Gemini pricing (per 1M tokens)
			"gemini-1.5-flash": {
				"input":  0.075 / 1000, // $0.075 per 1M tokens = $0.000075 per 1K
				"output": 0.30 / 1000,  // $0.30 per 1M tokens
			},
			"gemini-1.5-pro": {
				"input":  1.25 / 1000, // $1.25 per 1M tokens
				"output": 5.00 / 1000, // $5.00 per 1M tokens
			},
			// OpenAI pricing (per 1M tokens)
			"gpt-4o": {
				"input":  2.50 / 1000,  // $2.50 per 1M tokens
				"output": 10.00 / 1000, // $10.00 per 1M tokens
			},
			"gpt-4o-mini": {
				"input":  0.150 / 1000, // $0.150 per 1M tokens
				"output": 0.600 / 1000, // $0.600 per 1M tokens
			},
			// Groq pricing (free tier, but we track for future)
			"llama-3.1-70b-versatile": {
				"input":  0.0,
				"output": 0.0,
			},
			// OpenRouter pricing (varies by model)
			"meta-llama/llama-3.1-70b-instruct": {
				"input":  0.52 / 1000, // $0.52 per 1M tokens
				"output": 0.75 / 1000, // $0.75 per 1M tokens
			},
		},
	}
}

// EstimateTokens estimates the number of tokens in a text
// Uses a simple heuristic: ~4 characters per token for English text
// This is approximate - actual tokenization varies by model
func (tc *TokenCounter) EstimateTokens(text string, provider string) int {
	if text == "" {
		return 0
	}

	// Count characters (UTF-8 aware)
	charCount := utf8.RuneCountInString(text)

	// Different providers have different tokenization
	// Gemini: ~4 chars/token
	// OpenAI (tiktoken): ~4 chars/token for English
	// For simplicity, we use 4 chars/token as baseline
	charsPerToken := 4.0

	// Adjust for provider-specific characteristics
	if strings.Contains(provider, "gemini") {
		charsPerToken = 4.0
	} else if strings.Contains(provider, "gpt") {
		charsPerToken = 4.0
	} else if strings.Contains(provider, "llama") {
		charsPerToken = 3.5 // LLaMA tends to use slightly more tokens
	}

	estimatedTokens := int(float64(charCount) / charsPerToken)

	// Add overhead for special tokens (BOS, EOS, etc.)
	// Typically 2-5 tokens per message
	overhead := 3

	return estimatedTokens + overhead
}

// CalculateCost calculates the cost for a given number of tokens
func (tc *TokenCounter) CalculateCost(inputTokens, outputTokens int, model string) float64 {
	pricing, exists := tc.pricingMatrix[model]
	if !exists {
		// Default to Gemini Flash pricing if model not found
		pricing = tc.pricingMatrix["gemini-1.5-flash"]
	}

	inputCost := float64(inputTokens) * pricing["input"]
	outputCost := float64(outputTokens) * pricing["output"]

	return inputCost + outputCost
}

// EstimateCostForPrompt estimates the cost for a prompt before sending to AI
func (tc *TokenCounter) EstimateCostForPrompt(prompt, systemPrompt, model string, expectedOutputTokens int) (estimatedTokens int, estimatedCost float64) {
	// Estimate input tokens (prompt + system prompt)
	inputTokens := tc.EstimateTokens(prompt, model) + tc.EstimateTokens(systemPrompt, model)

	// If no expected output tokens provided, assume average response length
	if expectedOutputTokens == 0 {
		expectedOutputTokens = 150 // Average response is ~150 tokens
	}

	estimatedTokens = inputTokens + expectedOutputTokens
	estimatedCost = tc.CalculateCost(inputTokens, expectedOutputTokens, model)

	return estimatedTokens, estimatedCost
}

// GetProviderPricing returns the pricing for a specific model
func (tc *TokenCounter) GetProviderPricing(model string) (inputPrice, outputPrice float64, exists bool) {
	pricing, exists := tc.pricingMatrix[model]
	if !exists {
		return 0, 0, false
	}

	return pricing["input"], pricing["output"], true
}
