package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/url"
	"os"
	"time"

	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
)

/**
 * OAuth Handler
 *
 * Handles OAuth/OIDC/SAML authentication flows for multiple providers
 * Routes:
 *   - GET  /api/auth/:provider           → Redirect to provider auth page
 *   - GET  /api/auth/:provider/callback  → Handle provider callback
 *   - GET  /api/auth/providers           → List enabled providers
 */

// OAuthHandler handles OAuth authentication requests
type OAuthHandler struct {
	oauthService *services.OAuthService
}

// NewOAuthHandler creates a new OAuthHandler
func NewOAuthHandler(oauthService *services.OAuthService) *OAuthHandler {
	return &OAuthHandler{
		oauthService: oauthService,
	}
}

// GetProviders lists all enabled OAuth providers
// GET /api/auth/providers
func (h *OAuthHandler) GetProviders(c *fiber.Ctx) error {
	providers := h.oauthService.ListProviders()

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"providers": providers,
		},
	})
}

// InitiateAuth redirects user to OAuth provider's authorization page
// GET /api/auth/:provider
// Example: GET /api/auth/google
func (h *OAuthHandler) InitiateAuth(c *fiber.Ctx) error {
	provider := c.Params("provider")
	if provider == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Provider parameter is required",
		})
	}

	// Generate secure random state for CSRF protection
	state, err := generateSecureState()
	if err != nil {
		services.LogError("oauth_state_generation_failed", err.Error(), map[string]interface{}{
			"provider": provider,
		})
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to generate authentication state",
		})
	}

	// Store state in session/cookie for verification (expires in 10 minutes)
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Expires:  time.Now().Add(10 * time.Minute),
		HTTPOnly: true,
		Secure:   os.Getenv("GO_ENV") == "production", // HTTPS only in production
		SameSite: "Lax",                               // Allow redirect from OAuth provider
	})

	// Get authorization URL from provider
	authURL, err := h.oauthService.GetAuthURL(provider, state)
	if err != nil {
		services.LogError("oauth_auth_url_failed", err.Error(), map[string]interface{}{
			"provider": provider,
		})
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": fmt.Sprintf("Provider '%s' not found or not configured", provider),
		})
	}

	services.LogInfo("oauth_auth_initiated", "OAuth authentication initiated", map[string]interface{}{
		"provider": provider,
	})

	// Redirect to provider's authorization page
	return c.Redirect(authURL, fiber.StatusTemporaryRedirect)
}

// HandleCallback processes OAuth callback from provider
// GET /api/auth/:provider/callback?code=xxx&state=xxx
// Example: GET /api/auth/google/callback?code=4/xxx&state=yyy
func (h *OAuthHandler) HandleCallback(c *fiber.Ctx) error {
	provider := c.Params("provider")
	code := c.Query("code")
	state := c.Query("state")

	// Check for OAuth error from provider
	if errorParam := c.Query("error"); errorParam != "" {
		errorDescription := c.Query("error_description")
		services.LogError("oauth_provider_error", errorDescription, map[string]interface{}{
			"provider": provider,
			"error":    errorParam,
		})

		// Redirect to frontend with error
		return redirectToFrontend(c, "", fmt.Sprintf("oauth_error: %s", errorParam))
	}

	// Validate required parameters
	if code == "" {
		return redirectToFrontend(c, "", "missing_authorization_code")
	}

	if state == "" {
		return redirectToFrontend(c, "", "missing_state_parameter")
	}

	// Verify state to prevent CSRF attacks
	cookieState := c.Cookies("oauth_state")
	if cookieState == "" || cookieState != state {
		services.LogError("oauth_csrf_detected", "State mismatch or missing", map[string]interface{}{
			"provider":     provider,
			"cookie_state": cookieState,
			"query_state":  state,
		})
		return redirectToFrontend(c, "", "invalid_state")
	}

	// Clear state cookie (one-time use)
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour), // Expire immediately
		HTTPOnly: true,
	})

	// Exchange authorization code for user info
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	user, jwtToken, err := h.oauthService.HandleCallback(ctx, provider, code)
	if err != nil {
		services.LogError("oauth_callback_failed", err.Error(), map[string]interface{}{
			"provider": provider,
		})
		return redirectToFrontend(c, "", "authentication_failed")
	}

	// Success - redirect to frontend with JWT token
	services.LogInfo("oauth_callback_success", "OAuth authentication successful", map[string]interface{}{
		"provider": provider,
		"user_id":  user.ID,
		"email":    user.Email,
	})

	return redirectToFrontend(c, jwtToken, "")
}

// generateSecureState creates a cryptographically secure random state
func generateSecureState() (string, error) {
	b := make([]byte, 32) // 256 bits
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// redirectToFrontend redirects to frontend with JWT token or error
func redirectToFrontend(c *fiber.Ctx, token, errorMsg string) error {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000" // Default for development
	}

	// Build redirect URL
	redirectURL := frontendURL + "/auth/callback"

	// Parse URL to add query parameters
	u, err := url.Parse(redirectURL)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to construct redirect URL",
		})
	}

	query := u.Query()

	if token != "" {
		// Success - include JWT token
		query.Set("token", token)
	} else if errorMsg != "" {
		// Error - include error message
		query.Set("error", errorMsg)
	}

	u.RawQuery = query.Encode()

	// Redirect to frontend
	return c.Redirect(u.String(), fiber.StatusTemporaryRedirect)
}
