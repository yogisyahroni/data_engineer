package services

import (
	"context"
	"strings"

	"gorm.io/gorm"
)

// FormulaAutocomplete provides autocomplete suggestions for formula editing
type FormulaAutocomplete struct {
	db *gorm.DB
}

// AutocompleteSuggestion represents a single autocomplete suggestion
type AutocompleteSuggestion struct {
	Type        string `json:"type"`        // "function", "column", "operator", "keyword"
	Value       string `json:"value"`       // The suggestion text
	Label       string `json:"label"`       // Display label
	Description string `json:"description"` // Help text
	Signature   string `json:"signature"`   // Function signature (for functions)
	Example     string `json:"example"`     // Usage example
	Category    string `json:"category"`    // Category for grouping
}

// AutocompleteRequest represents an autocomplete request
type AutocompleteRequest struct {
	Input        string `json:"input"`        // Current input text
	CursorPos    int    `json:"cursorPos"`    // Cursor position
	DataSourceID string `json:"dataSourceId"` // Optional: for column suggestions
}

// AutocompleteResponse represents an autocomplete response
type AutocompleteResponse struct {
	Suggestions []AutocompleteSuggestion `json:"suggestions"`
	Prefix      string                   `json:"prefix"` // The prefix being completed
}

// NewFormulaAutocomplete creates a new formula autocomplete service
func NewFormulaAutocomplete(db *gorm.DB) *FormulaAutocomplete {
	return &FormulaAutocomplete{
		db: db,
	}
}

// GetSuggestions returns autocomplete suggestions based on input
func (fa *FormulaAutocomplete) GetSuggestions(ctx context.Context, req AutocompleteRequest) *AutocompleteResponse {
	// Extract the word being typed at cursor position
	prefix := fa.extractPrefix(req.Input, req.CursorPos)

	suggestions := []AutocompleteSuggestion{}

	// Add function suggestions
	suggestions = append(suggestions, fa.getFunctionSuggestions(prefix)...)

	// Add operator suggestions
	suggestions = append(suggestions, fa.getOperatorSuggestions(prefix)...)

	// Add keyword suggestions
	suggestions = append(suggestions, fa.getKeywordSuggestions(prefix)...)

	// Add column suggestions if dataSourceId is provided
	if req.DataSourceID != "" {
		columnSuggestions := fa.getColumnSuggestions(ctx, req.DataSourceID, prefix)
		suggestions = append(suggestions, columnSuggestions...)
	}

	// Filter suggestions by prefix
	filtered := fa.filterByPrefix(suggestions, prefix)

	return &AutocompleteResponse{
		Suggestions: filtered,
		Prefix:      prefix,
	}
}

// extractPrefix extracts the word being typed at cursor position
func (fa *FormulaAutocomplete) extractPrefix(input string, cursorPos int) string {
	if cursorPos > len(input) {
		cursorPos = len(input)
	}

	// Find the start of the current word
	start := cursorPos
	for start > 0 && isWordChar(rune(input[start-1])) {
		start--
	}

	return input[start:cursorPos]
}

// isWordChar checks if a character is part of a word
func isWordChar(r rune) bool {
	return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_'
}

