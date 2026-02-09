package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"golang.org/x/oauth2"
)

/**
 * Okta OAuth Provider (TASK-083)
 *
 * Implements OAuthProvider interface for Okta OAuth 2.0 / OIDC
 * Supports custom Okta domains and authorization servers
 */

// OktaProvider handles Okta OAuth authentication
type OktaProvider struct {
	config     *oauth2.Config
	domain     string
	authServer string
}

// OktaUserInfo represents the response from Okta's userinfo endpoint
type OktaUserInfo struct {
	Sub               string `json:"sub"`                // Okta user ID
	Name              string `json:"name"`               // Full name
	GivenName         string `json:"given_name"`         // First name
	FamilyName        string `json:"family_name"`        // Last name
	Email             string `json:"email"`              // Email address
	EmailVerified     bool   `json:"email_verified"`     // Email verification status
	PreferredUsername string `json:"preferred_username"` // Username (usually email)
	Locale            string `json:"locale"`             // Locale
	ZoneInfo          string `json:"zoneinfo"`           // Timezone
	UpdatedAt         int64  `json:"updated_at"`         // Last update timestamp
}

// NewOktaProvider creates a new Okta OAuth provider
func NewOktaProvider() *OktaProvider {
	domain := os.Getenv("OKTA_DOMAIN")
	authServer := os.Getenv("OKTA_AUTH_SERVER_ID")

	if authServer == "" {
		authServer = "default" // Use default authorization server
	}

	// Build Okta OAuth endpoints
	// https://{domain}/oauth2/{authServerId}/v1/authorize
	// https://{domain}/oauth2/{authServerId}/v1/token
	authURL := fmt.Sprintf("https://%s/oauth2/%s/v1/authorize", domain, authServer)
	tokenURL := fmt.Sprintf("https://%s/oauth2/%s/v1/token", domain, authServer)

	config := &oauth2.Config{
		ClientID:     os.Getenv("OKTA_CLIENT_ID"),
		ClientSecret: os.Getenv("OKTA_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("OKTA_REDIRECT_URL"),
		Scopes: []string{
			"openid",  // OIDC
			"profile", // User profile
			"email",   // Email address
		},
		Endpoint: oauth2.Endpoint{
			AuthURL:  authURL,
			TokenURL: tokenURL,
		},
	}

	return &OktaProvider{
		config:     config,
		domain:     domain,
		authServer: authServer,
	}
}

// GetAuthURL returns the Okta OAuth authorization URL
func (p *OktaProvider) GetAuthURL(state string) string {
	return p.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// HandleCallback processes the OAuth callback from Okta
func (p *OktaProvider) HandleCallback(ctx context.Context, code string) (*ProviderUserInfo, error) {
	// Exchange authorization code for access token
	token, err := p.config.Exchange(ctx, code)
	if err != nil {
		return nil, NewOAuthError("okta", "token_exchange", "failed to exchange code for token", err)
	}

	// Create HTTP client with the access token
	client := p.config.Client(ctx, token)

	// Fetch user info from Okta userinfo endpoint
	userInfoURL := fmt.Sprintf("https://%s/oauth2/%s/v1/userinfo", p.domain, p.authServer)
	resp, err := client.Get(userInfoURL)
	if err != nil {
		return nil, NewOAuthError("okta", "user_info", "failed to fetch user info", err)
	}
	defer resp.Body.Close()

	// Check HTTP status
	if resp.StatusCode != http.StatusOK {
		return nil, NewOAuthError("okta", "user_info",
			fmt.Sprintf("unexpected status code: %d", resp.StatusCode), nil)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, NewOAuthError("okta", "user_info", "failed to read response body", err)
	}

	// Parse user info
	var oktaUser OktaUserInfo
	if err := json.Unmarshal(body, &oktaUser); err != nil {
		return nil, NewOAuthError("okta", "user_info", "failed to parse user info", err)
	}

	// Map to standard ProviderUserInfo
	return &ProviderUserInfo{
		ProviderID:    oktaUser.Sub,
		Email:         oktaUser.Email,
		EmailVerified: oktaUser.EmailVerified,
		Name:          oktaUser.Name,
		GivenName:     oktaUser.GivenName,
		FamilyName:    oktaUser.FamilyName,
		Picture:       "", // Okta userinfo doesn't include picture by default
		Provider:      "okta",
		Locale:        oktaUser.Locale,
		AdditionalClaims: map[string]interface{}{
			"preferred_username": oktaUser.PreferredUsername,
			"zoneinfo":           oktaUser.ZoneInfo,
		},
	}, nil
}

// GetProviderName returns "okta"
func (p *OktaProvider) GetProviderName() string {
	return "okta"
}

// IsConfigured checks if Okta OAuth is properly configured
func (p *OktaProvider) IsConfigured() bool {
	return p.config.ClientID != "" && p.config.ClientSecret != "" &&
		p.config.RedirectURL != "" && p.domain != ""
}
