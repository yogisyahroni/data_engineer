package services

import (
	"context"
	"insight-engine-backend/models"
	"testing"
	"time"
)

// setupTestCache creates a mock query cache for testing
func setupTestCache(t *testing.T) *QueryCache {
	cache, mr := setupTestRedis(t)
	t.Cleanup(func() {
		mr.Close()
		cache.Close()
	})
	return NewQueryCache(cache, 5*time.Minute)
}

// TestBuildSQL_SimpleSelect tests basic SELECT with single table
func TestBuildSQL_SimpleSelect(t *testing.T) {
	// Mock dependencies
	queryExecutor := NewQueryExecutor()
	schemaDiscovery := NewSchemaDiscovery(queryExecutor)
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, schemaDiscovery, nil, nil)

	// Create test connection
	conn := &models.Connection{
		ID:       "test-conn",
		Type:     "postgres",
		Database: "testdb",
	}

	// Create simple config
	config := &models.VisualQueryConfig{
		Tables: []models.TableSelection{
			{Name: "users", Alias: "u"},
		},
		Columns: []models.ColumnSelection{
			{Table: "u", Column: "id"},
			{Table: "u", Column: "name"},
		},
		Limit: intPtr(10),
	}

	// Note: This will fail schema validation in real scenario
	// For unit test, we're testing SQL generation logic only
	ctx := context.Background()

	// Build SQL (skip validation for unit test)
	sql := queryBuilder.buildSelectClause(config) + "\n" +
		queryBuilder.buildFromClause(config) + "\n" +
		queryBuilder.buildLimitClause(config)

	// Verify SQL structure
	if sql == "" {
		t.Error("Expected SQL to be generated")
	}

	// Check for SELECT clause
	if !contains(sql, "SELECT") {
		t.Error("Expected SELECT clause")
	}

	// Check for FROM clause
	if !contains(sql, "FROM") {
		t.Error("Expected FROM clause")
	}

	// Check for LIMIT clause
	if !contains(sql, "LIMIT 10") {
		t.Error("Expected LIMIT 10 clause")
	}

	_ = ctx
	_ = conn
}

// TestBuildSQL_WithJoins tests INNER, LEFT, RIGHT, FULL joins
func TestBuildSQL_WithJoins(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	tests := []struct {
		name     string
		joinType string
		expected string
	}{
		{"INNER JOIN", "INNER", "INNER JOIN"},
		{"LEFT JOIN", "LEFT", "LEFT JOIN"},
		{"RIGHT JOIN", "RIGHT", "RIGHT JOIN"},
		{"FULL JOIN", "FULL", "FULL JOIN"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := &models.VisualQueryConfig{
				Joins: []models.JoinConfig{
					{
						Type:        tt.joinType,
						LeftTable:   "orders",
						RightTable:  "customers",
						LeftColumn:  "customer_id",
						RightColumn: "id",
					},
				},
			}

			sql := queryBuilder.buildJoinClause(config)

			if !contains(sql, tt.expected) {
				t.Errorf("Expected %s, got: %s", tt.expected, sql)
			}
		})
	}
}

// TestBuildSQL_WithFilters tests AND/OR filter logic
func TestBuildSQL_WithFilters(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	config := &models.VisualQueryConfig{
		Filters: []models.FilterCondition{
			{Column: "status", Operator: "=", Value: "active", Logic: "AND"},
			{Column: "age", Operator: ">", Value: 18, Logic: "OR"},
			{Column: "country", Operator: "=", Value: "US", Logic: "AND"},
		},
	}

	whereClause, params := queryBuilder.buildWhereClause(config)

	// Check WHERE clause exists
	if !contains(whereClause, "WHERE") {
		t.Error("Expected WHERE clause")
	}

	// Check operators
	if !contains(whereClause, "=") || !contains(whereClause, ">") {
		t.Error("Expected operators in WHERE clause")
	}

	// Check params count
	if len(params) != 3 {
		t.Errorf("Expected 3 params, got %d", len(params))
	}

	// Check param values
	if params[0] != "active" || params[1] != 18 || params[2] != "US" {
		t.Error("Param values don't match")
	}
}

// TestBuildSQL_WithAggregations tests SUM, AVG, COUNT, MIN, MAX
func TestBuildSQL_WithAggregations(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	tests := []struct {
		name     string
		function string
		expected string
	}{
		{"SUM", "SUM", "SUM"},
		{"AVG", "AVG", "AVG"},
		{"COUNT", "COUNT", "COUNT"},
		{"MIN", "MIN", "MIN"},
		{"MAX", "MAX", "MAX"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := &models.VisualQueryConfig{
				Aggregations: []models.Aggregation{
					{
						Function: tt.function,
						Column:   "amount",
						Alias:    "total",
					},
				},
			}

			sql := queryBuilder.buildSelectClause(config)

			if !contains(sql, tt.expected) {
				t.Errorf("Expected %s function, got: %s", tt.expected, sql)
			}

			if !contains(sql, "AS") {
				t.Error("Expected AS keyword for alias")
			}
		})
	}
}

// TestBuildSQL_WithGroupBy tests GROUP BY clause
func TestBuildSQL_WithGroupBy(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	config := &models.VisualQueryConfig{
		GroupBy: []string{"customer_id", "product_id"},
	}

	sql := queryBuilder.buildGroupByClause(config)

	if !contains(sql, "GROUP BY") {
		t.Error("Expected GROUP BY clause")
	}

	if !contains(sql, "customer_id") || !contains(sql, "product_id") {
		t.Error("Expected column names in GROUP BY")
	}
}

