package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/microsoft"
)

/**
 * Azure AD OAuth Provider (TASK-082)
 *
 * Implements OAuthProvider interface for Microsoft Azure Active Directory OAuth 2.0
 * Supports multi-tenant authentication (common), organizational accounts, and specific tenants
 */

// AzureADProvider handles Azure AD OAuth authentication
type AzureADProvider struct {
	config *oauth2.Config
	tenant string
}

// AzureADUserInfo represents the response from Microsoft Graph API /me endpoint
type AzureADUserInfo struct {
	ID                string `json:"id"`                // Azure Object ID
	Mail              string `json:"mail"`              // Primary email (may be null)
	UserPrincipalName string `json:"userPrincipalName"` // UPN (always present)
	DisplayName       string `json:"displayName"`       // Full name
	GivenName         string `json:"givenName"`         // First name
	Surname           string `json:"surname"`           // Last name
	PreferredLanguage string `json:"preferredLanguage"` // Locale
}

// NewAzureADProvider creates a new Azure AD OAuth provider
func NewAzureADProvider() *AzureADProvider {
	tenant := os.Getenv("AZURE_TENANT")
	if tenant == "" {
		tenant = "common" // Default to multi-tenant
	}

	// Azure AD v2.0 endpoints
	// https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize
	// https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
	endpoint := microsoft.AzureADEndpoint(tenant)

	config := &oauth2.Config{
		ClientID:     os.Getenv("AZURE_CLIENT_ID"),
		ClientSecret: os.Getenv("AZURE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("AZURE_REDIRECT_URL"),
		Scopes: []string{
			"openid",    // OIDC
			"profile",   // User profile
			"email",     // Email address
			"User.Read", // Read user profile via Graph API
		},
		Endpoint: endpoint,
	}

	return &AzureADProvider{
		config: config,
		tenant: tenant,
	}
}

// GetAuthURL returns the Azure AD OAuth authorization URL
func (p *AzureADProvider) GetAuthURL(state string) string {
	return p.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// HandleCallback processes the OAuth callback from Azure AD
func (p *AzureADProvider) HandleCallback(ctx context.Context, code string) (*ProviderUserInfo, error) {
	// Exchange authorization code for access token
	token, err := p.config.Exchange(ctx, code)
	if err != nil {
		return nil, NewOAuthError("azure_ad", "token_exchange", "failed to exchange code for token", err)
	}

	// Create HTTP client with the access token
	client := p.config.Client(ctx, token)

	// Fetch user info from Microsoft Graph API
	resp, err := client.Get("https://graph.microsoft.com/v1.0/me")
	if err != nil {
		return nil, NewOAuthError("azure_ad", "user_info", "failed to fetch user info from Graph API", err)
	}
	defer resp.Body.Close()

	// Check HTTP status
	if resp.StatusCode != http.StatusOK {
		return nil, NewOAuthError("azure_ad", "user_info",
			fmt.Sprintf("unexpected status code: %d", resp.StatusCode), nil)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, NewOAuthError("azure_ad", "user_info", "failed to read response body", err)
	}

	// Parse user info
	var azureUser AzureADUserInfo
	if err := json.Unmarshal(body, &azureUser); err != nil {
		return nil, NewOAuthError("azure_ad", "user_info", "failed to parse user info", err)
	}

	// Determine email: prefer 'mail' but fall back to 'userPrincipalName'
	email := azureUser.Mail
	if email == "" {
		email = azureUser.UserPrincipalName
	}

	// Map to standard ProviderUserInfo
	return &ProviderUserInfo{
		ProviderID:    azureUser.ID,
		Email:         email,
		EmailVerified: true, // Azure AD emails are verified
		Name:          azureUser.DisplayName,
		GivenName:     azureUser.GivenName,
		FamilyName:    azureUser.Surname,
		Picture:       "", // Azure Graph API requires separate call for photo
		Provider:      "azure_ad",
		Locale:        azureUser.PreferredLanguage,
	}, nil
}

// GetProviderName returns "azure_ad"
func (p *AzureADProvider) GetProviderName() string {
	return "azure_ad"
}

// IsConfigured checks if Azure AD OAuth is properly configured
func (p *AzureADProvider) IsConfigured() bool {
	return p.config.ClientID != "" && p.config.ClientSecret != "" && p.config.RedirectURL != ""
}
