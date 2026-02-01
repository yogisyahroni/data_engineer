package handlers

import (
	"bufio"
	"fmt"
	"insight-engine-backend/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// SemanticHandler handles semantic AI operations
type SemanticHandler struct {
	semanticService  *services.SemanticService
	streamingService *services.StreamingService
	usageTracker     *services.UsageTracker
}

// NewSemanticHandler creates a new semantic handler
func NewSemanticHandler(semanticService *services.SemanticService, streamingService *services.StreamingService, usageTracker *services.UsageTracker) *SemanticHandler {
	return &SemanticHandler{
		semanticService:  semanticService,
		streamingService: streamingService,
		usageTracker:     usageTracker,
	}
}

// ExplainData handles AI data explanation requests
func (h *SemanticHandler) ExplainData(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		ProviderID *string                `json:"providerId"`
		Type       string                 `json:"type"` // data, query, chart
		Prompt     string                 `json:"prompt"`
		Context    map[string]interface{} `json:"context"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Prompt == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Prompt is required"})
	}

	// Use default provider if not specified
	providerID := ""
	if input.ProviderID != nil {
		providerID = *input.ProviderID
	}

	// Generate explanation
	result, err := h.semanticService.ExplainData(c.Context(), userID, providerID, input.Prompt, input.Context)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(result)
}

// GenerateQuery handles AI query generation requests
func (h *SemanticHandler) GenerateQuery(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		ProviderID   *string `json:"providerId"`
		Prompt       string  `json:"prompt"`
		DataSourceID string  `json:"dataSourceId"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Prompt == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Prompt is required"})
	}

	if input.DataSourceID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Data source ID is required"})
	}

	// Use default provider if not specified
	providerID := ""
	if input.ProviderID != nil {
		providerID = *input.ProviderID
	}

	// Generate query
	result, err := h.semanticService.GenerateQuery(c.Context(), userID, providerID, input.Prompt, input.DataSourceID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(result)
}

// GenerateFormula handles AI formula generation requests
func (h *SemanticHandler) GenerateFormula(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		ProviderID       *string  `json:"providerId"`
		Description      string   `json:"description"`
		AvailableColumns []string `json:"availableColumns"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Description == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Description is required"})
	}

	// Use default provider if not specified
	providerID := ""
	if input.ProviderID != nil {
		providerID = *input.ProviderID
	}

	// Generate formula
	result, err := h.semanticService.GenerateFormula(c.Context(), userID, providerID, input.Description, input.AvailableColumns)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(result)
}

// Chat handles AI chat requests
func (h *SemanticHandler) Chat(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		ProviderID     *string                `json:"providerId"`
		Message        string                 `json:"message"`
		ConversationID string                 `json:"conversationId"`
		Context        map[string]interface{} `json:"context"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Message == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Message is required"})
	}

	// Use default provider if not specified
	providerID := ""
	if input.ProviderID != nil {
		providerID = *input.ProviderID
	}

	// Generate conversation ID if not provided
	conversationID := input.ConversationID
	if conversationID == "" {
		conversationID = "conv_" + userID + "_" + strconv.FormatInt(time.Now().Unix(), 10)
	}

	// Chat
	result, err := h.semanticService.Chat(c.Context(), userID, providerID, input.Message, conversationID, input.Context)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(result)
}

