package handlers

import (
	"os"
	"time"

	"insight-engine-backend/database"
	"insight-engine-backend/dtos"
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new AuthHandler with dependencies
// Following Dependency Injection pattern for testability
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register handles user registration
// POST /api/auth/register
// Business Rule: Creates new user account with validated input, sends verification email
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	// Parse request body - Anti-Mass Assignment: Explicit field mapping
	var req dtos.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}

	// Validate input - Business Rules: Email format, username length, password strength
	validation := dtos.ValidateRegisterRequest(&req)
	if !validation.Valid {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Validation failed",
			"errors":  validation.Errors,
		})
	}

	// Call service to create user and send verification email
	result, err := h.authService.Register(req.Email, req.Username, req.Password, req.FullName)
	if err != nil {
		// Handle specific business errors
		errMsg := err.Error()
		if errMsg == "email already registered" || errMsg == "username already taken" {
			return c.Status(409).JSON(fiber.Map{
				"status":  "error",
				"message": errMsg,
			})
		}

		// Log unexpected errors (will be upgraded to structured JSON logging in Phase 5)
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Internal server error",
		})
	}

	// Prepare response message
	message := "Registration successful"
	if !result.VerificationSent {
		message = "Registration successful. Please contact support to verify your email."
	} else {
		message = "Registration successful. Please check your email to verify your account."
	}

	// Success response - HTTP 201 Created
	return c.Status(201).JSON(fiber.Map{
		"status": "success",
		"data": dtos.RegisterResponse{
			UserID:   result.User.ID,
			Email:    result.User.Email,
			Username: result.User.Username,
			Message:  message,
		},
	})
}

// VerifyEmail handles email verification
// GET /api/auth/verify-email?token=<token>
// Business Rule: Verifies user email using token from email link
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Verification token is required",
		})
	}

	user, err := h.authService.VerifyEmail(token)
	if err != nil {
		errMsg := err.Error()
		if errMsg == "invalid or expired verification token" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Invalid or expired verification link. Please request a new one.",
			})
		}
		if errMsg == "email already verified" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Email already verified. Please sign in.",
			})
		}
		if errMsg == "verification token has expired" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Verification link has expired. Please request a new one.",
			})
		}

		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to verify email. Please try again.",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"message":  "Email verified successfully",
			"email":    user.Email,
			"verified": true,
		},
	})
}

// ResendVerificationRequest represents the request to resend verification email
type ResendVerificationRequest struct {
	Email string `json:"email"`
}

// ResendVerification handles resending verification email
// POST /api/auth/resend-verification
// Business Rule: Resends verification email to user
func (h *AuthHandler) ResendVerification(c *fiber.Ctx) error {
	var req ResendVerificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}

	if req.Email == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Email is required",
		})
	}

	err := h.authService.ResendVerificationEmail(req.Email)
	if err != nil {
		errMsg := err.Error()
		if errMsg == "email already verified" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Email already verified. Please sign in.",
			})
		}

		// For security, don't reveal if email exists or not
		// Return generic success message
		return c.Status(200).JSON(fiber.Map{
			"status":  "success",
			"message": "If the email exists, a verification email has been sent.",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"status":  "success",
		"message": "Verification email sent. Please check your inbox.",
	})
}

// LoginRequest represents the login payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	User  models.User `json:"user"`
	Token string      `json:"token"` // Optional: If we want to issue token from backend directly
}

