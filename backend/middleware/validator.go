package middleware

import (
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// ValidationError represents a single validation error
type ValidationError struct {
	Field   string `json:"field"`
	Tag     string `json:"tag"`
	Message string `json:"message"`
}

// ValidateStruct validates a struct using go-playground/validator
// Returns a user-friendly error response if validation fails
func ValidateStruct(data interface{}) error {
	validate := validator.New()

	err := validate.Struct(data)
	if err == nil {
		return nil
	}

	// Convert validator errors to user-friendly format
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request format")
	}

	errors := make([]ValidationError, 0, len(validationErrors))
	for _, fieldError := range validationErrors {
		errors = append(errors, ValidationError{
			Field:   fieldError.Field(),
			Tag:     fieldError.Tag(),
			Message: getErrorMessage(fieldError),
		})
	}

	return &fiber.Error{
		Code:    fiber.StatusUnprocessableEntity,
		Message: formatValidationErrors(errors),
	}
}

// ValidateRequest is a middleware that validates request body against a DTO
// Usage: app.Post("/endpoint", middleware.ValidateRequest[dtos.MyDTO](), handler)
func ValidateRequest[T any]() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var dto T

		// Parse request body
		if err := c.BodyParser(&dto); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
				"type":  "parse_error",
			})
		}

		// Validate struct
		if err := ValidateStruct(dto); err != nil {
			if fiberErr, ok := err.(*fiber.Error); ok {
				return c.Status(fiberErr.Code).JSON(fiber.Map{
					"error": fiberErr.Message,
					"type":  "validation_error",
				})
			}
			return err
		}

		// Store validated DTO in context for handler access
		c.Locals("validatedData", dto)

		return c.Next()
	}
}

// getErrorMessage converts validator tags to user-friendly messages
func getErrorMessage(fieldError validator.FieldError) string {
	field := fieldError.Field()
	tag := fieldError.Tag()
	param := fieldError.Param()

	switch tag {
	case "required":
		return field + " is required"
	case "email":
		return field + " must be a valid email address"
	case "min":
		if fieldError.Type().String() == "string" {
			return field + " must be at least " + param + " characters long"
		}
		return field + " must be at least " + param
	case "max":
		if fieldError.Type().String() == "string" {
			return field + " must be at most " + param + " characters long"
		}
		return field + " must be at most " + param
	case "eqfield":
		return field + " must match " + param
	case "nefield":
		return field + " must be different from " + param
	case "oneof":
		return field + " must be one of: " + param
	case "uuid":
		return field + " must be a valid UUID"
	case "required_if":
		return field + " is required when " + param
	default:
		return field + " validation failed on " + tag
	}
}

// formatValidationErrors formats multiple validation errors into a single message
func formatValidationErrors(errors []ValidationError) string {
	if len(errors) == 0 {
		return "Validation failed"
	}

	messages := make([]string, len(errors))
	for i, err := range errors {
		messages[i] = err.Message
	}

	return strings.Join(messages, "; ")
}

// GetValidatedData retrieves the validated DTO from context
// Usage in handler: dto := middleware.GetValidatedData[dtos.MyDTO](c)
func GetValidatedData[T any](c *fiber.Ctx) T {
	data := c.Locals("validatedData")
	if data == nil {
		var zero T
		return zero
	}
	return data.(T)
}
