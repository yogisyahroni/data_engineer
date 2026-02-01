package services

import (
	"context"
	"fmt"
	"insight-engine-backend/models"
	"insight-engine-backend/services/ai"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SemanticService handles AI semantic operations
type SemanticService struct {
	db                  *gorm.DB
	aiService           *AIService
	contextBuilder      *ContextBuilder
	queryValidator      *QueryValidator
	tokenCounter        *TokenCounter
	queryOptimizer      *QueryOptimizer
	formulaAutocomplete *FormulaAutocomplete
}

// NewSemanticService creates a new semantic service
func NewSemanticService(db *gorm.DB, aiService *AIService) *SemanticService {
	return &SemanticService{
		db:                  db,
		aiService:           aiService,
		contextBuilder:      NewContextBuilder(db),
		queryValidator:      NewQueryValidator([]string{}), // Will be populated dynamically
		tokenCounter:        NewTokenCounter(),
		queryOptimizer:      NewQueryOptimizer(),
		formulaAutocomplete: NewFormulaAutocomplete(db),
	}
}

// ExplainData generates an AI explanation for data, query results, or visualizations
func (s *SemanticService) ExplainData(ctx context.Context, userID, providerID, prompt string, context map[string]interface{}) (*models.SemanticRequest, error) {
	startTime := time.Now()

	// Build AI prompt
	systemPrompt := "You are a data analyst expert. Explain the data patterns, insights, and trends in a clear and concise manner."

	// Add context to prompt
	fullPrompt := prompt
	if dataContext, ok := context["data"]; ok {
		fullPrompt = fmt.Sprintf("Data: %v\n\nQuestion: %s", dataContext, prompt)
	}

	// Generate explanation using AI
	aiRequest := &ai.GenerateRequest{
		Prompt: fullPrompt,
		Context: map[string]interface{}{
			"system": systemPrompt,
		},
	}

	response, err := s.aiService.Generate(ctx, providerID, userID, aiRequest.Prompt, aiRequest.Context)
	if err != nil {
		return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeExplain, prompt, context, "", nil, nil, false, err.Error(), 0, 0, time.Since(startTime))
	}

	responseText := ""
	if response.Response != nil {
		responseText = *response.Response
	}

	// Log successful request
	return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeExplain, prompt, context, responseText, nil, nil, true, "", response.TokensUsed, response.Cost, time.Since(startTime))
}

// GenerateQuery generates SQL query from natural language
func (s *SemanticService) GenerateQuery(ctx context.Context, userID, providerID, prompt, dataSourceID string) (*models.SemanticRequest, error) {
	startTime := time.Now()

	// Build schema context
	schemaContext, err := s.contextBuilder.BuildSchemaContext(ctx, dataSourceID)
	if err != nil {
		return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeQuery, prompt, nil, "", nil, nil, false, fmt.Sprintf("Failed to build schema context: %v", err), 0, 0, time.Since(startTime))
	}

	// Build AI prompt
	systemPrompt := `You are a SQL expert. Generate a valid PostgreSQL query based on the user's request and the provided database schema.

Rules:
1. Only generate SELECT statements
2. Use proper JOIN syntax when needed
3. Include appropriate WHERE clauses for filtering
4. Use GROUP BY for aggregations
5. Add ORDER BY for sorting
6. Return ONLY the SQL query, no explanations

` + schemaContext

	// Generate query using AI
	aiRequest := &ai.GenerateRequest{
		Prompt: prompt,
		Context: map[string]interface{}{
			"system": systemPrompt,
		},
	}

	response, err := s.aiService.Generate(ctx, providerID, userID, aiRequest.Prompt, aiRequest.Context)
	if err != nil {
		return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeQuery, prompt, map[string]interface{}{"dataSourceId": dataSourceID}, "", nil, nil, false, err.Error(), 0, 0, time.Since(startTime))
	}

	responseText := ""
	if response.Response != nil {
		responseText = *response.Response
	}

	// Extract SQL from response (AI might add explanations)
	generatedSQL := s.extractSQL(responseText)

	// Validate SQL
	validatedSQL, isValid, validationErr := s.queryValidator.ValidateSQL(generatedSQL)
	errorMsg := ""
	if validationErr != nil {
		errorMsg = validationErr.Error()
		isValid = false
	}

	// Log request
	return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeQuery, prompt, map[string]interface{}{"dataSourceId": dataSourceID}, responseText, &validatedSQL, nil, isValid, errorMsg, response.TokensUsed, response.Cost, time.Since(startTime))
}

