package services

import (
	"context"
	"fmt"
	"insight-engine-backend/models"
	"regexp"
	"strings"
)

// QueryBuilder handles visual query configuration to SQL conversion
type QueryBuilder struct {
	validator       *QueryValidator
	schemaDiscovery *SchemaDiscovery
	queryCache      *QueryCache
	rlsService      *RLSService
}

// NewQueryBuilder creates a new query builder service
func NewQueryBuilder(validator *QueryValidator, schemaDiscovery *SchemaDiscovery, queryCache *QueryCache, rlsService *RLSService) *QueryBuilder {
	return &QueryBuilder{
		validator:       validator,
		schemaDiscovery: schemaDiscovery,
		queryCache:      queryCache,
		rlsService:      rlsService,
	}
}

// BuildSQL generates SQL from visual configuration
// Updated to accept user context for RLS enforcement
func (qb *QueryBuilder) BuildSQL(ctx context.Context, config *models.VisualQueryConfig, conn *models.Connection, userID string, workspaceID string, userRole *string) (string, []interface{}, error) {
	// Validate configuration
	if err := qb.ValidateConfig(ctx, config, conn); err != nil {
		return "", nil, fmt.Errorf("invalid configuration: %w", err)
	}

	var sqlParts []string
	var params []interface{}

	// Build SELECT clause
	selectClause := qb.buildSelectClause(config)
	sqlParts = append(sqlParts, selectClause)

	// Build FROM clause
	fromClause := qb.buildFromClause(config)
	sqlParts = append(sqlParts, fromClause)

	// Build JOIN clauses
	if len(config.Joins) > 0 {
		joinClause := qb.buildJoinClause(config)
		sqlParts = append(sqlParts, joinClause)
	}

	// Build WHERE clause
	if len(config.Filters) > 0 {
		whereClause, whereParams := qb.buildWhereClause(config)
		sqlParts = append(sqlParts, whereClause)
		params = append(params, whereParams...)
	}

	// Build GROUP BY clause
	if len(config.GroupBy) > 0 {
		groupByClause := qb.buildGroupByClause(config)
		sqlParts = append(sqlParts, groupByClause)
	}

	// Build ORDER BY clause
	if len(config.OrderBy) > 0 {
		orderByClause := qb.buildOrderByClause(config)
		sqlParts = append(sqlParts, orderByClause)
	}

	// Build LIMIT clause
	if config.Limit != nil {
		limitClause := qb.buildLimitClause(config)
		sqlParts = append(sqlParts, limitClause)
	}

	sql := strings.Join(sqlParts, "\n")

	// Note: RLS is now applied at query execution time via QueryExecutor
	// to avoid tight coupling and provide cleaner separation of concerns

	return sql, params, nil
}

// ValidateConfig validates visual configuration before SQL generation
func (qb *QueryBuilder) ValidateConfig(ctx context.Context, config *models.VisualQueryConfig, conn *models.Connection) error {
	// Validate tables exist
	if len(config.Tables) == 0 {
		return fmt.Errorf("at least one table is required")
	}

	// Get schema information
	schema, err := qb.schemaDiscovery.DiscoverSchema(ctx, conn)
	if err != nil {
		return fmt.Errorf("failed to discover schema: %w", err)
	}

	// Create table map for validation
	tableMap := make(map[string]*TableInfo)
	for i := range schema {
		tableMap[schema[i].Name] = &schema[i]
	}

	// Validate all tables exist
	for _, table := range config.Tables {
		if _, exists := tableMap[table.Name]; !exists {
			return fmt.Errorf("table '%s' does not exist", table.Name)
		}
	}

	// Validate columns exist
	for _, col := range config.Columns {
		tableInfo, exists := tableMap[col.Table]
		if !exists {
			return fmt.Errorf("table '%s' does not exist for column '%s'", col.Table, col.Column)
		}

		// Check if column exists (unless it's *)
		if col.Column != "*" {
			columnExists := false
			for _, tableCol := range tableInfo.Columns {
				if tableCol.Name == col.Column {
					columnExists = true
					break
				}
			}
			if !columnExists {
				return fmt.Errorf("column '%s' does not exist in table '%s'", col.Column, col.Table)
			}
		}
	}

	// Validate joins
	if len(config.Joins) > 10 {
		return fmt.Errorf("maximum 10 joins allowed")
	}

	for _, join := range config.Joins {
		// Validate join type
		validJoinTypes := map[string]bool{"INNER": true, "LEFT": true, "RIGHT": true, "FULL": true}
		if !validJoinTypes[strings.ToUpper(join.Type)] {
			return fmt.Errorf("invalid join type '%s'", join.Type)
		}

		// Validate tables exist
		if _, exists := tableMap[join.LeftTable]; !exists {
			return fmt.Errorf("left table '%s' does not exist in join", join.LeftTable)
		}
		if _, exists := tableMap[join.RightTable]; !exists {
			return fmt.Errorf("right table '%s' does not exist in join", join.RightTable)
		}
	}

	// Validate filters
	if len(config.Filters) > 50 {
		return fmt.Errorf("maximum 50 filters allowed")
	}

	for _, filter := range config.Filters {
		// Validate operator
		validOperators := map[string]bool{
			"=": true, "!=": true, ">": true, "<": true, ">=": true, "<=": true,
			"LIKE": true, "IN": true, "BETWEEN": true,
		}
		if !validOperators[strings.ToUpper(filter.Operator)] {
			return fmt.Errorf("invalid operator '%s'", filter.Operator)
		}

		// Validate logic
		if filter.Logic != "" && filter.Logic != "AND" && filter.Logic != "OR" {
			return fmt.Errorf("invalid logic '%s', must be AND or OR", filter.Logic)
		}
	}

	// Validate aggregations
	for _, agg := range config.Aggregations {
		validFunctions := map[string]bool{"SUM": true, "AVG": true, "COUNT": true, "MIN": true, "MAX": true}
		if !validFunctions[strings.ToUpper(agg.Function)] {
			return fmt.Errorf("invalid aggregation function '%s'", agg.Function)
		}
	}

	return nil
}

