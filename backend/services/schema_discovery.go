package services

import (
	"context"
	"database/sql"
	"fmt"
	"insight-engine-backend/models"
)

// SchemaDiscovery handles database schema introspection
type SchemaDiscovery struct {
	executor *QueryExecutor
}

// NewSchemaDiscovery creates a new schema discovery service
func NewSchemaDiscovery(executor *QueryExecutor) *SchemaDiscovery {
	return &SchemaDiscovery{
		executor: executor,
	}
}

// TableInfo represents a database table
type TableInfo struct {
	Name     string       `json:"name"`
	Schema   string       `json:"schema"`
	Columns  []ColumnInfo `json:"columns"`
	RowCount *int64       `json:"rowCount,omitempty"`
}

// ColumnInfo represents a table column
type ColumnInfo struct {
	Name             string  `json:"name"`
	Type             string  `json:"type"`
	Nullable         bool    `json:"nullable"`
	DefaultValue     *string `json:"defaultValue"`
	IsPrimaryKey     bool    `json:"isPrimaryKey"`
	IsForeignKey     bool    `json:"isForeignKey"`
	ReferencedTable  *string `json:"referencedTable,omitempty"`
	ReferencedColumn *string `json:"referencedColumn,omitempty"`
}

// JoinSuggestion represents a suggested join between two tables
type JoinSuggestion struct {
	FromTable  string `json:"fromTable"`
	FromColumn string `json:"fromColumn"`
	ToTable    string `json:"toTable"`
	ToColumn   string `json:"toColumn"`
	JoinType   string `json:"joinType"`   // "INNER", "LEFT", "RIGHT"
	Confidence string `json:"confidence"` // "high", "medium", "low"
	Reason     string `json:"reason"`
}

// DiscoverSchema retrieves database schema information
func (sd *SchemaDiscovery) DiscoverSchema(ctx context.Context, conn *models.Connection) ([]TableInfo, error) {
	switch conn.Type {
	case "postgres":
		return sd.discoverPostgresSchema(ctx, conn)
	case "mysql":
		return sd.discoverMySQLSchema(ctx, conn)
	default:
		return nil, fmt.Errorf("schema discovery not supported for database type: %s", conn.Type)
	}
}

// discoverPostgresSchema discovers PostgreSQL schema
func (sd *SchemaDiscovery) discoverPostgresSchema(ctx context.Context, conn *models.Connection) ([]TableInfo, error) {
	// Get database connection
	db, err := sd.executor.getConnection(conn)
	if err != nil {
		return nil, err
	}

	// Query to get all tables in public schema
	tablesQuery := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND table_type = 'BASE TABLE'
		ORDER BY table_name
	`

	rows, err := db.QueryContext(ctx, tablesQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}

		// Get columns for this table
		columns, err := sd.getPostgresColumns(ctx, db, tableName)
		if err != nil {
			return nil, fmt.Errorf("failed to get columns for table %s: %w", tableName, err)
		}

		tables = append(tables, TableInfo{
			Name:    tableName,
			Schema:  "public",
			Columns: columns,
		})
	}

	return tables, nil
}

// getPostgresColumns retrieves column information for a PostgreSQL table
func (sd *SchemaDiscovery) getPostgresColumns(ctx context.Context, db *sql.DB, tableName string) ([]ColumnInfo, error) {
	query := `
		SELECT 
			c.column_name,
			c.data_type,
			c.is_nullable,
			c.column_default,
			CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
			CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
		FROM information_schema.columns c
		LEFT JOIN (
			SELECT ku.column_name
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage ku
				ON tc.constraint_name = ku.constraint_name
			WHERE tc.constraint_type = 'PRIMARY KEY'
				AND tc.table_name = $1
		) pk ON c.column_name = pk.column_name
		LEFT JOIN (
			SELECT ku.column_name
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage ku
				ON tc.constraint_name = ku.constraint_name
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_name = $1
		) fk ON c.column_name = fk.column_name
		WHERE c.table_name = $1
		ORDER BY c.ordinal_position
	`

	rows, err := db.QueryContext(ctx, query, tableName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var col ColumnInfo
		var nullable string
		var defaultVal sql.NullString

		err := rows.Scan(
			&col.Name,
			&col.Type,
			&nullable,
			&defaultVal,
			&col.IsPrimaryKey,
			&col.IsForeignKey,
		)
		if err != nil {
			return nil, err
		}

		col.Nullable = (nullable == "YES")
		if defaultVal.Valid {
			col.DefaultValue = &defaultVal.String
		}

		columns = append(columns, col)
	}

	return columns, nil
}

// discoverMySQLSchema discovers MySQL schema
func (sd *SchemaDiscovery) discoverMySQLSchema(ctx context.Context, conn *models.Connection) ([]TableInfo, error) {
	db, err := sd.executor.getConnection(conn)
	if err != nil {
		return nil, err
	}

	// Query to get all tables
	tablesQuery := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = DATABASE()
		AND table_type = 'BASE TABLE'
		ORDER BY table_name
	`

	rows, err := db.QueryContext(ctx, tablesQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			return nil, err
		}

		columns, err := sd.getMySQLColumns(ctx, db, tableName)
		if err != nil {
			return nil, fmt.Errorf("failed to get columns for table %s: %w", tableName, err)
		}

		tables = append(tables, TableInfo{
			Name:    tableName,
			Schema:  conn.Database,
			Columns: columns,
		})
	}

	return tables, nil
}

