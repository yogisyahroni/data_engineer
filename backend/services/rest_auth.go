package services

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/oauth2"
)

// RESTAuthService handles authentication for REST APIs
type RESTAuthService struct {
	// OAuth2 token cache
	tokenCache map[string]*oauth2.Token
}

// NewRESTAuthService creates a new REST auth service
func NewRESTAuthService() *RESTAuthService {
	return &RESTAuthService{
		tokenCache: make(map[string]*oauth2.Token),
	}
}

// ApplyAuth applies authentication to HTTP request
func (ras *RESTAuthService) ApplyAuth(req *http.Request, config *RESTConnectorConfig) error {
	switch config.AuthType {
	case "none", "":
		// No authentication
		return nil

	case "api_key":
		return ras.applyAPIKey(req, config)

	case "basic":
		return ras.applyBasicAuth(req, config)

	case "bearer":
		return ras.applyBearerToken(req, config)

	case "oauth2":
		return ras.applyOAuth2(req, config)

	case "custom":
		return ras.applyCustomAuth(req, config)

	default:
		return fmt.Errorf("unsupported auth type: %s", config.AuthType)
	}
}

// applyAPIKey applies API key authentication
func (ras *RESTAuthService) applyAPIKey(req *http.Request, config *RESTConnectorConfig) error {
	apiKey := config.AuthConfig["api_key"]
	if apiKey == "" {
		return fmt.Errorf("api_key is required for API key auth")
	}

	location := config.AuthConfig["location"]
	if location == "" {
		location = "header" // Default to header
	}

	paramName := config.AuthConfig["param_name"]
	if paramName == "" {
		paramName = "X-API-Key" // Default header name
	}

	switch location {
	case "header":
		req.Header.Set(paramName, apiKey)

	case "query":
		q := req.URL.Query()
		q.Set(paramName, apiKey)
		req.URL.RawQuery = q.Encode()

	default:
		return fmt.Errorf("unsupported API key location: %s", location)
	}

	return nil
}

// applyBasicAuth applies HTTP Basic authentication
func (ras *RESTAuthService) applyBasicAuth(req *http.Request, config *RESTConnectorConfig) error {
	username := config.AuthConfig["username"]
	password := config.AuthConfig["password"]

	if username == "" {
		return fmt.Errorf("username is required for Basic auth")
	}

	// Encode credentials
	credentials := username + ":" + password
	encoded := base64.StdEncoding.EncodeToString([]byte(credentials))

	req.Header.Set("Authorization", "Basic "+encoded)

	return nil
}

// applyBearerToken applies Bearer token authentication
func (ras *RESTAuthService) applyBearerToken(req *http.Request, config *RESTConnectorConfig) error {
	token := config.AuthConfig["token"]
	if token == "" {
		return fmt.Errorf("token is required for Bearer auth")
	}

	req.Header.Set("Authorization", "Bearer "+token)

	return nil
}

// applyOAuth2 applies OAuth2 authentication
func (ras *RESTAuthService) applyOAuth2(req *http.Request, config *RESTConnectorConfig) error {
	// Get OAuth2 config
	clientID := config.AuthConfig["client_id"]
	clientSecret := config.AuthConfig["client_secret"]
	tokenURL := config.AuthConfig["token_url"]
	grantType := config.AuthConfig["grant_type"]

	if clientID == "" || clientSecret == "" || tokenURL == "" {
		return fmt.Errorf("client_id, client_secret, and token_url are required for OAuth2")
	}

	if grantType == "" {
		grantType = "client_credentials"
	}

	// Check token cache
	cacheKey := config.ID.String()
	if cachedToken, exists := ras.tokenCache[cacheKey]; exists {
		if cachedToken.Valid() {
			req.Header.Set("Authorization", "Bearer "+cachedToken.AccessToken)
			return nil
		}
	}

	// Get new token
	token, err := ras.fetchOAuth2Token(clientID, clientSecret, tokenURL, grantType, config.AuthConfig)
	if err != nil {
		return fmt.Errorf("failed to fetch OAuth2 token: %w", err)
	}

	// Cache token
	ras.tokenCache[cacheKey] = token

	// Apply to request
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	return nil
}