// buildSelectClause generates SELECT clause with columns and aggregations
func (qb *QueryBuilder) buildSelectClause(config *models.VisualQueryConfig) string {
	var columns []string

	// Add regular columns
	for _, col := range config.Columns {
		var colStr string
		if col.Column == "*" {
			colStr = fmt.Sprintf("%s.*", qb.sanitizeIdentifier(col.Table))
		} else {
			colStr = fmt.Sprintf("%s.%s", qb.sanitizeIdentifier(col.Table), qb.sanitizeIdentifier(col.Column))
		}

		// Add aggregation if specified
		if col.Aggregation != nil && *col.Aggregation != "" {
			colStr = fmt.Sprintf("%s(%s)", strings.ToUpper(*col.Aggregation), colStr)
		}

		// Add alias if specified
		if col.Alias != nil && *col.Alias != "" {
			colStr = fmt.Sprintf("%s AS %s", colStr, qb.sanitizeIdentifier(*col.Alias))
		}

		columns = append(columns, colStr)
	}

	// Add aggregations
	for _, agg := range config.Aggregations {
		aggStr := fmt.Sprintf("%s(%s) AS %s",
			strings.ToUpper(agg.Function),
			qb.sanitizeIdentifier(agg.Column),
			qb.sanitizeIdentifier(agg.Alias))
		columns = append(columns, aggStr)
	}

	if len(columns) == 0 {
		columns = append(columns, "*")
	}

	return "SELECT\n    " + strings.Join(columns, ",\n    ")
}

// buildFromClause generates FROM clause with tables
func (qb *QueryBuilder) buildFromClause(config *models.VisualQueryConfig) string {
	if len(config.Tables) == 0 {
		return ""
	}

	table := config.Tables[0]
	fromClause := fmt.Sprintf("FROM %s", qb.sanitizeIdentifier(table.Name))
	if table.Alias != "" {
		fromClause = fmt.Sprintf("%s %s", fromClause, qb.sanitizeIdentifier(table.Alias))
	}

	return fromClause
}

// buildJoinClause generates JOIN clauses
func (qb *QueryBuilder) buildJoinClause(config *models.VisualQueryConfig) string {
	var joins []string

	for _, join := range config.Joins {
		joinStr := fmt.Sprintf("%s JOIN %s ON %s.%s = %s.%s",
			strings.ToUpper(join.Type),
			qb.sanitizeIdentifier(join.RightTable),
			qb.sanitizeIdentifier(join.LeftTable),
			qb.sanitizeIdentifier(join.LeftColumn),
			qb.sanitizeIdentifier(join.RightTable),
			qb.sanitizeIdentifier(join.RightColumn))
		joins = append(joins, joinStr)
	}

	return strings.Join(joins, "\n")
}