// GenerateFormula generates a formula/calculation from natural language description
func (s *SemanticService) GenerateFormula(ctx context.Context, userID, providerID, description string, availableColumns []string) (*models.SemanticRequest, error) {
	startTime := time.Now()

	// Build AI prompt
	columnsContext := fmt.Sprintf("Available columns: %v", availableColumns)
	systemPrompt := `You are a data calculation expert. Generate a mathematical formula based on the user's description.

Rules:
1. Use only the available columns provided
2. Use standard mathematical operators: +, -, *, /, ()
3. Use common functions: SUM, AVG, COUNT, MAX, MIN
4. Return ONLY the formula, no explanations

` + columnsContext

	// Generate formula using AI
	aiRequest := &ai.GenerateRequest{
		Prompt: description,
		Context: map[string]interface{}{
			"system": systemPrompt,
		},
	}

	response, err := s.aiService.Generate(ctx, providerID, userID, aiRequest.Prompt, aiRequest.Context)
	if err != nil {
		return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeFormula, description, map[string]interface{}{"columns": availableColumns}, "", nil, nil, false, err.Error(), 0, 0, time.Since(startTime))
	}

	responseText := ""
	if response.Response != nil {
		responseText = *response.Response
	}

	// Extract formula from response
	generatedFormula := s.extractFormula(responseText)

	// Validate formula
	isValid, validationErr := s.queryValidator.ValidateFormula(generatedFormula)
	errorMsg := ""
	if validationErr != nil {
		errorMsg = validationErr.Error()
		isValid = false
	}

	// Log request
	return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeFormula, description, map[string]interface{}{"columns": availableColumns}, responseText, nil, &generatedFormula, isValid, errorMsg, response.TokensUsed, response.Cost, time.Since(startTime))
}

// GetConversationHistory retrieves the last N messages from a conversation
func (s *SemanticService) GetConversationHistory(ctx context.Context, conversationID string, maxMessages int) ([]models.SemanticRequest, error) {
	var history []models.SemanticRequest

	if conversationID == "" {
		return history, nil
	}

	err := s.db.WithContext(ctx).
		Where("conversation_id = ?", conversationID).
		Order("message_index ASC").
		Limit(maxMessages).
		Find(&history).Error

	return history, err
}

// buildConversationPrompt builds a prompt with conversation history
func (s *SemanticService) buildConversationPrompt(history []models.SemanticRequest) string {
	if len(history) == 0 {
		return ""
	}

	context := "\n\nPrevious conversation:\n"
	for _, msg := range history {
		context += fmt.Sprintf("User: %s\n", msg.Prompt)
		context += fmt.Sprintf("Assistant: %s\n\n", msg.Response)
	}

	return context
}

// Chat handles conversational data exploration with automatic history loading
func (s *SemanticService) Chat(ctx context.Context, userID, providerID, message, conversationID string, context map[string]interface{}) (*models.SemanticRequest, error) {
	startTime := time.Now()

	// Load conversation history from database (last 10 messages)
	history, err := s.GetConversationHistory(ctx, conversationID, 10)
	if err != nil {
		// Log error but continue (conversation memory is not critical)
		fmt.Printf("Warning: Failed to load conversation history: %v\n", err)
	}

	// Build conversation context from history
	conversationContext := s.buildConversationPrompt(history)

	// Build schema context if dataSourceId is provided
	var schemaContext string
	if dataSourceID, ok := context["dataSourceId"].(string); ok && dataSourceID != "" {
		var err error
		schemaContext, err = s.contextBuilder.BuildSchemaContext(ctx, dataSourceID)
		if err != nil {
			schemaContext = ""
		}
	}

	// Build AI prompt
	systemPrompt := `You are a helpful data assistant. Help users explore and understand their data through conversation.

You can:
1. Answer questions about data
2. Suggest SQL queries
3. Explain data patterns
4. Recommend visualizations

Be concise and helpful.

` + conversationContext + "\n" + schemaContext

	// Generate response using AI
	aiRequest := &ai.GenerateRequest{
		Prompt: message,
		Context: map[string]interface{}{
			"system": systemPrompt,
		},
	}

	response, err := s.aiService.Generate(ctx, providerID, userID, aiRequest.Prompt, aiRequest.Context)
	if err != nil {
		return s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeChat, message, context, "", nil, nil, false, err.Error(), 0, 0, time.Since(startTime))
	}

	responseText := ""
	if response.Response != nil {
		responseText = *response.Response
	}

	// Log request with conversation tracking
	return s.logSemanticRequestWithConversation(ctx, userID, providerID, models.SemanticTypeChat, message, context, responseText, nil, nil, true, "", response.TokensUsed, response.Cost, time.Since(startTime), conversationID)
}