// fetchOAuth2Token fetches an OAuth2 token
func (ras *RESTAuthService) fetchOAuth2Token(
	clientID, clientSecret, tokenURL, grantType string,
	config map[string]string,
) (*oauth2.Token, error) {
	// Build OAuth2 config
	oauthConfig := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint: oauth2.Endpoint{
			TokenURL: tokenURL,
		},
	}

	// Get token based on grant type
	var token *oauth2.Token
	var err error

	switch grantType {
	case "client_credentials":
		// For client credentials flow
		tokenSource := oauthConfig.TokenSource(nil, nil)
		token, err = tokenSource.Token()

	case "password":
		username := config["username"]
		password := config["password"]
		if username == "" || password == "" {
			return nil, fmt.Errorf("username and password required for password grant")
		}
		token, err = oauthConfig.PasswordCredentialsToken(nil, username, password)

	case "refresh_token":
		refreshToken := config["refresh_token"]
		if refreshToken == "" {
			return nil, fmt.Errorf("refresh_token required for refresh token grant")
		}

		token = &oauth2.Token{
			RefreshToken: refreshToken,
		}
		tokenSource := oauthConfig.TokenSource(nil, token)
		token, err = tokenSource.Token()

	default:
		return nil, fmt.Errorf("unsupported grant type: %s", grantType)
	}

	if err != nil {
		return nil, err
	}

	return token, nil
}

// applyCustomAuth applies custom authentication headers
func (ras *RESTAuthService) applyCustomAuth(req *http.Request, config *RESTConnectorConfig) error {
	// Custom headers from auth config
	for key, value := range config.AuthConfig {
		if strings.HasPrefix(key, "header_") {
			headerName := strings.TrimPrefix(key, "header_")
			req.Header.Set(headerName, value)
		}
	}

	return nil
}

// ValidateAuthConfig validates authentication configuration
func (ras *RESTAuthService) ValidateAuthConfig(authType string, authConfig map[string]string) error {
	switch authType {
	case "none", "":
		return nil

	case "api_key":
		if authConfig["api_key"] == "" {
			return fmt.Errorf("api_key is required")
		}

	case "basic":
		if authConfig["username"] == "" {
			return fmt.Errorf("username is required")
		}

	case "bearer":
		if authConfig["token"] == "" {
			return fmt.Errorf("token is required")
		}

	case "oauth2":
		required := []string{"client_id", "client_secret", "token_url"}
		for _, field := range required {
			if authConfig[field] == "" {
				return fmt.Errorf("%s is required for OAuth2", field)
			}
		}

	case "custom":
		// Custom auth is flexible, no strict validation

	default:
		return fmt.Errorf("unsupported auth type: %s", authType)
	}

	return nil
}

// ClearTokenCache clears the OAuth2 token cache
func (ras *RESTAuthService) ClearTokenCache(configID string) {
	delete(ras.tokenCache, configID)
}

// RefreshOAuth2Token manually refreshes an OAuth2 token
func (ras *RESTAuthService) RefreshOAuth2Token(config *RESTConnectorConfig) (*oauth2.Token, error) {
	clientID := config.AuthConfig["client_id"]
	clientSecret := config.AuthConfig["client_secret"]
	tokenURL := config.AuthConfig["token_url"]
	refreshToken := config.AuthConfig["refresh_token"]

	if refreshToken == "" {
		return nil, fmt.Errorf("refresh_token is required")
	}

	oauthConfig := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint: oauth2.Endpoint{
			TokenURL: tokenURL,
		},
	}

	token := &oauth2.Token{
		RefreshToken: refreshToken,
	}

	tokenSource := oauthConfig.TokenSource(nil, token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}

	// Update cache
	cacheKey := config.ID.String()
	ras.tokenCache[cacheKey] = newToken

	return newToken, nil
}