// getFunctionSuggestions returns function suggestions
func (fa *FormulaAutocomplete) getFunctionSuggestions(prefix string) []AutocompleteSuggestion {
	functions := []AutocompleteSuggestion{
		{
			Type:        "function",
			Value:       "SUM",
			Label:       "SUM(column)",
			Description: "Calculate the sum of values",
			Signature:   "SUM(numeric_column)",
			Example:     "SUM(sales_amount)",
			Category:    "Aggregate",
		},
		{
			Type:        "function",
			Value:       "AVG",
			Label:       "AVG(column)",
			Description: "Calculate the average of values",
			Signature:   "AVG(numeric_column)",
			Example:     "AVG(price)",
			Category:    "Aggregate",
		},
		{
			Type:        "function",
			Value:       "COUNT",
			Label:       "COUNT(column)",
			Description: "Count the number of rows",
			Signature:   "COUNT(column)",
			Example:     "COUNT(user_id)",
			Category:    "Aggregate",
		},
		{
			Type:        "function",
			Value:       "MAX",
			Label:       "MAX(column)",
			Description: "Find the maximum value",
			Signature:   "MAX(column)",
			Example:     "MAX(created_at)",
			Category:    "Aggregate",
		},
		{
			Type:        "function",
			Value:       "MIN",
			Label:       "MIN(column)",
			Description: "Find the minimum value",
			Signature:   "MIN(column)",
			Example:     "MIN(price)",
			Category:    "Aggregate",
		},
		{
			Type:        "function",
			Value:       "ROUND",
			Label:       "ROUND(number, decimals)",
			Description: "Round a number to specified decimals",
			Signature:   "ROUND(number, decimals)",
			Example:     "ROUND(price, 2)",
			Category:    "Math",
		},
		{
			Type:        "function",
			Value:       "CONCAT",
			Label:       "CONCAT(str1, str2, ...)",
			Description: "Concatenate strings",
			Signature:   "CONCAT(string1, string2, ...)",
			Example:     "CONCAT(first_name, ' ', last_name)",
			Category:    "String",
		},
		{
			Type:        "function",
			Value:       "UPPER",
			Label:       "UPPER(string)",
			Description: "Convert string to uppercase",
			Signature:   "UPPER(string)",
			Example:     "UPPER(name)",
			Category:    "String",
		},
		{
			Type:        "function",
			Value:       "LOWER",
			Label:       "LOWER(string)",
			Description: "Convert string to lowercase",
			Signature:   "LOWER(string)",
			Example:     "LOWER(email)",
			Category:    "String",
		},
		{
			Type:        "function",
			Value:       "COALESCE",
			Label:       "COALESCE(val1, val2, ...)",
			Description: "Return the first non-null value",
			Signature:   "COALESCE(value1, value2, ...)",
			Example:     "COALESCE(discount, 0)",
			Category:    "Conditional",
		},
		{
			Type:        "function",
			Value:       "CASE",
			Label:       "CASE WHEN ... THEN ... END",
			Description: "Conditional expression",
			Signature:   "CASE WHEN condition THEN result ELSE default END",
			Example:     "CASE WHEN status = 'active' THEN 1 ELSE 0 END",
			Category:    "Conditional",
		},
		{
			Type:        "function",
			Value:       "DATE_TRUNC",
			Label:       "DATE_TRUNC(unit, timestamp)",
			Description: "Truncate timestamp to specified unit",
			Signature:   "DATE_TRUNC('day'|'month'|'year', timestamp)",
			Example:     "DATE_TRUNC('month', created_at)",
			Category:    "Date",
		},
		{
			Type:        "function",
			Value:       "EXTRACT",
			Label:       "EXTRACT(field FROM timestamp)",
			Description: "Extract field from timestamp",
			Signature:   "EXTRACT(YEAR|MONTH|DAY FROM timestamp)",
			Example:     "EXTRACT(YEAR FROM created_at)",
			Category:    "Date",
		},
	}

	return functions
}

// getOperatorSuggestions returns operator suggestions
func (fa *FormulaAutocomplete) getOperatorSuggestions(prefix string) []AutocompleteSuggestion {
	operators := []AutocompleteSuggestion{
		{
			Type:        "operator",
			Value:       "+",
			Label:       "+ (Addition)",
			Description: "Add two numbers",
			Example:     "price + tax",
			Category:    "Arithmetic",
		},
		{
			Type:        "operator",
			Value:       "-",
			Label:       "- (Subtraction)",
			Description: "Subtract two numbers",
			Example:     "revenue - cost",
			Category:    "Arithmetic",
		},
		{
			Type:        "operator",
			Value:       "*",
			Label:       "* (Multiplication)",
			Description: "Multiply two numbers",
			Example:     "quantity * price",
			Category:    "Arithmetic",
		},
		{
			Type:        "operator",
			Value:       "/",
			Label:       "/ (Division)",
			Description: "Divide two numbers",
			Example:     "total / count",
			Category:    "Arithmetic",
		},
		{
			Type:        "operator",
			Value:       "||",
			Label:       "|| (String Concatenation)",
			Description: "Concatenate strings",
			Example:     "first_name || ' ' || last_name",
			Category:    "String",
		},
	}

	return operators
}

// getKeywordSuggestions returns SQL keyword suggestions
func (fa *FormulaAutocomplete) getKeywordSuggestions(prefix string) []AutocompleteSuggestion {
	keywords := []AutocompleteSuggestion{
		{
			Type:        "keyword",
			Value:       "AS",
			Label:       "AS (Alias)",
			Description: "Create an alias for a column",
			Example:     "SUM(amount) AS total",
			Category:    "SQL",
		},
		{
			Type:        "keyword",
			Value:       "DISTINCT",
			Label:       "DISTINCT",
			Description: "Return unique values",
			Example:     "COUNT(DISTINCT user_id)",
			Category:    "SQL",
		},
		{
			Type:        "keyword",
			Value:       "NULL",
			Label:       "NULL",
			Description: "Null value",
			Example:     "COALESCE(value, NULL)",
			Category:    "SQL",
		},
	}

	return keywords
}

// getColumnSuggestions returns column suggestions from schema
func (fa *FormulaAutocomplete) getColumnSuggestions(ctx context.Context, dataSourceID string, prefix string) []AutocompleteSuggestion {
	// This would query the schema to get actual columns
	// For now, return empty - would need schema context
	return []AutocompleteSuggestion{}
}

// filterByPrefix filters suggestions by prefix
func (fa *FormulaAutocomplete) filterByPrefix(suggestions []AutocompleteSuggestion, prefix string) []AutocompleteSuggestion {
	if prefix == "" {
		return suggestions
	}

	filtered := []AutocompleteSuggestion{}
	lowerPrefix := strings.ToLower(prefix)

	for _, s := range suggestions {
		if strings.HasPrefix(strings.ToLower(s.Value), lowerPrefix) ||
			strings.HasPrefix(strings.ToLower(s.Label), lowerPrefix) {
			filtered = append(filtered, s)
		}
	}

	return filtered
}
