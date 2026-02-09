package services

import (
	"context"
	"database/sql"
	"fmt"
	"insight-engine-backend/models"
	"strings"
	"time"
)

// IncrementalRefreshService handles incremental refresh operations for materialized views
type IncrementalRefreshService struct {
	executor *QueryExecutor
}

// NewIncrementalRefreshService creates a new incremental refresh service
func NewIncrementalRefreshService(executor *QueryExecutor) *IncrementalRefreshService {
	return &IncrementalRefreshService{
		executor: executor,
	}
}

// RefreshConfig holds configuration for incremental refresh
type RefreshConfig struct {
	TimestampColumn string    // Column to track changes (e.g., "updated_at")
	PrimaryKeys     []string  // Primary key columns for delta detection
	LastRefresh     time.Time // Last successful refresh time
}

// PerformIncrementalRefresh performs an incremental refresh based on timestamp
func (s *IncrementalRefreshService) PerformIncrementalRefresh(
	ctx context.Context,
	connection *models.Connection,
	mv *models.MaterializedView,
	config RefreshConfig,
) (int64, error) {
	db, err := s.executor.getConnection(connection)
	if err != nil {
		return 0, fmt.Errorf("failed to get database connection: %w", err)
	}
	defer db.Close()

	// Validate configuration
	if config.TimestampColumn == "" {
		return 0, fmt.Errorf("timestamp column is required for incremental refresh")
	}
	if len(config.PrimaryKeys) == 0 {
		return 0, fmt.Errorf("primary keys are required for incremental refresh")
	}

	// Detect database type and use appropriate strategy
	switch connection.Type {
	case "postgres":
		return s.refreshPostgresIncremental(ctx, db, mv, config)
	case "mysql":
		return s.refreshMySQLIncremental(ctx, db, mv, config)
	case "sqlite":
		return s.refreshSQLiteIncremental(ctx, db, mv, config)
	default:
		return s.refreshGenericIncremental(ctx, db, mv, config)
	}
}

// refreshPostgresIncremental performs incremental refresh for PostgreSQL
func (s *IncrementalRefreshService) refreshPostgresIncremental(
	ctx context.Context,
	db *sql.DB,
	mv *models.MaterializedView,
	config RefreshConfig,
) (int64, error) {
	// Extract table name from source query (simplified - assumes SELECT FROM pattern)
	sourceTable := s.extractSourceTable(mv.SourceQuery)
	if sourceTable == "" {
		return 0, fmt.Errorf("could not extract source table from query")
	}

	// Step 1: Find changed/new rows since last refresh
	changedRowsQuery := fmt.Sprintf(
		"WITH changed_data AS (%s WHERE %s > $1) "+
			"DELETE FROM %s WHERE (%s) IN (SELECT %s FROM changed_data)",
		mv.SourceQuery,
		config.TimestampColumn,
		mv.TargetTable,
		strings.Join(config.PrimaryKeys, ", "),
		strings.Join(config.PrimaryKeys, ", "),
	)

	// Execute delete of changed rows
	deleteResult, err := db.ExecContext(ctx, changedRowsQuery, config.LastRefresh)
	if err != nil {
		return 0, fmt.Errorf("failed to delete changed rows: %w", err)
	}
	deletedRows, _ := deleteResult.RowsAffected()

	// Step 2: Insert new/updated rows
	insertQuery := fmt.Sprintf(
		"INSERT INTO %s %s WHERE %s > $1",
		mv.TargetTable,
		mv.SourceQuery,
		config.TimestampColumn,
	)

	insertResult, err := db.ExecContext(ctx, insertQuery, config.LastRefresh)
	if err != nil {
		return 0, fmt.Errorf("failed to insert new rows: %w", err)
	}
	insertedRows, _ := insertResult.RowsAffected()

	return deletedRows + insertedRows, nil
}

