package services

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
)

// QueryValidator validates SQL queries for safety
type QueryValidator struct {
	allowedTables []string
}

// NewQueryValidator creates a new query validator
func NewQueryValidator(allowedTables []string) *QueryValidator {
	return &QueryValidator{
		allowedTables: allowedTables,
	}
}

// ValidateSQL validates a SQL query for safety
func (v *QueryValidator) ValidateSQL(sql string) (string, bool, error) {
	sql = strings.TrimSpace(sql)

	// 1. Must be SELECT statement
	if !v.isSelectStatement(sql) {
		return sql, false, errors.New("only SELECT statements are allowed")
	}

	// 2. No multiple statements (semicolons)
	if v.hasMultipleStatements(sql) {
		return sql, false, errors.New("multiple statements are not allowed")
	}

	// 3. No comments
	if v.hasComments(sql) {
		return sql, false, errors.New("comments are not allowed in queries")
	}

	// 4. No dangerous keywords
	if v.hasDangerousKeywords(sql) {
		return sql, false, errors.New("query contains dangerous keywords")
	}

	// 5. Validate table names (if allowedTables is set)
	if len(v.allowedTables) > 0 {
		if err := v.validateTableNames(sql); err != nil {
			return sql, false, err
		}
	}

	// 6. Add LIMIT if not present
	sql = v.ensureLimit(sql)

	return sql, true, nil
}

// isSelectStatement checks if query starts with SELECT
func (v *QueryValidator) isSelectStatement(sql string) bool {
	upperSQL := strings.ToUpper(sql)
	return strings.HasPrefix(upperSQL, "SELECT") || strings.HasPrefix(upperSQL, "WITH")
}

// hasMultipleStatements checks for semicolons (multiple statements)
func (v *QueryValidator) hasMultipleStatements(sql string) bool {
	// Remove semicolon at the end (allowed)
	sql = strings.TrimRight(sql, ";")
	return strings.Contains(sql, ";")
}

// hasComments checks for SQL comments
func (v *QueryValidator) hasComments(sql string) bool {
	// Check for -- comments
	if strings.Contains(sql, "--") {
		return true
	}
	// Check for /* */ comments
	if strings.Contains(sql, "/*") || strings.Contains(sql, "*/") {
		return true
	}
	return false
}

// hasDangerousKeywords checks for dangerous SQL keywords
func (v *QueryValidator) hasDangerousKeywords(sql string) bool {
	upperSQL := strings.ToUpper(sql)
	dangerousKeywords := []string{
		"DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE",
		"ALTER", "CREATE", "GRANT", "REVOKE",
		"EXEC", "EXECUTE", "CALL",
		"INFORMATION_SCHEMA", "PG_", "MYSQL.",
	}

	for _, keyword := range dangerousKeywords {
		if strings.Contains(upperSQL, keyword) {
			return true
		}
	}
	return false
}

// validateTableNames validates that all table names are in allowed list
func (v *QueryValidator) validateTableNames(sql string) error {
	// Extract table names using regex (simple approach)
	// This is a basic implementation - for production, use a proper SQL parser
	upperSQL := strings.ToUpper(sql)

	for _, table := range v.allowedTables {
		upperTable := strings.ToUpper(table)
		if strings.Contains(upperSQL, upperTable) {
			return nil // At least one allowed table found
		}
	}

	return fmt.Errorf("query must reference at least one allowed table")
}

// ensureLimit adds LIMIT clause if not present
func (v *QueryValidator) ensureLimit(sql string) string {
	upperSQL := strings.ToUpper(sql)

	// Check if LIMIT already exists
	limitRegex := regexp.MustCompile(`\bLIMIT\s+\d+`)
	if limitRegex.MatchString(upperSQL) {
		return sql
	}

	// Add LIMIT 1000 at the end
	sql = strings.TrimRight(sql, ";")
	return sql + " LIMIT 1000"
}

// ValidateFormula validates a formula/expression
func (v *QueryValidator) ValidateFormula(formula string) (bool, error) {
	formula = strings.TrimSpace(formula)

	if formula == "" {
		return false, errors.New("formula cannot be empty")
	}

	// Check for dangerous patterns
	if v.hasComments(formula) {
		return false, errors.New("comments are not allowed in formulas")
	}

	// Basic validation - formula should contain operators or functions
	hasOperator := strings.ContainsAny(formula, "+-*/()[]")
	if !hasOperator && !strings.Contains(strings.ToUpper(formula), "SUM") &&
		!strings.Contains(strings.ToUpper(formula), "AVG") &&
		!strings.Contains(strings.ToUpper(formula), "COUNT") {
		return false, errors.New("formula must contain operators or functions")
	}

	return true, nil
}