// buildWhereClause generates WHERE clause with filters (AND/OR logic)
func (qb *QueryBuilder) buildWhereClause(config *models.VisualQueryConfig) (string, []interface{}) {
	if len(config.Filters) == 0 {
		return "", nil
	}

	var conditions []string
	var params []interface{}
	paramIndex := 1

	for i, filter := range config.Filters {
		var condition string

		// Handle different operators
		switch strings.ToUpper(filter.Operator) {
		case "IN":
			// For IN operator, value should be an array
			condition = fmt.Sprintf("%s IN ($%d)", qb.sanitizeIdentifier(filter.Column), paramIndex)
			params = append(params, filter.Value)
			paramIndex++
		case "BETWEEN":
			// For BETWEEN, value should be an array with 2 elements
			condition = fmt.Sprintf("%s BETWEEN $%d AND $%d", qb.sanitizeIdentifier(filter.Column), paramIndex, paramIndex+1)
			// Assuming filter.Value is []interface{}{start, end}
			if arr, ok := filter.Value.([]interface{}); ok && len(arr) == 2 {
				params = append(params, arr[0], arr[1])
				paramIndex += 2
			}
		default:
			condition = fmt.Sprintf("%s %s $%d", qb.sanitizeIdentifier(filter.Column), filter.Operator, paramIndex)
			params = append(params, filter.Value)
			paramIndex++
		}

		// Add logic operator (AND/OR) except for first condition
		if i > 0 {
			logic := "AND"
			if filter.Logic != "" {
				logic = strings.ToUpper(filter.Logic)
			}
			conditions = append(conditions, fmt.Sprintf("%s %s", logic, condition))
		} else {
			conditions = append(conditions, condition)
		}
	}

	whereClause := "WHERE " + strings.Join(conditions, "\n    ")
	return whereClause, params
}

// buildGroupByClause generates GROUP BY clause
func (qb *QueryBuilder) buildGroupByClause(config *models.VisualQueryConfig) string {
	var groupByCols []string
	for _, col := range config.GroupBy {
		groupByCols = append(groupByCols, qb.sanitizeIdentifier(col))
	}
	return "GROUP BY " + strings.Join(groupByCols, ", ")
}

// buildOrderByClause generates ORDER BY clause
func (qb *QueryBuilder) buildOrderByClause(config *models.VisualQueryConfig) string {
	var orderByCols []string
	for _, orderBy := range config.OrderBy {
		direction := "ASC"
		if strings.ToUpper(orderBy.Direction) == "DESC" {
			direction = "DESC"
		}
		orderByCols = append(orderByCols, fmt.Sprintf("%s %s", qb.sanitizeIdentifier(orderBy.Column), direction))
	}
	return "ORDER BY " + strings.Join(orderByCols, ", ")
}

// buildLimitClause generates LIMIT clause
func (qb *QueryBuilder) buildLimitClause(config *models.VisualQueryConfig) string {
	if config.Limit == nil {
		return ""
	}
	return fmt.Sprintf("LIMIT %d", *config.Limit)
}

// sanitizeIdentifier sanitizes SQL identifiers to prevent SQL injection
func (qb *QueryBuilder) sanitizeIdentifier(identifier string) string {
	// Remove any characters that are not alphanumeric, underscore, or dot
	reg := regexp.MustCompile(`[^a-zA-Z0-9_.]`)
	sanitized := reg.ReplaceAllString(identifier, "")

	// Wrap in double quotes for PostgreSQL
	return fmt.Sprintf("\"%s\"", sanitized)
}

// ExecuteQuery executes a visual query configuration and returns results
// Uses cache-first strategy: check cache -> execute if miss -> store in cache
func (qb *QueryBuilder) ExecuteQuery(ctx context.Context, config *models.VisualQueryConfig, conn *models.Connection, queryExecutor *QueryExecutor, userID string, visualQueryID string, workspaceID string, userRole *string) (*models.QueryResult, error) {
	var cacheKey string

	// Try cache if available
	if qb.queryCache != nil {
		// Generate cache key
		cacheKey = qb.queryCache.GenerateCacheKey(config, conn, userID)

		// Try to get from cache first
		cachedResult, err := qb.queryCache.GetCachedResult(ctx, cacheKey)
		if err == nil && cachedResult != nil {
			// Cache hit - return cached result
			return cachedResult, nil
		}
	}

	// Cache miss or cache disabled - execute query
	sql, params, err := qb.BuildSQL(ctx, config, conn, userID, workspaceID, userRole)
	if err != nil {
		return nil, err
	}

	// Execute query
	limit := config.Limit
	var offset *int

	result, err := queryExecutor.Execute(ctx, conn, sql, limit, offset)
	if err != nil {
		return nil, err
	}

	// Store params in result for debugging (if needed)
	_ = params

	// Store result in cache with tags for invalidation (if cache is available)
	if qb.queryCache != nil {
		tags := qb.queryCache.GenerateTags(visualQueryID, conn.ID, userID)
		err = qb.queryCache.SetCachedResult(ctx, cacheKey, result, tags)
		if err != nil {
			// Log error but don't fail the request
			// Cache failure shouldn't break query execution
			LogWarn("cache_set_failed", "Failed to cache query result", map[string]interface{}{"error": err})
		}
	}

	return result, nil
}
