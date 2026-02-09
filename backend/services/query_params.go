package services

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

/**
 * Query Parameter Service
 * Handles {{parameter}} syntax with type-safe substitution
 */

// ParameterType represents supported parameter types
type ParameterType string

const (
	ParameterTypeString    ParameterType = "string"
	ParameterTypeNumber    ParameterType = "number"
	ParameterTypeBoolean   ParameterType = "boolean"
	ParameterTypeDate      ParameterType = "date"
	ParameterTypeTimestamp ParameterType = "timestamp"
	ParameterTypeArray     ParameterType = "array"
)

// Parameter represents a query parameter
type Parameter struct {
	Name         string        `json:"name"`
	Type         ParameterType `json:"type"`
	Value        interface{}   `json:"value"`
	DefaultValue interface{}   `json:"default_value,omitempty"`
	Description  string        `json:"description,omitempty"`
}

// QueryParamsService handles parameter extraction and substitution
type QueryParamsService struct{}

// NewQueryParamsService creates a new query params service
func NewQueryParamsService() *QueryParamsService {
	return &QueryParamsService{}
}

// ExtractParameters finds all {{parameter}} placeholders in SQL
func (s *QueryParamsService) ExtractParameters(ctx context.Context, sql string) ([]string, error) {
	// Regex to match {{parameter_name}}
	re := regexp.MustCompile(`\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}`)
	matches := re.FindAllStringSubmatch(sql, -1)

	paramSet := make(map[string]bool)
	var params []string

	for _, match := range matches {
		if len(match) > 1 {
			paramName := match[1]
			if !paramSet[paramName] {
				params = append(params, paramName)
				paramSet[paramName] = true
			}
		}
	}

	return params, nil
}