// getMySQLColumns retrieves column information for a MySQL table
func (sd *SchemaDiscovery) getMySQLColumns(ctx context.Context, db *sql.DB, tableName string) ([]ColumnInfo, error) {
	query := `
		SELECT 
			column_name,
			data_type,
			is_nullable,
			column_default,
			column_key
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
		AND table_name = ?
		ORDER BY ordinal_position
	`

	rows, err := db.QueryContext(ctx, query, tableName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var col ColumnInfo
		var nullable string
		var defaultVal sql.NullString
		var columnKey string

		err := rows.Scan(
			&col.Name,
			&col.Type,
			&nullable,
			&defaultVal,
			&columnKey,
		)
		if err != nil {
			return nil, err
		}

		col.Nullable = (nullable == "YES")
		if defaultVal.Valid {
			col.DefaultValue = &defaultVal.String
		}
		col.IsPrimaryKey = (columnKey == "PRI")
		col.IsForeignKey = (columnKey == "MUL")

		columns = append(columns, col)
	}

	return columns, nil
}

// GetJoinSuggestions analyzes FK relationships and suggests possible joins
func (sd *SchemaDiscovery) GetJoinSuggestions(ctx context.Context, conn *models.Connection, tableNames []string) ([]JoinSuggestion, error) {
	switch conn.Type {
	case "postgres":
		return sd.getPostgresJoinSuggestions(ctx, conn, tableNames)
	case "mysql":
		return sd.getMySQLJoinSuggestions(ctx, conn, tableNames)
	default:
		return nil, fmt.Errorf("join suggestions not supported for database type: %s", conn.Type)
	}
}

// getPostgresJoinSuggestions finds PostgreSQL foreign key relationships
func (sd *SchemaDiscovery) getPostgresJoinSuggestions(ctx context.Context, conn *models.Connection, tableNames []string) ([]JoinSuggestion, error) {
	if len(tableNames) == 0 {
		return []JoinSuggestion{}, nil
	}

	db, err := sd.executor.getConnection(conn)
	if err != nil {
		return nil, err
	}

	// Query to get FK relationships between tables
	query := `
		SELECT
			tc.table_name AS from_table,
			kcu.column_name AS from_column,
			ccu.table_name AS to_table,
			ccu.column_name AS to_column
		FROM information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage AS ccu
			ON ccu.constraint_name = tc.constraint_name
			AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = 'public'
			AND (tc.table_name = ANY($1) OR ccu.table_name = ANY($1))
	`

	// Convert string slice to PostgreSQL array format
	rows, err := db.QueryContext(ctx, query, tableNames)
	if err != nil {
		return nil, fmt.Errorf("failed to query FK relationships: %w", err)
	}
	defer rows.Close()

	var suggestions []JoinSuggestion
	tableSet := make(map[string]bool)
	for _, t := range tableNames {
		tableSet[t] = true
	}

	for rows.Next() {
		var fromTable, fromColumn, toTable, toColumn string
		if err := rows.Scan(&fromTable, &fromColumn, &toTable, &toColumn); err != nil {
			return nil, err
		}

		// Only suggest if both tables are in the selected set
		if tableSet[fromTable] && tableSet[toTable] {
			suggestions = append(suggestions, JoinSuggestion{
				FromTable:  fromTable,
				FromColumn: fromColumn,
				ToTable:    toTable,
				ToColumn:   toColumn,
				JoinType:   "INNER",
				Confidence: "high",
				Reason:     "Foreign key constraint",
			})
		}
	}

	return suggestions, nil
}

// getMySQLJoinSuggestions finds MySQL foreign key relationships
func (sd *SchemaDiscovery) getMySQLJoinSuggestions(ctx context.Context, conn *models.Connection, tableNames []string) ([]JoinSuggestion, error) {
	if len(tableNames) == 0 {
		return []JoinSuggestion{}, nil
	}

	db, err := sd.executor.getConnection(conn)
	if err != nil {
		return nil, err
	}

	// Build IN clause for table names
	placeholders := "?"
	for i := 1; i < len(tableNames); i++ {
		placeholders += ", ?"
	}

	query := fmt.Sprintf(`
		SELECT
			kcu.TABLE_NAME AS from_table,
			kcu.COLUMN_NAME AS from_column,
			kcu.REFERENCED_TABLE_NAME AS to_table,
			kcu.REFERENCED_COLUMN_NAME AS to_column
		FROM information_schema.KEY_COLUMN_USAGE kcu
		WHERE kcu.TABLE_SCHEMA = DATABASE()
			AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
			AND (kcu.TABLE_NAME IN (%s) OR kcu.REFERENCED_TABLE_NAME IN (%s))
	`, placeholders, placeholders)

	// Prepare args: tableNames twice for both IN clauses
	args := make([]interface{}, 0, len(tableNames)*2)
	for _, t := range tableNames {
		args = append(args, t)
	}
	for _, t := range tableNames {
		args = append(args, t)
	}

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query FK relationships: %w", err)
	}
	defer rows.Close()

	var suggestions []JoinSuggestion
	tableSet := make(map[string]bool)
	for _, t := range tableNames {
		tableSet[t] = true
	}

	for rows.Next() {
		var fromTable, fromColumn, toTable, toColumn string
		if err := rows.Scan(&fromTable, &fromColumn, &toTable, &toColumn); err != nil {
			return nil, err
		}

		// Only suggest if both tables are in the selected set
		if tableSet[fromTable] && tableSet[toTable] {
			suggestions = append(suggestions, JoinSuggestion{
				FromTable:  fromTable,
				FromColumn: fromColumn,
				ToTable:    toTable,
				ToColumn:   toColumn,
				JoinType:   "INNER",
				Confidence: "high",
				Reason:     "Foreign key constraint",
			})
		}
	}

	return suggestions, nil
}
