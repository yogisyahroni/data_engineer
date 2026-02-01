package handlers

import (
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
)

// Global AI handlers (initialized in main.go)
var (
	aiProviderHandler *AIProviderHandler
	aiHandler         *AIHandler
)

// InitAIHandlers initializes AI handlers with encryption service
func InitAIHandlers(encryptionService *services.EncryptionService) {
	aiProviderHandler = NewAIProviderHandler(encryptionService)
	aiService := services.NewAIService(encryptionService)
	aiHandler = NewAIHandler(aiService)
}

// AI Provider Handler Wrappers
var GetAIProviders = func(c *fiber.Ctx) error {
	return aiProviderHandler.GetProviders(c)
}

var CreateAIProvider = func(c *fiber.Ctx) error {
	return aiProviderHandler.CreateProvider(c)
}

var GetAIProvider = func(c *fiber.Ctx) error {
	return aiProviderHandler.GetProvider(c)
}

var UpdateAIProvider = func(c *fiber.Ctx) error {
	return aiProviderHandler.UpdateProvider(c)
}

var DeleteAIProvider = func(c *fiber.Ctx) error {
	return aiProviderHandler.DeleteProvider(c)
}

var TestAIProvider = func(c *fiber.Ctx) error {
	return aiProviderHandler.TestProvider(c)
}

// AI Handler Wrappers
var GenerateAI = func(c *fiber.Ctx) error {
	return aiHandler.Generate(c)
}

var GetAIRequests = func(c *fiber.Ctx) error {
	return aiHandler.GetRequests(c)
}

var GetAIRequest = func(c *fiber.Ctx) error {
	return aiHandler.GetRequest(c)
}

var GetAIStats = func(c *fiber.Ctx) error {
	return aiHandler.GetUsageStats(c)
}
