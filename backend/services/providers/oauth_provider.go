package providers

import "context"

/**
 * OAuth Provider Interface & Shared Types
 *
 * Defines the contract for all OAuth/OIDC/SAML providers.
 * This abstraction allows clean separation of provider-specific logic
 * while maintaining consistent user creation and authentication flow.
 */

// OAuthProvider is the interface that all auth providers must implement
// Supports OAuth 2.0, OIDC, and SAML 2.0 providers
type OAuthProvider interface {
	// GetAuthURL returns the authorization URL for redirecting users
	// state: CSRF protection token (should be verified on callback)
	GetAuthURL(state string) string

	// HandleCallback processes the OAuth callback
	// Exchanges authorization code for access token and fetches user info
	// Returns standardized user info or error
	HandleCallback(ctx context.Context, code string) (*ProviderUserInfo, error)

	// GetProviderName returns the provider identifier
	// Used for routing and user.provider field
	// Examples: "google", "azure_ad", "okta", "saml"
	GetProviderName() string

	// IsConfigured checks if provider has required configuration
	// Returns true if all required env vars are set
	IsConfigured() bool
}

// ProviderUserInfo represents standardized user information from any auth provider
// All providers map their user data to this structure
type ProviderUserInfo struct {
	// ProviderID is the unique identifier from the provider
	// Examples: Google ID, Azure Object ID, Okta sub, SAML NameID
	ProviderID string

	// Email is the user's email address
	Email string

	// EmailVerified indicates if the provider has verified the email
	// OAuth providers typically verify emails; SAML depends on IdP
	EmailVerified bool

	// Name is the user's full name
	Name string

	// GivenName is the user's first name
	GivenName string

	// FamilyName is the user's last name
	FamilyName string

	// Picture is the URL to the user's profile picture
	// May be empty for some providers (especially SAML)
	Picture string

	// Provider is the name of the auth provider
	// Should match GetProviderName()
	Provider string

	// Locale is the user's preferred language/locale
	// Format: ISO 639-1 language code (e.g., "en", "id", "en-US")
	Locale string

	// AdditionalClaims holds provider-specific claims
	// Can be used for custom attribute mapping
	AdditionalClaims map[string]interface{}
}

// OAuthError represents OAuth-specific errors
type OAuthError struct {
	Provider string // Provider name
	Stage    string // Stage where error occurred (auth_url, token_exchange, user_info)
	Message  string // Error message
	Err      error  // Underlying error
}

func (e *OAuthError) Error() string {
	if e.Err != nil {
		return e.Provider + " " + e.Stage + ": " + e.Message + ": " + e.Err.Error()
	}
	return e.Provider + " " + e.Stage + ": " + e.Message
}

func (e *OAuthError) Unwrap() error {
	return e.Err
}

// NewOAuthError creates a new OAuth error
func NewOAuthError(provider, stage, message string, err error) *OAuthError {
	return &OAuthError{
		Provider: provider,
		Stage:    stage,
		Message:  message,
		Err:      err,
	}
}