// StreamChat handles conversational data exploration with streaming response
func (s *SemanticService) StreamChat(ctx context.Context, userID, providerID, message, conversationID string, context map[string]interface{}) (<-chan string, error) {
	startTime := time.Now()

	// Load conversation history from database (last 10 messages)
	history, err := s.GetConversationHistory(ctx, conversationID, 10)
	if err != nil {
		// Log error but continue
		fmt.Printf("Warning: Failed to load conversation history: %v\n", err)
	}

	// Build conversation context from history
	conversationContext := s.buildConversationPrompt(history)

	// Build schema context if dataSourceId is provided
	var schemaContext string
	if dataSourceID, ok := context["dataSourceId"].(string); ok && dataSourceID != "" {
		var err error
		schemaContext, err = s.contextBuilder.BuildSchemaContext(ctx, dataSourceID)
		if err != nil {
			schemaContext = ""
		}
	}

	// Build AI prompt
	systemPrompt := `You are a helpful data assistant. Help users explore and understand their data through conversation.

You can:
1. Answer questions about data
2. Suggest SQL queries
3. Explain data patterns
4. Recommend visualizations

Be concise and helpful.

` + conversationContext + "\n" + schemaContext

	// Generate response using AI
	aiRequest := &ai.GenerateRequest{
		Prompt: message,
		Context: map[string]interface{}{
			"system": systemPrompt,
		},
	}

	// Call StreamGenerate
	streamChan, err := s.aiService.StreamGenerate(ctx, providerID, userID, aiRequest.Prompt, aiRequest.Context)
	if err != nil {
		s.logSemanticRequest(ctx, userID, providerID, models.SemanticTypeChat, message, context, "", nil, nil, false, err.Error(), 0, 0, time.Since(startTime))
		return nil, err
	}

	// Create a new channel to stream strings to the caller
	outputChan := make(chan string)

	// Launch goroutine to process the stream
	go func() {
		defer close(outputChan)

		fullResponse := ""
		totalTokens := 0

		for chunk := range streamChan {
			fullResponse += chunk.Content
			totalTokens = chunk.TokensUsed
			outputChan <- chunk.Content
		}

		// Log the full request usage
		// Note: We don't have exact cost unless we calculate it.
		// Assuming cost is 0 or calculated in service later.
		s.logSemanticRequestWithConversation(ctx, userID, providerID, models.SemanticTypeChat, message, aiRequest.Context, fullResponse, nil, nil, true, "", totalTokens, 0, time.Since(startTime), conversationID)
	}()

	return outputChan, nil
}

// extractSQL extracts SQL query from AI response
func (s *SemanticService) extractSQL(response string) string {
	// Simple extraction - look for SELECT statement
	// In production, use more sophisticated parsing
	lines := []string{}
	inSQL := false

	for _, line := range []string{response} {
		if len(line) > 0 && (line[0:6] == "SELECT" || line[0:6] == "select") {
			inSQL = true
		}
		if inSQL {
			lines = append(lines, line)
		}
	}

	if len(lines) > 0 {
		return lines[0]
	}

	return response
}

// extractFormula extracts formula from AI response
func (s *SemanticService) extractFormula(response string) string {
	// Simple extraction - remove explanations
	// In production, use more sophisticated parsing
	return response
}

// logSemanticRequest logs a semantic request to database
func (s *SemanticService) logSemanticRequest(ctx context.Context, userID, providerID, reqType, prompt string, context map[string]interface{}, response string, generatedSQL, generatedFormula *string, isValid bool, errorMsg string, tokensUsed int, cost float64, duration time.Duration) (*models.SemanticRequest, error) {
	return s.logSemanticRequestWithConversation(ctx, userID, providerID, reqType, prompt, context, response, generatedSQL, generatedFormula, isValid, errorMsg, tokensUsed, cost, duration, "")
}