// refreshMySQLIncremental performs incremental refresh for MySQL
func (s *IncrementalRefreshService) refreshMySQLIncremental(
	ctx context.Context,
	db *sql.DB,
	mv *models.MaterializedView,
	config RefreshConfig,
) (int64, error) {
	// For MySQL, use REPLACE INTO which handles insert/update
	// First, delete rows that might have been deleted from source
	var totalAffected int64

	// Step 1: Delete rows from MV that no longer exist in source
	deleteQuery := fmt.Sprintf(
		"DELETE FROM %s WHERE (%s) NOT IN (SELECT %s FROM (%s WHERE %s > ?) AS source_data)",
		mv.TargetTable,
		strings.Join(config.PrimaryKeys, ", "),
		strings.Join(config.PrimaryKeys, ", "),
		mv.SourceQuery,
		config.TimestampColumn,
	)

	deleteResult, err := db.ExecContext(ctx, deleteQuery, config.LastRefresh)
	if err == nil {
		deletedRows, _ := deleteResult.RowsAffected()
		totalAffected += deletedRows
	}

	// Step 2: Use REPLACE INTO for upsert (insert or update)
	replaceQuery := fmt.Sprintf(
		"REPLACE INTO %s %s WHERE %s > ?",
		mv.TargetTable,
		mv.SourceQuery,
		config.TimestampColumn,
	)

	replaceResult, err := db.ExecContext(ctx, replaceQuery, config.LastRefresh)
	if err != nil {
		return 0, fmt.Errorf("failed to replace rows: %w", err)
	}

	replacedRows, _ := replaceResult.RowsAffected()
	totalAffected += replacedRows

	return totalAffected, nil
}

// refreshSQLiteIncremental performs incremental refresh for SQLite
func (s *IncrementalRefreshService) refreshSQLiteIncremental(
	ctx context.Context,
	db *sql.DB,
	mv *models.MaterializedView,
	config RefreshConfig,
) (int64, error) {
	var totalAffected int64

	// Step 1: Delete old versions of changed rows
	pkList := strings.Join(config.PrimaryKeys, ", ")
	deleteQuery := fmt.Sprintf(
		"DELETE FROM %s WHERE (%s) IN (SELECT %s FROM (%s) WHERE %s > ?)",
		mv.TargetTable,
		pkList,
		pkList,
		mv.SourceQuery,
		config.TimestampColumn,
	)

	deleteResult, err := db.ExecContext(ctx, deleteQuery, config.LastRefresh)
	if err != nil {
		return 0, fmt.Errorf("failed to delete changed rows: %w", err)
	}
	deletedRows, _ := deleteResult.RowsAffected()
	totalAffected += deletedRows

	// Step 2: Insert new rows
	insertQuery := fmt.Sprintf(
		"INSERT INTO %s %s WHERE %s > ?",
		mv.TargetTable,
		mv.SourceQuery,
		config.TimestampColumn,
	)

	insertResult, err := db.ExecContext(ctx, insertQuery, config.LastRefresh)
	if err != nil {
		return 0, fmt.Errorf("failed to insert new rows: %w", err)
	}
	insertedRows, _ := insertResult.RowsAffected()
	totalAffected += insertedRows

	return totalAffected, nil
}

// refreshGenericIncremental performs generic incremental refresh
func (s *IncrementalRefreshService) refreshGenericIncremental(
	ctx context.Context,
	db *sql.DB,
	mv *models.MaterializedView,
	config RefreshConfig,
) (int64, error) {
	// Use SQLite strategy for generic databases
	return s.refreshSQLiteIncremental(ctx, db, mv, config)
}

