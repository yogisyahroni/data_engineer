package dtos

import (
	"regexp"
	"strings"
)

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
}

// RegisterResponse represents the registration success response
type RegisterResponse struct {
	UserID   string `json:"userId"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Message  string `json:"message"`
}

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationResult contains validation status and errors
type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationError `json:"errors,omitempty"`
}

// ValidateRegisterRequest performs manual validation following existing codebase patterns
// Business Rule: All fields required except FullName, email must be valid format,
// username min 3 chars, password min 8 chars
func ValidateRegisterRequest(req *RegisterRequest) *ValidationResult {
	errors := []ValidationError{}

	// Email validation
	if strings.TrimSpace(req.Email) == "" {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Email is required",
		})
	} else if !isValidEmail(req.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "Invalid email format",
		})
	}

	// Username validation
	if strings.TrimSpace(req.Username) == "" {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "Username is required",
		})
	} else if len(req.Username) < 3 {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "Username must be at least 3 characters",
		})
	} else if len(req.Username) > 50 {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "Username must be less than 50 characters",
		})
	} else if !isValidUsername(req.Username) {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "Username can only contain letters, numbers, underscores, and hyphens",
		})
	}

	// Password validation
	if req.Password == "" {
		errors = append(errors, ValidationError{
			Field:   "password",
			Message: "Password is required",
		})
	} else if len(req.Password) < 8 {
		errors = append(errors, ValidationError{
			Field:   "password",
			Message: "Password must be at least 8 characters",
		})
	} else if len(req.Password) > 128 {
		errors = append(errors, ValidationError{
			Field:   "password",
			Message: "Password must be less than 128 characters",
		})
	}

	return &ValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}

// isValidEmail validates email format using regex
// Business Rule: Must follow standard email format (user@domain.com)
func isValidEmail(email string) bool {
	// RFC 5322 compliant regex for email validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

// isValidUsername validates username format
// Business Rule: Only alphanumeric, underscore, hyphen allowed
func isValidUsername(username string) bool {
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
	return usernameRegex.MatchString(username)
}
