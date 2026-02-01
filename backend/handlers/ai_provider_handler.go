package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// AIProviderHandler handles AI provider operations
type AIProviderHandler struct {
	encryptionService *services.EncryptionService
}

// NewAIProviderHandler creates a new AI provider handler
func NewAIProviderHandler(encryptionService *services.EncryptionService) *AIProviderHandler {
	return &AIProviderHandler{
		encryptionService: encryptionService,
	}
}

// GetProviders lists all providers for the user
func (h *AIProviderHandler) GetProviders(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var providers []models.AIProvider
	if err := database.DB.Where("user_id = ?", userID).Find(&providers).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Mask API keys
	for i := range providers {
		providers[i].APIKeyMasked = h.encryptionService.MaskAPIKey(providers[i].APIKeyEncrypted)
	}

	return c.JSON(providers)
}

// CreateProvider creates a new AI provider
func (h *AIProviderHandler) CreateProvider(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		Name         string                 `json:"name"`
		ProviderType string                 `json:"providerType"`
		BaseURL      *string                `json:"baseUrl"`
		APIKey       string                 `json:"apiKey"` // Plaintext, will be encrypted
		Model        string                 `json:"model"`
		IsDefault    bool                   `json:"isDefault"`
		Config       map[string]interface{} `json:"config"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate required fields
	if input.Name == "" || input.ProviderType == "" || input.APIKey == "" || input.Model == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name, provider type, API key, and model are required"})
	}

	// Encrypt API key
	encryptedKey, err := h.encryptionService.Encrypt(input.APIKey)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to encrypt API key"})
	}

	// If setting as default, unset other defaults
	if input.IsDefault {
		database.DB.Model(&models.AIProvider{}).Where("user_id = ?", userID).Update("is_default", false)
	}

	// Create provider
	provider := models.AIProvider{
		ID:              uuid.New().String(),
		UserID:          userID,
		Name:            input.Name,
		ProviderType:    input.ProviderType,
		BaseURL:         input.BaseURL,
		APIKeyEncrypted: encryptedKey,
		Model:           input.Model,
		IsActive:        true,
		IsDefault:       input.IsDefault,
		Config:          models.JSONB(input.Config),
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := database.DB.Create(&provider).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Mask API key before returning
	provider.APIKeyMasked = h.encryptionService.MaskAPIKey(input.APIKey)

	return c.Status(201).JSON(provider)
}

// GetProvider gets a single provider
func (h *AIProviderHandler) GetProvider(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	var provider models.AIProvider
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&provider).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Provider not found"})
	}

	// Mask API key
	provider.APIKeyMasked = h.encryptionService.MaskAPIKey(provider.APIKeyEncrypted)

	return c.JSON(provider)
}

// UpdateProvider updates a provider
func (h *AIProviderHandler) UpdateProvider(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	var input struct {
		Name      *string                `json:"name"`
		BaseURL   *string                `json:"baseUrl"`
		APIKey    *string                `json:"apiKey"` // Optional, only if changing
		Model     *string                `json:"model"`
		IsActive  *bool                  `json:"isActive"`
		IsDefault *bool                  `json:"isDefault"`
		Config    map[string]interface{} `json:"config"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Get existing provider
	var provider models.AIProvider
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&provider).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Provider not found"})
	}

	// Update fields
	if input.Name != nil {
		provider.Name = *input.Name
	}
	if input.BaseURL != nil {
		provider.BaseURL = input.BaseURL
	}
	if input.Model != nil {
		provider.Model = *input.Model
	}
	if input.IsActive != nil {
		provider.IsActive = *input.IsActive
	}
	if input.IsDefault != nil && *input.IsDefault {
		// Unset other defaults
		database.DB.Model(&models.AIProvider{}).Where("user_id = ?", userID).Update("is_default", false)
		provider.IsDefault = true
	}
	if input.Config != nil {
		provider.Config = models.JSONB(input.Config)
	}

	// Re-encrypt API key if provided
	if input.APIKey != nil && *input.APIKey != "" {
		encryptedKey, err := h.encryptionService.Encrypt(*input.APIKey)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to encrypt API key"})
		}
		provider.APIKeyEncrypted = encryptedKey
	}

	provider.UpdatedAt = time.Now()

	if err := database.DB.Save(&provider).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Mask API key
	provider.APIKeyMasked = h.encryptionService.MaskAPIKey(provider.APIKeyEncrypted)

	return c.JSON(provider)
}

// DeleteProvider deletes a provider
func (h *AIProviderHandler) DeleteProvider(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Verify ownership
	var provider models.AIProvider
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&provider).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Provider not found"})
	}

	// Delete provider
	if err := database.DB.Delete(&provider).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Provider deleted successfully"})
}

// TestProvider tests a provider connection
func (h *AIProviderHandler) TestProvider(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	id := c.Params("id")

	// Create AI service
	aiService := services.NewAIService(h.encryptionService)

	// Test provider
	if err := aiService.TestProvider(c.Context(), id, userID); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Provider connection successful",
	})
}
