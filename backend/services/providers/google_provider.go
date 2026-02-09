package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

/**
 * Google OAuth Provider
 *
 * Implements OAuthProvider interface for Google OAuth 2.0
 * Uses Google's OIDC implementation for user authentication
 */

// GoogleProvider handles Google OAuth authentication
type GoogleProvider struct {
	config *oauth2.Config
}

// GoogleUserInfo represents the response from Google's userinfo endpoint
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale"`
}

// NewGoogleProvider creates a new Google OAuth provider
func NewGoogleProvider() *GoogleProvider {
	config := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &GoogleProvider{
		config: config,
	}
}

// GetAuthURL returns the Google OAuth authorization URL
func (p *GoogleProvider) GetAuthURL(state string) string {
	return p.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// HandleCallback processes the OAuth callback from Google
func (p *GoogleProvider) HandleCallback(ctx context.Context, code string) (*ProviderUserInfo, error) {
	// Exchange authorization code for access token
	token, err := p.config.Exchange(ctx, code)
	if err != nil {
		return nil, NewOAuthError("google", "token_exchange", "failed to exchange code for token", err)
	}

	// Create HTTP client with the access token
	client := p.config.Client(ctx, token)

	// Fetch user info from Google
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, NewOAuthError("google", "user_info", "failed to fetch user info", err)
	}
	defer resp.Body.Close()

	// Check HTTP status
	if resp.StatusCode != http.StatusOK {
		return nil, NewOAuthError("google", "user_info",
			fmt.Sprintf("unexpected status code: %d", resp.StatusCode), nil)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, NewOAuthError("google", "user_info", "failed to read response body", err)
	}

	// Parse user info
	var googleUser GoogleUserInfo
	if err := json.Unmarshal(body, &googleUser); err != nil {
		return nil, NewOAuthError("google", "user_info", "failed to parse user info", err)
	}

	// Map to standard ProviderUserInfo
	return &ProviderUserInfo{
		ProviderID:    googleUser.ID,
		Email:         googleUser.Email,
		EmailVerified: googleUser.VerifiedEmail,
		Name:          googleUser.Name,
		GivenName:     googleUser.GivenName,
		FamilyName:    googleUser.FamilyName,
		Picture:       googleUser.Picture,
		Provider:      "google",
		Locale:        googleUser.Locale,
	}, nil
}

// GetProviderName returns "google"
func (p *GoogleProvider) GetProviderName() string {
	return "google"
}

// IsConfigured checks if Google OAuth is properly configured
func (p *GoogleProvider) IsConfigured() bool {
	return p.config.ClientID != "" && p.config.ClientSecret != "" && p.config.RedirectURL != ""
}