// TestBuildSQL_WithOrderBy tests ORDER BY ASC/DESC
func TestBuildSQL_WithOrderBy(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	tests := []struct {
		name      string
		direction string
		expected  string
	}{
		{"ASC", "ASC", "ASC"},
		{"DESC", "DESC", "DESC"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := &models.VisualQueryConfig{
				OrderBy: []models.OrderByClause{
					{
						Column:    "created_at",
						Direction: tt.direction,
					},
				},
			}

			sql := queryBuilder.buildOrderByClause(config)

			if !contains(sql, "ORDER BY") {
				t.Error("Expected ORDER BY clause")
			}

			if !contains(sql, tt.expected) {
				t.Errorf("Expected %s direction, got: %s", tt.expected, sql)
			}
		})
	}
}

// TestBuildSQL_WithLimit tests LIMIT clause
func TestBuildSQL_WithLimit(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	limit := 50
	config := &models.VisualQueryConfig{
		Limit: &limit,
	}

	sql := queryBuilder.buildLimitClause(config)

	if !contains(sql, "LIMIT 50") {
		t.Errorf("Expected LIMIT 50, got: %s", sql)
	}
}

// TestBuildSQL_ComplexQuery tests all features combined
func TestBuildSQL_ComplexQuery(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	limit := 10
	config := &models.VisualQueryConfig{
		Tables: []models.TableSelection{
			{Name: "orders", Alias: "o"},
		},
		Joins: []models.JoinConfig{
			{
				Type:        "INNER",
				LeftTable:   "o",
				RightTable:  "customers",
				LeftColumn:  "customer_id",
				RightColumn: "id",
			},
		},
		Columns: []models.ColumnSelection{
			{Table: "o", Column: "id"},
			{Table: "customers", Column: "name"},
		},
		Filters: []models.FilterCondition{
			{Column: "o.status", Operator: "=", Value: "completed", Logic: "AND"},
		},
		Aggregations: []models.Aggregation{
			{Function: "SUM", Column: "o.total", Alias: "total_revenue"},
		},
		GroupBy: []string{"customers.name"},
		OrderBy: []models.OrderByClause{
			{Column: "total_revenue", Direction: "DESC"},
		},
		Limit: &limit,
	}

	// Build all clauses
	selectClause := queryBuilder.buildSelectClause(config)
	fromClause := queryBuilder.buildFromClause(config)
	joinClause := queryBuilder.buildJoinClause(config)
	whereClause, _ := queryBuilder.buildWhereClause(config)
	groupByClause := queryBuilder.buildGroupByClause(config)
	orderByClause := queryBuilder.buildOrderByClause(config)
	limitClause := queryBuilder.buildLimitClause(config)

	// Verify all clauses are present
	if selectClause == "" || fromClause == "" || joinClause == "" ||
		whereClause == "" || groupByClause == "" || orderByClause == "" || limitClause == "" {
		t.Error("Expected all SQL clauses to be generated")
	}

	// Verify key components
	if !contains(selectClause, "SELECT") {
		t.Error("Expected SELECT in select clause")
	}
	if !contains(joinClause, "INNER JOIN") {
		t.Error("Expected INNER JOIN")
	}
	if !contains(whereClause, "WHERE") {
		t.Error("Expected WHERE clause")
	}
	if !contains(groupByClause, "GROUP BY") {
		t.Error("Expected GROUP BY")
	}
	if !contains(orderByClause, "ORDER BY") {
		t.Error("Expected ORDER BY")
	}
	if !contains(limitClause, "LIMIT") {
		t.Error("Expected LIMIT")
	}
}

// TestValidateConfig_InvalidTable tests validation for non-existent tables
func TestValidateConfig_InvalidTable(t *testing.T) {
	// This test would require mocking schema discovery
	// Skipping for now as it requires database connection
	t.Skip("Requires database connection for schema discovery")
}

// TestValidateConfig_InvalidColumn tests validation for non-existent columns
func TestValidateConfig_InvalidColumn(t *testing.T) {
	// This test would require mocking schema discovery
	// Skipping for now as it requires database connection
	t.Skip("Requires database connection for schema discovery")
}

// TestBuildSQL_SQLInjectionPrevention tests SQL injection attempts
func TestBuildSQL_SQLInjectionPrevention(t *testing.T) {
	queryValidator := NewQueryValidator([]string{})
	queryBuilder := NewQueryBuilder(queryValidator, nil, nil, nil)

	// Test malicious table name
	config := &models.VisualQueryConfig{
		Tables: []models.TableSelection{
			{Name: "users; DROP TABLE users--", Alias: "u"},
		},
	}

	sql := queryBuilder.buildFromClause(config)

	// Sanitized identifier should not contain semicolon or --
	if contains(sql, ";") || contains(sql, "--") {
		t.Error("SQL injection attempt not prevented")
	}

	// Test malicious column name
	config2 := &models.VisualQueryConfig{
		Columns: []models.ColumnSelection{
			{Table: "users", Column: "id' OR '1'='1"},
		},
	}

	sql2 := queryBuilder.buildSelectClause(config2)

	// Sanitized identifier should not contain quotes
	if contains(sql2, "'") {
		t.Error("SQL injection attempt not prevented in column")
	}
}

// Helper functions

func intPtr(i int) *int {
	return &i
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 &&
		(s == substr || len(s) >= len(substr) &&
			(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
				findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
