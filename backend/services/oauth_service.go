package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"insight-engine-backend/models"

	"github.com/google/uuid"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

// GoogleUserInfo represents the user info returned by Google
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

// OAuthService handles OAuth authentication
type OAuthService struct {
	db *gorm.DB
	// Google OAuth config
	googleConfig *oauth2.Config
}

// NewOAuthService creates a new OAuth service
func NewOAuthService(db *gorm.DB) *OAuthService {
	// Initialize Google OAuth config
	googleConfig := &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &OAuthService{
		db:           db,
		googleConfig: googleConfig,
	}
}

// GetGoogleAuthURL returns the Google OAuth authorization URL
func (s *OAuthService) GetGoogleAuthURL(state string) string {
	return s.googleConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// HandleGoogleCallback handles the OAuth callback from Google
// Returns user and JWT token
func (s *OAuthService) HandleGoogleCallback(code string) (*models.User, string, error) {
	// Exchange code for token
	token, err := s.googleConfig.Exchange(context.Background(), code)
	if err != nil {
		return nil, "", fmt.Errorf("failed to exchange code: %w", err)
	}

	// Get user info from Google
	client := s.googleConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, "", fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("failed to get user info: status %d", resp.StatusCode)
	}

	// Parse user info
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response: %w", err)
	}

	var googleUser GoogleUserInfo
	if err := json.Unmarshal(body, &googleUser); err != nil {
		return nil, "", fmt.Errorf("failed to parse user info: %w", err)
	}

	// Find or create user
	user, err := s.findOrCreateUser(&googleUser)
	if err != nil {
		return nil, "", fmt.Errorf("failed to find or create user: %w", err)
	}

	// Generate JWT token
	jwtToken, err := GenerateJWT(user.ID, user.Email)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}

	return user, jwtToken, nil
}

// findOrCreateUser finds existing user by provider ID or email, or creates a new one
func (s *OAuthService) findOrCreateUser(googleUser *GoogleUserInfo) (*models.User, error) {
	var user models.User

	// Try to find user by provider ID first
	err := s.db.Where("provider = ? AND provider_id = ?", "google", googleUser.ID).First(&user).Error
	if err == nil {
		// User found by provider ID
		return &user, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Try to find user by email
	err = s.db.Where("email = ?", googleUser.Email).First(&user).Error
	if err == nil {
		// User found by email, link OAuth account
		user.Provider = "google"
		user.ProviderID = googleUser.ID
		user.EmailVerified = true // Google already verified the email
		if err := s.db.Save(&user).Error; err != nil {
			return nil, fmt.Errorf("failed to link OAuth account: %w", err)
		}
		return &user, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Create new user
	user = models.User{
		ID:            uuid.New().String(),
		Email:         googleUser.Email,
		Username:      generateUsernameFromEmail(googleUser.Email),
		Name:          googleUser.Name,
		Provider:      "google",
		ProviderID:    googleUser.ID,
		EmailVerified: googleUser.VerifiedEmail,
		// Password is empty for OAuth users - they can set it later
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}

// generateUsernameFromEmail generates a username from email
func generateUsernameFromEmail(email string) string {
	// Extract local part of email
	username := email
	for i, c := range email {
		if c == '@' {
			username = email[:i]
			break
		}
	}

	// Add random suffix to ensure uniqueness
	return username + "_" + uuid.New().String()[:8]
}

// IsGoogleConfigured checks if Google OAuth is properly configured
func (s *OAuthService) IsGoogleConfigured() bool {
	return s.googleConfig.ClientID != "" && s.googleConfig.ClientSecret != ""
}
