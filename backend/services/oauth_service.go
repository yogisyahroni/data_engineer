package services

import (
	"context"
	"fmt"

	"insight-engine-backend/models"
	"insight-engine-backend/services/providers"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

/**
 * OAuth Service with Provider Registry Pattern
 *
 * Manages multiple OAuth/OIDC/SAML providers through a registry pattern.
 * Each provider implements the OAuthProvider interface, allowing clean
 * separation of provider-specific logic.
 *
 * Supported providers: Google, Azure AD, Okta, SAML 2.0
 */

// OAuthService handles OAuth authentication across multiple providers
type OAuthService struct {
	db        *gorm.DB
	providers map[string]providers.OAuthProvider
}

// NewOAuthService creates a new OAuth service with provider registry
func NewOAuthService(db *gorm.DB) *OAuthService {
	service := &OAuthService{
		db:        db,
		providers: make(map[string]providers.OAuthProvider),
	}

	// Register Google provider by default
	googleProvider := providers.NewGoogleProvider()
	if googleProvider.IsConfigured() {
		service.RegisterProvider(googleProvider)
		LogInfo("oauth_provider_registered", "Google OAuth provider registered", map[string]interface{}{
			"provider": "google",
		})
	}

	// Additional providers (register if configured):

	// Azure AD (TASK-082)
	azureProvider := providers.NewAzureADProvider()
	if azureProvider.IsConfigured() {
		service.RegisterProvider(azureProvider)
		LogInfo("oauth_provider_registered", "Azure AD OAuth provider registered", map[string]interface{}{"provider": "azure_ad"})
	}

	// Okta (TASK-083)
	oktaProvider := providers.NewOktaProvider()
	if oktaProvider.IsConfigured() {
		service.RegisterProvider(oktaProvider)
		LogInfo("oauth_provider_registered", "Okta OAuth provider registered", map[string]interface{}{"provider": "okta"})
	}

	// SAML 2.0 (TASK-084)
	samlProvider, err := providers.NewSAMLProvider()
	if err == nil && samlProvider.IsConfigured() {
		service.RegisterProvider(samlProvider)
		LogInfo("oauth_provider_registered", "SAML 2.0 provider registered", map[string]interface{}{"provider": "saml"})
	} else if err != nil {
		LogWarn("saml_init_failed", "SAML provider initialization failed", map[string]interface{}{"error": err.Error()})
	}

	return service
}

// RegisterProvider registers an OAuth provider
func (s *OAuthService) RegisterProvider(provider providers.OAuthProvider) {
	s.providers[provider.GetProviderName()] = provider
}

// GetProvider retrieves a registered provider by name
func (s *OAuthService) GetProvider(name string) (providers.OAuthProvider, error) {
	provider, ok := s.providers[name]
	if !ok {
		return nil, fmt.Errorf("oauth provider '%s' not found or not configured", name)
	}
	return provider, nil
}

// ListProviders returns the names of all registered providers
func (s *OAuthService) ListProviders() []string {
	providerNames := make([]string, 0, len(s.providers))
	for name := range s.providers {
		providerNames = append(providerNames, name)
	}
	return providerNames
}

// GetAuthURL returns the authorization URL for a provider
func (s *OAuthService) GetAuthURL(providerName, state string) (string, error) {
	provider, err := s.GetProvider(providerName)
	if err != nil {
		return "", err
	}
	return provider.GetAuthURL(state), nil
}

// HandleCallback processes OAuth callback for any provider
// Returns user and JWT token
func (s *OAuthService) HandleCallback(ctx context.Context, providerName, code string) (*models.User, string, error) {
	// Get provider
	provider, err := s.GetProvider(providerName)
	if err != nil {
		return nil, "", err
	}

	// Exchange code for user info using provider
	userInfo, err := provider.HandleCallback(ctx, code)
	if err != nil {
		LogError("oauth_callback_failed", err.Error(), map[string]interface{}{
			"provider": providerName,
		})
		return nil, "", fmt.Errorf("failed to process OAuth callback: %w", err)
	}

	// Find or create user
	user, err := s.FindOrCreateUser(userInfo)
	if err != nil {
		LogError("oauth_user_creation_failed", err.Error(), map[string]interface{}{
			"provider": providerName,
			"email":    userInfo.Email,
		})
		return nil, "", fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	jwtToken, err := GenerateJWT(user.ID, user.Email)
	if err != nil {
		LogError("oauth_jwt_generation_failed", err.Error(), map[string]interface{}{
			"user_id": user.ID,
		})
		return nil, "", fmt.Errorf("failed to generate JWT: %w", err)
	}

	LogInfo("oauth_login_success", "User logged in via OAuth", map[string]interface{}{
		"provider": providerName,
		"user_id":  user.ID,
		"email":    user.Email,
	})

	return user, jwtToken, nil
}

// FindOrCreateUser finds existing user or creates new one from provider user info
// Business logic: Links accounts by provider ID or email
func (s *OAuthService) FindOrCreateUser(userInfo *providers.ProviderUserInfo) (*models.User, error) {
	var user models.User

	// Try to find user by provider + provider_id
	err := s.db.Where("provider = ? AND provider_id = ?", userInfo.Provider, userInfo.ProviderID).
		First(&user).Error

	if err == nil {
		// User found by provider ID - return existing user
		LogInfo("oauth_user_found", "Existing user found by provider ID", map[string]interface{}{
			"provider":    userInfo.Provider,
			"provider_id": userInfo.ProviderID,
			"user_id":     user.ID,
		})
		return &user, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("database error while finding user: %w", err)
	}

	// Try to find user by email (link existing account)
	err = s.db.Where("email = ?", userInfo.Email).First(&user).Error
	if err == nil {
		// User found by email - link OAuth provider to existing account
		user.Provider = userInfo.Provider
		user.ProviderID = userInfo.ProviderID
		user.EmailVerified = userInfo.EmailVerified // Update verification status

		if err := s.db.Save(&user).Error; err != nil {
			return nil, fmt.Errorf("failed to link OAuth provider to existing account: %w", err)
		}

		LogInfo("oauth_account_linked", "OAuth provider linked to existing account", map[string]interface{}{
			"provider": userInfo.Provider,
			"user_id":  user.ID,
			"email":    userInfo.Email,
		})

		return &user, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("database error while finding user by email: %w", err)
	}

	// Create new user
	user = models.User{
		ID:            uuid.New().String(),
		Email:         userInfo.Email,
		Username:      generateUsernameFromEmail(userInfo.Email),
		Name:          userInfo.Name,
		Provider:      userInfo.Provider,
		ProviderID:    userInfo.ProviderID,
		EmailVerified: userInfo.EmailVerified,
		// Password is empty for OAuth users - they can set it later if needed
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create new user: %w", err)
	}

	LogInfo("oauth_user_created", "New user created via OAuth", map[string]interface{}{
		"provider": userInfo.Provider,
		"user_id":  user.ID,
		"email":    userInfo.Email,
	})

	return &user, nil
}

// generateUsernameFromEmail extracts username from email and adds unique suffix
func generateUsernameFromEmail(email string) string {
	// Extract local part of email (before @)
	username := email
	for i, c := range email {
		if c == '@' {
			username = email[:i]
			break
		}
	}

	// Add short UUID suffix to ensure uniqueness
	return username + "_" + uuid.New().String()[:8]
}

// DEPRECATED METHODS - Kept for backward compatibility
// These will be removed in next major version

// GetGoogleAuthURL returns the Google OAuth authorization URL
// DEPRECATED: Use GetAuthURL("google", state) instead
func (s *OAuthService) GetGoogleAuthURL(state string) string {
	url, _ := s.GetAuthURL("google", state)
	return url
}

// HandleGoogleCallback handles the OAuth callback from Google
// DEPRECATED: Use HandleCallback(ctx, "google", code) instead
func (s *OAuthService) HandleGoogleCallback(code string) (*models.User, string, error) {
	return s.HandleCallback(context.Background(), "google", code)
}

// IsGoogleConfigured checks if Google OAuth is configured
// DEPRECATED: Check if "google" exists in ListProviders() instead
func (s *OAuthService) IsGoogleConfigured() bool {
	provider, err := s.GetProvider("google")
	return err == nil && provider.IsConfigured()
}