// ValidateParameters checks if all required parameters are provided
func (s *QueryParamsService) ValidateParameters(
	ctx context.Context,
	sql string,
	params []Parameter,
) error {
	// Extract required parameters from SQL
	required, err := s.ExtractParameters(ctx, sql)
	if err != nil {
		return fmt.Errorf("failed to extract parameters: %w", err)
	}

	// Create map of provided parameters
	provided := make(map[string]bool)
	for _, param := range params {
		provided[param.Name] = true
	}

	// Check for missing parameters
	var missing []string
	for _, req := range required {
		if !provided[req] {
			missing = append(missing, req)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing parameters: %v", missing)
	}

	return nil
}

// SubstituteParameters replaces {{parameter}} with actual values
func (s *QueryParamsService) SubstituteParameters(
	ctx context.Context,
	sql string,
	params []Parameter,
) (string, error) {
	// Validate first
	if err := s.ValidateParameters(ctx, sql, params); err != nil {
		return "", err
	}

	// Create parameter map
	paramMap := make(map[string]Parameter)
	for _, param := range params {
		paramMap[param.Name] = param
	}

	// Regex to match {{parameter_name}}
	re := regexp.MustCompile(`\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}`)

	// Replace all occurrences
	result := re.ReplaceAllStringFunc(sql, func(match string) string {
		// Extract parameter name
		paramName := strings.TrimPrefix(strings.TrimSuffix(match, "}}"), "{{")

		param, exists := paramMap[paramName]
		if !exists {
			// This should not happen if ValidateParameters passed
			return match
		}

		// Format value based on type
		formatted, err := s.formatParameterValue(param)
		if err != nil {
			// Return original if formatting fails
			return match
		}

		return formatted
	})

	return result, nil
}

// formatParameterValue formats parameter value for SQL
func (s *QueryParamsService) formatParameterValue(param Parameter) (string, error) {
	value := param.Value
	if value == nil {
		value = param.DefaultValue
	}

	if value == nil {
		return "NULL", nil
	}

	switch param.Type {
	case ParameterTypeString:
		// Escape single quotes
		strVal := fmt.Sprintf("%v", value)
		escaped := strings.ReplaceAll(strVal, "'", "''")
		return fmt.Sprintf("'%s'", escaped), nil

	case ParameterTypeNumber:
		// Validate numeric
		switch v := value.(type) {
		case int, int8, int16, int32, int64:
			return fmt.Sprintf("%d", v), nil
		case uint, uint8, uint16, uint32, uint64:
			return fmt.Sprintf("%d", v), nil
		case float32, float64:
			return fmt.Sprintf("%f", v), nil
		case string:
			// Try to parse string as number
			if _, err := strconv.ParseFloat(v, 64); err != nil {
				return "", fmt.Errorf("invalid number: %v", v)
			}
			return v, nil
		default:
			return "", fmt.Errorf("invalid number type: %T", value)
		}

	case ParameterTypeBoolean:
		switch v := value.(type) {
		case bool:
			if v {
				return "TRUE", nil
			}
			return "FALSE", nil
		case string:
			lower := strings.ToLower(v)
			if lower == "true" || lower == "1" || lower == "yes" {
				return "TRUE", nil
			}
			if lower == "false" || lower == "0" || lower == "no" {
				return "FALSE", nil
			}
			return "", fmt.Errorf("invalid boolean: %v", v)
		default:
			return "", fmt.Errorf("invalid boolean type: %T", value)
		}

	case ParameterTypeDate:
		// Format as 'YYYY-MM-DD'
		switch v := value.(type) {
		case time.Time:
			return fmt.Sprintf("'%s'", v.Format("2006-01-02")), nil
		case string:
			// Validate date format
			if _, err := time.Parse("2006-01-02", v); err != nil {
				return "", fmt.Errorf("invalid date format (expected YYYY-MM-DD): %v", v)
			}
			return fmt.Sprintf("'%s'", v), nil
		default:
			return "", fmt.Errorf("invalid date type: %T", value)
		}

	case ParameterTypeTimestamp:
		// Format as 'YYYY-MM-DD HH:MM:SS'
		switch v := value.(type) {
		case time.Time:
			return fmt.Sprintf("'%s'", v.Format("2006-01-02 15:04:05")), nil
		case string:
			// Validate timestamp format
			if _, err := time.Parse("2006-01-02 15:04:05", v); err != nil {
				return "", fmt.Errorf("invalid timestamp format (expected YYYY-MM-DD HH:MM:SS): %v", v)
			}
			return fmt.Sprintf("'%s'", v), nil
		default:
			return "", fmt.Errorf("invalid timestamp type: %T", value)
		}

	case ParameterTypeArray:
		// Format as ('val1', 'val2', 'val3') for use in IN clauses
		var items []string
		switch v := value.(type) {
		case []interface{}:
			for _, item := range v {
				// Escape and quote each item
				strItem := fmt.Sprintf("%v", item)
				escaped := strings.ReplaceAll(strItem, "'", "''")
				items = append(items, fmt.Sprintf("'%s'", escaped))
			}
		case []string:
			for _, item := range v {
				escaped := strings.ReplaceAll(item, "'", "''")
				items = append(items, fmt.Sprintf("'%s'", escaped))
			}
		case string:
			// Parse comma-separated string
			parts := strings.Split(v, ",")
			for _, part := range parts {
				trimmed := strings.TrimSpace(part)
				escaped := strings.ReplaceAll(trimmed, "'", "''")
				items = append(items, fmt.Sprintf("'%s'", escaped))
			}
		default:
			return "", fmt.Errorf("invalid array type: %T", value)
		}

		if len(items) == 0 {
			return "()", nil
		}

		return fmt.Sprintf("(%s)", strings.Join(items, ", ")), nil

	default:
		return "", fmt.Errorf("unsupported parameter type: %s", param.Type)
	}
}

// InferParameterType attempts to infer parameter type from value
func (s *QueryParamsService) InferParameterType(value interface{}) ParameterType {
	switch v := value.(type) {
	case bool:
		return ParameterTypeBoolean
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return ParameterTypeNumber
	case time.Time:
		return ParameterTypeTimestamp
	case []interface{}, []string:
		return ParameterTypeArray
	case string:
		// Try to infer from string content
		if _, err := strconv.ParseFloat(v, 64); err == nil {
			return ParameterTypeNumber
		}
		if _, err := time.Parse("2006-01-02", v); err == nil {
			return ParameterTypeDate
		}
		if _, err := time.Parse("2006-01-02 15:04:05", v); err == nil {
			return ParameterTypeTimestamp
		}
		if strings.Contains(v, ",") {
			return ParameterTypeArray
		}
		return ParameterTypeString
	default:
		return ParameterTypeString
	}
}
