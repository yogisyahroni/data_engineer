package services

import (
	"context"
	"fmt"
	"time"

	"insight-engine-backend/models"
)

// StreamingService handles SSE streaming for AI responses
type StreamingService struct {
	semanticService *SemanticService
}

// NewStreamingService creates a new streaming service
func NewStreamingService(semanticService *SemanticService) *StreamingService {
	return &StreamingService{
		semanticService: semanticService,
	}
}

// StreamEvent represents a single SSE event
type StreamEvent struct {
	Type     string                 `json:"type"`     // "token", "done", "error"
	Content  string                 `json:"content"`  // The actual content
	Metadata map[string]interface{} `json:"metadata"` // Additional metadata
}

// StreamChatRequest represents a streaming chat request
type StreamChatRequest struct {
	UserID         string
	ProviderID     string
	Message        string
	ConversationID string
	Context        map[string]interface{}
}

// StreamChat streams AI chat responses token by token
func (s *StreamingService) StreamChat(ctx context.Context, req StreamChatRequest) (<-chan string, error) {
	eventChan := make(chan string, 10)

	go func() {
		defer close(eventChan)

		// For now, use the existing semantic service Chat method
		// In the future, this can be enhanced to support actual token-by-token streaming
		result, err := s.semanticService.Chat(ctx, req.UserID, req.ProviderID, req.Message, req.ConversationID, req.Context)
		if err != nil {
			eventChan <- fmt.Sprintf("Error: %s", err.Error())
			return
		}

		// Extract the response from the SemanticRequest result
		if result != nil && result.Response != "" {
			response := result.Response
			// Simulate streaming by sending the response in chunks
			// In a real implementation, this would come from the AI provider's streaming API
			chunkSize := 10
			for i := 0; i < len(response); i += chunkSize {
				select {
				case <-ctx.Done():
					return
				default:
					end := i + chunkSize
					if end > len(response) {
						end = len(response)
					}
					eventChan <- response[i:end]
					time.Sleep(50 * time.Millisecond) // Simulate network delay
				}
			}
		}
	}()

	return eventChan, nil
}

// StreamQueryGeneration streams SQL query generation
func (s *StreamingService) StreamQueryGeneration(ctx context.Context, userID, providerID, prompt, dataSourceID string) (<-chan string, error) {
	eventChan := make(chan string, 10)

	go func() {
		defer close(eventChan)

		result, err := s.semanticService.GenerateQuery(ctx, userID, providerID, prompt, dataSourceID)
		if err != nil {
			eventChan <- fmt.Sprintf("Error: %s", err.Error())
			return
		}

		// Extract and stream the generated query
		if result != nil && result.Response != "" {
			query := result.Response
			// Send the query in chunks
			chunkSize := 20
			for i := 0; i < len(query); i += chunkSize {
				select {
				case <-ctx.Done():
					return
				default:
					end := i + chunkSize
					if end > len(query) {
						end = len(query)
					}
					eventChan <- query[i:end]
					time.Sleep(30 * time.Millisecond)
				}
			}
		}
	}()

	return eventChan, nil
}

// TrackStreamingRequest logs a streaming request for analytics
func (s *StreamingService) TrackStreamingRequest(req *models.AIUsageRequest) error {
	// This would integrate with UsageTracker
	// For now, it's a placeholder
	return nil
}