// ValidateIncrementalConfig validates that source query supports incremental refresh
func (s *IncrementalRefreshService) ValidateIncrementalConfig(
	ctx context.Context,
	connection *models.Connection,
	sourceQuery string,
	timestampColumn string,
) error {
	db, err := s.executor.getConnection(connection)
	if err != nil {
		return fmt.Errorf("failed to get database connection: %w", err)
	}
	defer db.Close()

	// Execute query with LIMIT 0 to get column metadata
	testQuery := fmt.Sprintf("SELECT * FROM (%s) AS t LIMIT 0", sourceQuery)
	rows, err := db.QueryContext(ctx, testQuery)
	if err != nil {
		return fmt.Errorf("invalid source query: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return fmt.Errorf("failed to get columns: %w", err)
	}

	// Check if timestamp column exists
	hasTimestamp := false
	for _, col := range columns {
		if strings.EqualFold(col, timestampColumn) {
			hasTimestamp = true
			break
		}
	}

	if !hasTimestamp {
		return fmt.Errorf("timestamp column '%s' not found in source query", timestampColumn)
	}

	return nil
}

// DetectTimestampColumn attempts to auto-detect a suitable timestamp column
func (s *IncrementalRefreshService) DetectTimestampColumn(
	ctx context.Context,
	connection *models.Connection,
	sourceQuery string,
) (string, error) {
	db, err := s.executor.getConnection(connection)
	if err != nil {
		return "", fmt.Errorf("failed to get database connection: %w", err)
	}
	defer db.Close()

	// Execute query with LIMIT 0 to get column metadata
	testQuery := fmt.Sprintf("SELECT * FROM (%s) AS t LIMIT 0", sourceQuery)
	rows, err := db.QueryContext(ctx, testQuery)
	if err != nil {
		return "", fmt.Errorf("invalid source query: %w", err)
	}
	defer rows.Close()

	// Get column names and types
	columns, err := rows.Columns()
	if err != nil {
		return "", fmt.Errorf("failed to get columns: %w", err)
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return "", fmt.Errorf("failed to get column types: %w", err)
	}

	// Common timestamp column names (ordered by priority)
	commonTimestampNames := []string{
		"updated_at",
		"modified_at",
		"last_modified",
		"timestamp",
		"created_at",
		"date_modified",
	}

	// First, try to find a common timestamp column name
	for _, commonName := range commonTimestampNames {
		for i, col := range columns {
			if strings.EqualFold(col, commonName) {
				// Verify it's a timestamp/datetime type
				typeName := strings.ToLower(columnTypes[i].DatabaseTypeName())
				if strings.Contains(typeName, "timestamp") ||
					strings.Contains(typeName, "datetime") ||
					strings.Contains(typeName, "date") {
					return col, nil
				}
			}
		}
	}

	// If no common name found, look for any timestamp type column
	for i, colType := range columnTypes {
		typeName := strings.ToLower(colType.DatabaseTypeName())
		if strings.Contains(typeName, "timestamp") ||
			strings.Contains(typeName, "datetime") {
			return columns[i], nil
		}
	}

	return "", fmt.Errorf("no suitable timestamp column found in source query")
}

// extractSourceTable extracts the main source table from a SELECT query (simplified)
func (s *IncrementalRefreshService) extractSourceTable(query string) string {
	// This is a simplified extraction - in production, use a proper SQL parser
	lowerQuery := strings.ToLower(query)
	fromIndex := strings.Index(lowerQuery, "from")
	if fromIndex == -1 {
		return ""
	}

	// Extract text after FROM
	afterFrom := strings.TrimSpace(query[fromIndex+4:])

	// Find the first space or WHERE/JOIN keyword
	endIndex := len(afterFrom)
	for i, keywords := range []string{" ", "where", "join", "group", "order", "limit"} {
		if idx := strings.Index(strings.ToLower(afterFrom), keywords); idx != -1 && (i == 0 || idx < endIndex) {
			endIndex = idx
		}
	}

	tableName := strings.TrimSpace(afterFrom[:endIndex])
	return tableName
}

// GetDeltaStats returns statistics about the delta since last refresh
func (s *IncrementalRefreshService) GetDeltaStats(
	ctx context.Context,
	connection *models.Connection,
	sourceQuery string,
	timestampColumn string,
	lastRefresh time.Time,
) (int64, error) {
	db, err := s.executor.getConnection(connection)
	if err != nil {
		return 0, fmt.Errorf("failed to get database connection: %w", err)
	}
	defer db.Close()

	// Count rows changed since last refresh
	countQuery := fmt.Sprintf(
		"SELECT COUNT(*) FROM (%s) AS source WHERE %s > ?",
		sourceQuery,
		timestampColumn,
	)

	var count int64
	err = db.QueryRowContext(ctx, countQuery, lastRefresh).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get delta count: %w", err)
	}

	return count, nil
}
