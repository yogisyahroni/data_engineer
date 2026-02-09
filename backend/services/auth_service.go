package services

import (
	"fmt"
	"time"

	"insight-engine-backend/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService handles authentication business logic
type AuthService struct {
	db           *gorm.DB
	emailService *EmailService
}

// NewAuthService creates a new AuthService instance
// Dependency: Requires database connection for user operations
func NewAuthService(db *gorm.DB, emailService *EmailService) *AuthService {
	return &AuthService{
		db:           db,
		emailService: emailService,
	}
}

// RegisterResponse contains registration result
type RegisterResponse struct {
	User              *models.User
	VerificationSent  bool
	VerificationError error
}

// Register creates a new user account and sends verification email
// Business Rule: Email and username must be unique, password is hashed with bcrypt
// Security: Never returns password in user object, generates verification token
func (s *AuthService) Register(email, username, password, fullName string) (*RegisterResponse, error) {
	// Check email uniqueness - Security: Prevent duplicate accounts
	var existingUser models.User
	if err := s.db.Where("email = ?", email).First(&existingUser).Error; err == nil {
		return nil, fmt.Errorf("email already registered")
	} else if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("database error checking email: %w", err)
	}

	// Check username uniqueness - Security: Prevent username collision
	if err := s.db.Where("username = ?", username).First(&existingUser).Error; err == nil {
		return nil, fmt.Errorf("username already taken")
	} else if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("database error checking username: %w", err)
	}

	// Hash password with bcrypt - Security: Cost 10 (default) for balance of security/performance
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Generate verification token
	verificationToken := s.emailService.GenerateVerificationToken()
	verificationExpires := s.emailService.GetVerificationExpiry()

	// Create user - Anti-Mass Assignment: Explicit field mapping
	user := &models.User{
		ID:                       uuid.New().String(),
		Email:                    email,
		Username:                 username,
		Password:                 string(hashedPassword),
		Name:                     fullName,
		EmailVerified:            false,
		EmailVerificationToken:   verificationToken,
		EmailVerificationExpires: &verificationExpires,
	}

	// Insert into database
	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Send verification email
	err = s.emailService.SendVerificationEmail(user.Email, user.Name, verificationToken)
	verificationSent := err == nil

	// Clear sensitive data before returning - Security: Never return password hash or token
	user.Password = ""
	user.EmailVerificationToken = ""
	user.EmailVerificationExpires = nil

	return &RegisterResponse{
		User:              user,
		VerificationSent:  verificationSent,
		VerificationError: err,
	}, nil
}

// VerifyEmail verifies user email using token
// Returns user if verification successful, error otherwise
func (s *AuthService) VerifyEmail(token string) (*models.User, error) {
	if token == "" {
		return nil, fmt.Errorf("verification token is required")
	}

	var user models.User
	if err := s.db.Where("email_verification_token = ?", token).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid or expired verification token")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if already verified
	if user.EmailVerified {
		return nil, fmt.Errorf("email already verified")
	}

	// Check token expiration
	if user.EmailVerificationExpires != nil && time.Now().After(*user.EmailVerificationExpires) {
		return nil, fmt.Errorf("verification token has expired")
	}

	// Update user as verified
	now := time.Now()
	updates := map[string]interface{}{
		"email_verified":             true,
		"email_verified_at":          &now,
		"email_verification_token":   "", // Clear token after use
		"email_verification_expires": nil,
	}

	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to verify email: %w", err)
	}

	// Clear sensitive data
	user.Password = ""
	user.EmailVerificationToken = ""
	user.EmailVerificationExpires = nil
	user.EmailVerified = true
	user.EmailVerifiedAt = &now

	return &user, nil
}

