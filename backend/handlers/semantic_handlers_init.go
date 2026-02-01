package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
)

var (
	semanticHandler *SemanticHandler
)

// InitSemanticHandlers initializes semantic handlers
func InitSemanticHandlers(aiService *services.AIService) {
	semanticService := services.NewSemanticService(database.DB, aiService)
	streamingService := services.NewStreamingService(semanticService)
	usageTracker := services.NewUsageTracker(database.DB)
	semanticHandler = NewSemanticHandler(semanticService, streamingService, usageTracker)
}

// Semantic handler wrappers for main.go

var SemanticExplainData = func(c *fiber.Ctx) error {
	return semanticHandler.ExplainData(c)
}

var SemanticGenerateQuery = func(c *fiber.Ctx) error {
	return semanticHandler.GenerateQuery(c)
}

var SemanticGenerateFormula = func(c *fiber.Ctx) error {
	return semanticHandler.GenerateFormula(c)
}

var SemanticChat = func(c *fiber.Ctx) error {
	return semanticHandler.Chat(c)
}

var SemanticGetRequests = func(c *fiber.Ctx) error {
	return semanticHandler.GetSemanticRequests(c)
}

var SemanticGetRequest = func(c *fiber.Ctx) error {
	return semanticHandler.GetSemanticRequest(c)
}

var SemanticChatStream = func(c *fiber.Ctx) error {
	return semanticHandler.ChatStream(c)
}

var SemanticEstimateCost = func(c *fiber.Ctx) error {
	return semanticHandler.EstimateCost(c)
}

var SemanticAnalyzeQuery = func(c *fiber.Ctx) error {
	return semanticHandler.AnalyzeQueryOptimization(c)
}

var SemanticFormulaAutocomplete = func(c *fiber.Ctx) error {
	return semanticHandler.FormulaAutocomplete(c)
}