// ChatStream handles AI chat requests with streaming response (SSE)
func (h *SemanticHandler) ChatStream(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// Since SSE is a GET request usually, but we might want POST for complex body.
	// Fiber supports POST for streams.
	// Let's assume POST for consistency with other AI endpoints.
	// However, standard EventSource uses GET.
	// But our route definition in main.go is GET for /semantic/chat/stream? No, I defined it as GET.
	// If it is GET, we need to pass params in query string.
	// But `message` and `context` are large.
	// Let's support POST for streaming if client uses fetch/event-stream.
	// But wait, main.go defines it as GET: `api.Get("/semantic/chat/stream", ...)`
	// I should probably change main.go to POST or handle query params here.
	// Large prompts won't fit in URL.
	// I will handle it as GET but assuming params are in query for simple test,
	// BUT for real app usage with large context, POST is better.
	// I will update main.go to POST for `/semantic/chat/stream` in next step if needed.
	// For now, let's implement body parsing (which works on GET in some clients but not standard).
	// Actually, let's look at `main.go`. I defined it as `api.Get`.
	// I should change it to `api.Post`.
	// I will write this handler assuming BodyParser works (so POST).

	var input struct {
		ProviderID     *string                `json:"providerId"`
		Message        string                 `json:"message"`
		ConversationID string                 `json:"conversationId"`
		Context        map[string]interface{} `json:"context"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Message == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Message is required"})
	}

	// Use default provider if not specified
	providerID := ""
	if input.ProviderID != nil {
		providerID = *input.ProviderID
	}

	// Generate conversation ID if not provided
	conversationID := input.ConversationID
	if conversationID == "" {
		conversationID = "conv_" + userID + "_" + strconv.FormatInt(time.Now().Unix(), 10)
	}

	// Set headers for SSE
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	// Call StreamChat
	streamChan, err := h.semanticService.StreamChat(c.Context(), userID, providerID, input.Message, conversationID, input.Context)
	if err != nil {
		// If error happens before streaming starts, return JSON error?
		// But headers might be set.
		// We can send an error event.
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Stream responses
	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		for chunk := range streamChan {
			// Standard SSE format
			fmt.Fprintf(w, "data: %s\n\n", chunk)
			w.Flush() // Flush after each chunk
		}
	})

	return nil
}

// GetSemanticRequests retrieves semantic request history
func (h *SemanticHandler) GetSemanticRequests(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// Get query parameters
	reqType := c.Query("type", "")
	limitStr := c.Query("limit", "20")
	offsetStr := c.Query("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	if limit > 100 {
		limit = 100
	}

	// Get requests
	requests, total, err := h.semanticService.GetSemanticRequests(c.Context(), userID, reqType, limit, offset)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(200).JSON(fiber.Map{
		"data":   requests,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetSemanticRequest retrieves a single semantic request
func (h *SemanticHandler) GetSemanticRequest(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	requestID := c.Params("id")

	// Get single request through service
	requests, _, err := h.semanticService.GetSemanticRequests(c.Context(), userID, "", 1, 0)
	if err != nil || len(requests) == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Semantic request not found"})
	}

	// Filter by ID
	for _, req := range requests {
		if req.ID == requestID {
			return c.Status(200).JSON(req)
		}
	}

	return c.Status(404).JSON(fiber.Map{"error": "Semantic request not found"})
}

// EstimateCost estimates the cost of a prompt before sending to AI
func (h *SemanticHandler) EstimateCost(c *fiber.Ctx) error {
	var input services.EstimateCostRequest

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Prompt == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Prompt is required"})
	}

	if input.Model == "" {
		// Default to Gemini Flash if no model specified
		input.Model = "gemini-1.5-flash"
	}

	// Estimate cost
	estimate := h.semanticService.EstimateCost(input)

	return c.Status(200).JSON(estimate)
}

// AnalyzeQueryOptimization analyzes a SQL query and provides optimization suggestions
func (h *SemanticHandler) AnalyzeQueryOptimization(c *fiber.Ctx) error {
	var input struct {
		Query string `json:"query"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query is required"})
	}

	// Analyze query
	result := h.semanticService.AnalyzeQueryOptimization(input.Query)

	return c.Status(200).JSON(result)
}

// FormulaAutocomplete provides autocomplete suggestions for formula editing
func (h *SemanticHandler) FormulaAutocomplete(c *fiber.Ctx) error {
	var input services.AutocompleteRequest

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Input == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Input is required"})
	}

	// Get autocomplete suggestions
	result := h.semanticService.GetAutocompleteSuggestions(c.Context(), input)

	return c.Status(200).JSON(result)
}