// logSemanticRequestWithConversation logs a semantic request with conversation ID and threading
func (s *SemanticService) logSemanticRequestWithConversation(ctx context.Context, userID, providerID, reqType, prompt string, context map[string]interface{}, response string, generatedSQL, generatedFormula *string, isValid bool, errorMsg string, tokensUsed int, cost float64, duration time.Duration, conversationID string) (*models.SemanticRequest, error) {
	var errorPtr *string
	if errorMsg != "" {
		errorPtr = &errorMsg
	}

	var conversationIDPtr *string
	if conversationID != "" {
		conversationIDPtr = &conversationID
	}

	var dataSourceIDPtr *string
	if dsID, ok := context["dataSourceId"].(string); ok && dsID != "" {
		dataSourceIDPtr = &dsID
	}

	// Get message index and parent request ID for conversation threading
	messageIndex := 0
	var parentRequestIDPtr *string
	if conversationID != "" {
		// Find the last message in this conversation
		var lastMessage models.SemanticRequest
		err := s.db.WithContext(ctx).
			Where("conversation_id = ?", conversationID).
			Order("message_index DESC").
			First(&lastMessage).Error

		if err == nil {
			// Found previous message
			messageIndex = lastMessage.MessageIndex + 1
			parentRequestIDPtr = &lastMessage.ID
		}
		// If error (no previous messages), keep messageIndex = 0 and parentRequestIDPtr = nil
	}

	semanticReq := &models.SemanticRequest{
		ID:               uuid.New().String(),
		UserID:           userID,
		ProviderID:       providerID,
		DataSourceID:     dataSourceIDPtr,
		ConversationID:   conversationIDPtr,
		MessageIndex:     messageIndex,
		ParentRequestID:  parentRequestIDPtr,
		Type:             reqType,
		Prompt:           prompt,
		Context:          models.JSONB(context),
		Response:         response,
		GeneratedSQL:     generatedSQL,
		GeneratedFormula: generatedFormula,
		IsValid:          isValid,
		Error:            errorPtr,
		TokensUsed:       tokensUsed,
		Cost:             cost,
		DurationMs:       int(duration.Milliseconds()),
	}

	if err := s.db.WithContext(ctx).Create(semanticReq).Error; err != nil {
		return nil, fmt.Errorf("failed to log semantic request: %w", err)
	}

	return semanticReq, nil
}

// GetSemanticRequests retrieves semantic requests for a user
func (s *SemanticService) GetSemanticRequests(ctx context.Context, userID string, reqType string, limit, offset int) ([]models.SemanticRequest, int64, error) {
	var requests []models.SemanticRequest
	var total int64

	query := s.db.WithContext(ctx).Where("user_id = ?", userID)

	if reqType != "" {
		query = query.Where("type = ?", reqType)
	}

	// Get total count
	if err := query.Model(&models.SemanticRequest{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&requests).Error; err != nil {
		return nil, 0, err
	}

	return requests, total, nil
}

// EstimateCostRequest represents a cost estimation request
type EstimateCostRequest struct {
	Prompt               string `json:"prompt"`
	SystemPrompt         string `json:"systemPrompt"`
	Model                string `json:"model"`
	ExpectedOutputTokens int    `json:"expectedOutputTokens"`
}

// EstimateCostResponse represents a cost estimation response
type EstimateCostResponse struct {
	EstimatedTokens int     `json:"estimatedTokens"`
	EstimatedCost   float64 `json:"estimatedCost"`
	InputTokens     int     `json:"inputTokens"`
	OutputTokens    int     `json:"outputTokens"`
	Model           string  `json:"model"`
}

// EstimateCost estimates the cost of a prompt before sending to AI
func (s *SemanticService) EstimateCost(req EstimateCostRequest) *EstimateCostResponse {
	// Estimate input tokens
	inputTokens := s.tokenCounter.EstimateTokens(req.Prompt, req.Model) +
		s.tokenCounter.EstimateTokens(req.SystemPrompt, req.Model)

	// Use provided expected output tokens or default
	outputTokens := req.ExpectedOutputTokens
	if outputTokens == 0 {
		outputTokens = 150 // Default average response length
	}

	// Calculate cost
	cost := s.tokenCounter.CalculateCost(inputTokens, outputTokens, req.Model)

	return &EstimateCostResponse{
		EstimatedTokens: inputTokens + outputTokens,
		EstimatedCost:   cost,
		InputTokens:     inputTokens,
		OutputTokens:    outputTokens,
		Model:           req.Model,
	}
}

// AnalyzeQueryOptimization analyzes a SQL query and provides optimization suggestions
func (s *SemanticService) AnalyzeQueryOptimization(query string) *QueryAnalysisResult {
	return s.queryOptimizer.AnalyzeQuery(query)
}

// GetAutocompleteSuggestions returns autocomplete suggestions for formula editing
func (s *SemanticService) GetAutocompleteSuggestions(ctx context.Context, req AutocompleteRequest) *AutocompleteResponse {
	return s.formulaAutocomplete.GetSuggestions(ctx, req)
}