// ResendVerificationEmail sends new verification email to user
func (s *AuthService) ResendVerificationEmail(email string) error {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Don't reveal if email exists or not - Security: Prevent email enumeration
			return nil
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Check if already verified
	if user.EmailVerified {
		return fmt.Errorf("email already verified")
	}

	// Generate new token
	verificationToken := s.emailService.GenerateVerificationToken()
	verificationExpires := s.emailService.GetVerificationExpiry()

	// Update user with new token
	updates := map[string]interface{}{
		"email_verification_token":   verificationToken,
		"email_verification_expires": &verificationExpires,
	}

	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update verification token: %w", err)
	}

	// Send verification email
	if err := s.emailService.SendVerificationEmail(user.Email, user.Name, verificationToken); err != nil {
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	return nil
}

// GetUserByEmail retrieves user by email
// Used for login validation
func (s *AuthService) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &user, nil
}

// GetUserByUsername retrieves user by username
// Used for username validation during registration
func (s *AuthService) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &user, nil
}

// VerifyPassword checks if provided password matches stored hash
// Security: Uses bcrypt.CompareHashAndPassword for secure comparison
func (s *AuthService) VerifyPassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// CheckEmailVerified checks if user email is verified
// Used during login to enforce email verification
func (s *AuthService) CheckEmailVerified(userID string) (bool, error) {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, fmt.Errorf("user not found")
		}
		return false, fmt.Errorf("database error: %w", err)
	}
	return user.EmailVerified, nil
}

// RequestPasswordReset generates password reset token and sends email
// Security: Always returns nil to prevent email enumeration
func (s *AuthService) RequestPasswordReset(email string) error {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Don't reveal if email exists or not - Security: Prevent email enumeration
			return nil
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Generate reset token
	resetToken := s.emailService.GenerateVerificationToken()
	resetExpires := s.emailService.GetPasswordResetExpiry()

	// Update user with reset token
	updates := map[string]interface{}{
		"password_reset_token":   resetToken,
		"password_reset_expires": &resetExpires,
	}

	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update reset token: %w", err)
	}

	// Send password reset email
	if err := s.emailService.SendPasswordResetEmail(user.Email, user.Name, resetToken); err != nil {
		return fmt.Errorf("failed to send password reset email: %w", err)
	}

	return nil
}

// ResetPassword resets user password using token
// Validates token, checks expiration, updates password
func (s *AuthService) ResetPassword(token, newPassword string) error {
	if token == "" {
		return fmt.Errorf("reset token is required")
	}

	if len(newPassword) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}

	var user models.User
	if err := s.db.Where("password_reset_token = ?", token).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("invalid or expired reset token")
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Check token expiration
	if user.PasswordResetExpires != nil && time.Now().After(*user.PasswordResetExpires) {
		return fmt.Errorf("reset token has expired")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update user password and clear reset token
	updates := map[string]interface{}{
		"password":               string(hashedPassword),
		"password_reset_token":   "",
		"password_reset_expires": nil,
	}

	if err := s.db.Model(&user).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to reset password: %w", err)
	}

	return nil
}

// ValidateResetToken checks if reset token is valid (not expired)
// Used by frontend to show/hide reset form
func (s *AuthService) ValidateResetToken(token string) (bool, error) {
	if token == "" {
		return false, fmt.Errorf("reset token is required")
	}

	var user models.User
	if err := s.db.Where("password_reset_token = ?", token).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil
		}
		return false, fmt.Errorf("database error: %w", err)
	}

	// Check token expiration
	if user.PasswordResetExpires != nil && time.Now().After(*user.PasswordResetExpires) {
		return false, nil
	}

	return true, nil
}

// ChangePassword changes user password after verifying current password
// Security: Requires current password verification, minimum 8 chars for new password
func (s *AuthService) ChangePassword(userID, currentPassword, newPassword string) error {
	if userID == "" {
		return fmt.Errorf("user ID is required")
	}

	if currentPassword == "" {
		return fmt.Errorf("current password is required")
	}

	if len(newPassword) < 8 {
		return fmt.Errorf("new password must be at least 8 characters")
	}

	// Get user from database (including password hash)
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("database error: %w", err)
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
		return fmt.Errorf("current password is incorrect")
	}

	// Optional: Check if new password is different from current
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(newPassword)); err == nil {
		return fmt.Errorf("new password must be different from current password")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password
	if err := s.db.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}