// Login handles user login
// POST /api/auth/login
// Business Rule: Authenticates user and returns JWT token
// Security: Checks if email is verified before allowing login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	var user models.User
	result := database.DB.Where("email = ?", req.Email).First(&user)
	if result.Error != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// Check if email is verified
	if !user.EmailVerified {
		return c.Status(403).JSON(fiber.Map{
			"error":         "Email not verified",
			"message":       "Please verify your email before signing in.",
			"needsVerified": true,
		})
	}

	// Verify Password
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	// Generate JWT (Optional, if we want to return it for manual usage)
	// But NextAuth Credentials Provider keeps its own session.
	// We just need to return the User object to confirm success.
	// However, if we want to support API usage directly, we should return a token.

	// Create token
	token := jwt.New(jwt.SigningMethodHS256)
	claims := token.Claims.(jwt.MapClaims)
	claims["sub"] = user.ID
	claims["email"] = user.Email
	claims["exp"] = time.Now().Add(time.Hour * 72).Unix() // 3 days

	t, err := token.SignedString([]byte(os.Getenv("NEXTAUTH_SECRET")))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Could not login"})
	}

	return c.JSON(fiber.Map{
		"user":  user,
		"token": t,
	})
}

// ForgotPasswordRequest represents the forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ForgotPassword handles password reset request
// POST /api/auth/forgot-password
// Business Rule: Generates reset token and sends reset email
// Security: Always returns success to prevent email enumeration
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}

	if req.Email == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Email is required",
		})
	}

	// Request password reset - always returns success for security
	err := h.authService.RequestPasswordReset(req.Email)
	if err != nil {
		// Log error but don't reveal to user (will use structured JSON logging in Phase 5)
	}

	// Always return success to prevent email enumeration
	return c.Status(200).JSON(fiber.Map{
		"status":  "success",
		"message": "If an account exists with this email, a password reset link has been sent.",
	})
}

// ResetPasswordRequest represents the reset password request
type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// ResetPassword handles password reset
// POST /api/auth/reset-password
// Business Rule: Resets user password using valid token
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}

	// Validate input
	if req.Token == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Reset token is required",
		})
	}

	if req.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "New password is required",
		})
	}

	if len(req.NewPassword) < 8 {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Password must be at least 8 characters",
		})
	}

	// Reset password
	err := h.authService.ResetPassword(req.Token, req.NewPassword)
	if err != nil {
		errMsg := err.Error()
		if errMsg == "invalid or expired reset token" || errMsg == "reset token has expired" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Invalid or expired reset token. Please request a new password reset.",
			})
		}
		if errMsg == "password must be at least 8 characters" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": errMsg,
			})
		}

		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to reset password. Please try again.",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"status":  "success",
		"message": "Password reset successfully. Please sign in with your new password.",
	})
}

// ValidateResetTokenRequest represents the validate reset token request
type ValidateResetTokenRequest struct {
	Token string `json:"token"`
}

// ValidateResetToken checks if reset token is valid
// POST /api/auth/validate-reset-token
// Business Rule: Validates reset token without resetting password
func (h *AuthHandler) ValidateResetToken(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Token is required",
		})
	}

	isValid, err := h.authService.ValidateResetToken(token)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to validate token",
		})
	}

	if !isValid {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid or expired reset token",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"valid": true,
		},
	})
}

// ChangePasswordRequest represents the change password request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// ChangePassword handles password change for authenticated users
// POST /api/auth/change-password
// Business Rule: Changes password after verifying current password
// Security: Requires authentication, verifies current password first
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	// Get user ID from context (set by AuthMiddleware)
	userID, ok := c.Locals("userId").(string)
	if !ok || userID == "" {
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized",
		})
	}

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request body",
		})
	}

	// Validate input
	if req.CurrentPassword == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Current password is required",
		})
	}

	if req.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "New password is required",
		})
	}

	if len(req.NewPassword) < 8 {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "New password must be at least 8 characters",
		})
	}

	// Change password
	err := h.authService.ChangePassword(userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		errMsg := err.Error()
		if errMsg == "current password is incorrect" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Current password is incorrect",
			})
		}
		if errMsg == "new password must be different from current password" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "New password must be different from current password",
			})
		}
		if errMsg == "user not found" {
			return c.Status(404).JSON(fiber.Map{
				"status":  "error",
				"message": "User not found",
			})
		}

		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to change password. Please try again.",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"status":  "success",
		"message": "Password changed successfully",
	})
}