// GetAuthTypes returns supported authentication types
func (ras *RESTAuthService) GetAuthTypes() []AuthTypeInfo {
	return []AuthTypeInfo{
		{
			Type:        "none",
			DisplayName: "No Authentication",
			Description: "Public API with no authentication required",
			Fields:      []AuthField{},
		},
		{
			Type:        "api_key",
			DisplayName: "API Key",
			Description: "API key in header or query parameter",
			Fields: []AuthField{
				{Name: "api_key", Type: "password", Required: true, Label: "API Key"},
				{Name: "location", Type: "select", Required: true, Label: "Location", Options: []string{"header", "query"}, Default: "header"},
				{Name: "param_name", Type: "text", Required: true, Label: "Parameter Name", Default: "X-API-Key"},
			},
		},
		{
			Type:        "basic",
			DisplayName: "HTTP Basic Auth",
			Description: "Username and password in Authorization header",
			Fields: []AuthField{
				{Name: "username", Type: "text", Required: true, Label: "Username"},
				{Name: "password", Type: "password", Required: true, Label: "Password"},
			},
		},
		{
			Type:        "bearer",
			DisplayName: "Bearer Token",
			Description: "Bearer token in Authorization header",
			Fields: []AuthField{
				{Name: "token", Type: "password", Required: true, Label: "Token"},
			},
		},
		{
			Type:        "oauth2",
			DisplayName: "OAuth 2.0",
			Description: "OAuth2 client credentials or password grant",
			Fields: []AuthField{
				{Name: "client_id", Type: "text", Required: true, Label: "Client ID"},
				{Name: "client_secret", Type: "password", Required: true, Label: "Client Secret"},
				{Name: "token_url", Type: "text", Required: true, Label: "Token URL"},
				{Name: "grant_type", Type: "select", Required: true, Label: "Grant Type", Options: []string{"client_credentials", "password", "refresh_token"}, Default: "client_credentials"},
				{Name: "username", Type: "text", Required: false, Label: "Username (for password grant)"},
				{Name: "password", Type: "password", Required: false, Label: "Password (for password grant)"},
				{Name: "refresh_token", Type: "password", Required: false, Label: "Refresh Token"},
			},
		},
		{
			Type:        "custom",
			DisplayName: "Custom Headers",
			Description: "Custom authentication headers",
			Fields: []AuthField{
				{Name: "header_*", Type: "text", Required: false, Label: "Custom Header (prefix with header_)", Placeholder: "header_X-Custom-Auth"},
			},
		},
	}
}

// AuthTypeInfo represents authentication type information
type AuthTypeInfo struct {
	Type        string      `json:"type"`
	DisplayName string      `json:"displayName"`
	Description string      `json:"description"`
	Fields      []AuthField `json:"fields"`
}

// AuthField represents an authentication field
type AuthField struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"` // text, password, select
	Required    bool     `json:"required"`
	Label       string   `json:"label"`
	Placeholder string   `json:"placeholder,omitempty"`
	Options     []string `json:"options,omitempty"`
	Default     string   `json:"default,omitempty"`
}

// TestAuth tests authentication configuration
func (ras *RESTAuthService) TestAuth(config *RESTConnectorConfig) error {
	// Validate config
	if err := ras.ValidateAuthConfig(config.AuthType, config.AuthConfig); err != nil {
		return err
	}

	// Create test request
	req, err := http.NewRequest("GET", config.BaseURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create test request: %w", err)
	}

	// Apply auth
	if err := ras.ApplyAuth(req, config); err != nil {
		return err
	}

	// Execute request
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("authentication test failed: %w", err)
	}
	defer resp.Body.Close()

	// Check for auth errors
	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return fmt.Errorf("authentication failed: status %d", resp.StatusCode)
	}

	return nil
}
