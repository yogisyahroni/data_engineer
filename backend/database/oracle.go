package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	go_ora "github.com/sijms/go-ora/v2"
)

// OracleConfig holds Oracle database connection configuration
type OracleConfig struct {
	Host              string
	Port              int
	ServiceName       string // Modern connection method (preferred)
	SID               string // Legacy connection method
	Username          string
	Password          string
	ConnectMethod     string // "service" or "sid"
	SSL               bool
	WalletPath        string // Optional: for SSL/TLS
	ConnectionTimeout int    // seconds
	MaxOpenConns      int
	MaxIdleConns      int
	ConnMaxLifetime   int // minutes
}

// OracleConnector manages Oracle database connections
type OracleConnector struct {
	db     *sql.DB
	config *OracleConfig
}

// NewOracleConnector creates a new Oracle connector
func NewOracleConnector(config *OracleConfig) *OracleConnector {
	// Set defaults
	if config.Port == 0 {
		config.Port = 1521
	}
	if config.ConnectionTimeout == 0 {
		config.ConnectionTimeout = 30
	}
	if config.MaxOpenConns == 0 {
		config.MaxOpenConns = 25
	}
	if config.MaxIdleConns == 0 {
		config.MaxIdleConns = 5
	}
	if config.ConnMaxLifetime == 0 {
		config.ConnMaxLifetime = 60 // 1 hour
	}
	if config.ConnectMethod == "" {
		config.ConnectMethod = "service" // Default to service name
	}

	return &OracleConnector{
		config: config,
	}
}

// buildConnectionString constructs Oracle connection string for go-ora
func (c *OracleConnector) buildConnectionString() string {
	// Build connection options
	opts := map[string]string{
		"TIMEOUT": fmt.Sprintf("%d", c.config.ConnectionTimeout),
	}

	if c.config.SSL {
		opts["SSL"] = "enable"
		if c.config.WalletPath != "" {
			opts["WALLET"] = c.config.WalletPath
		}
	}

	// Build connection string based on method
	var connStr string
	if c.config.ConnectMethod == "sid" && c.config.SID != "" {
		// SID connection method (legacy)
		connStr = go_ora.BuildUrl(
			c.config.Host,
			c.config.Port,
			c.config.SID,
			c.config.Username,
			c.config.Password,
			opts,
		)
	} else {
		// Service Name connection method (modern, preferred)
		serviceName := c.config.ServiceName
		if serviceName == "" {
			serviceName = c.config.SID // Fallback to SID if service name not provided
		}
		connStr = go_ora.BuildUrl(
			c.config.Host,
			c.config.Port,
			serviceName,
			c.config.Username,
			c.config.Password,
			opts,
		)
	}

	return connStr
}

// Connect establishes connection to Oracle database
func (c *OracleConnector) Connect() error {
	connString := c.buildConnectionString()

	// Don't log connection string (contains password)
	log.Printf("🔌 Connecting to Oracle: %s@%s:%d", c.config.Username, c.config.Host, c.config.Port)

	db, err := sql.Open("oracle", connString)
	if err != nil {
		return fmt.Errorf("failed to open connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(c.config.MaxOpenConns)
	db.SetMaxIdleConns(c.config.MaxIdleConns)
	db.SetConnMaxLifetime(time.Duration(c.config.ConnMaxLifetime) * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return c.sanitizeError(err)
	}

	c.db = db
	log.Printf("✅ Connected to Oracle: %s:%d", c.config.Host, c.config.Port)
	return nil
}

// Disconnect closes the Oracle connection
func (c *OracleConnector) Disconnect() error {
	if c.db != nil {
		log.Printf("🔌 Disconnecting from Oracle: %s:%d", c.config.Host, c.config.Port)
		return c.db.Close()
	}
	return nil
}

// Ping tests the Oracle connection
func (c *OracleConnector) Ping() error {
	if c.db == nil {
		return fmt.Errorf("database connection not established")
	}
	return c.db.Ping()
}

// GetDB returns the underlying *sql.DB
func (c *OracleConnector) GetDB() *sql.DB {
	return c.db
}

// ExecuteQuery executes a SELECT query and returns results
func (c *OracleConnector) ExecuteQuery(query string, args ...interface{}) ([]map[string]interface{}, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, fmt.Errorf("failed to get columns: %w", err)
	}

	// Prepare result
	var results []map[string]interface{}

	// Iterate through rows
	for rows.Next() {
		// Create a slice of interface{} to hold each column's value
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range columns {
			valuePtrs[i] = &values[i]
		}

		// Scan row
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Create map for this row
		rowMap := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]

			// Handle NULL values
			if val == nil {
				rowMap[col] = nil
				continue
			}

			// Convert byte arrays to strings
			switch v := val.(type) {
			case []byte:
				rowMap[col] = string(v)
			default:
				rowMap[col] = v
			}
		}

		results = append(results, rowMap)
	}

	// Check for errors from iteration
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return results, nil
}

// ExecuteNonQuery executes INSERT, UPDATE, DELETE queries
func (c *OracleConnector) ExecuteNonQuery(query string, args ...interface{}) (int64, error) {
	if c.db == nil {
		return 0, fmt.Errorf("database connection not established")
	}

	result, err := c.db.Exec(query, args...)
	if err != nil {
		return 0, c.sanitizeError(err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

// GetTables retrieves all tables from the current schema
func (c *OracleConnector) GetTables() ([]TableInfo, error) {
	query := `
		SELECT 
			TABLE_NAME,
			TABLESPACE_NAME,
			NVL(NUM_ROWS, 0) AS NUM_ROWS
		FROM USER_TABLES
		ORDER BY TABLE_NAME
	`

	rows, err := c.ExecuteQuery(query)
	if err != nil {
		return nil, err
	}

	var tables []TableInfo
	for _, row := range rows {
		table := TableInfo{
			Schema: c.config.Username, // Oracle uses username as schema
			Name:   row["TABLE_NAME"].(string),
			Type:   "TABLE",
		}
		tables = append(tables, table)
	}

	return tables, nil
}

// GetViews retrieves all views from the current schema
func (c *OracleConnector) GetViews() ([]TableInfo, error) {
	query := `
		SELECT VIEW_NAME
		FROM USER_VIEWS
		ORDER BY VIEW_NAME
	`

	rows, err := c.ExecuteQuery(query)
	if err != nil {
		return nil, err
	}

	var views []TableInfo
	for _, row := range rows {
		view := TableInfo{
			Schema: c.config.Username,
			Name:   row["VIEW_NAME"].(string),
			Type:   "VIEW",
		}
		views = append(views, view)
	}

	return views, nil
}

// GetColumns retrieves columns for a specific table
func (c *OracleConnector) GetColumns(tableName string) ([]ColumnInfo, error) {
	query := `
		SELECT 
			COLUMN_NAME,
			DATA_TYPE,
			DATA_LENGTH,
			DATA_PRECISION,
			DATA_SCALE,
			NULLABLE
		FROM USER_TAB_COLUMNS
		WHERE TABLE_NAME = :1
		ORDER BY COLUMN_ID
	`

	rows, err := c.ExecuteQuery(query, tableName)
	if err != nil {
		return nil, err
	}

	var columns []ColumnInfo
	for _, row := range rows {
		column := ColumnInfo{
			Name:     row["COLUMN_NAME"].(string),
			DataType: row["DATA_TYPE"].(string),
			Nullable: row["NULLABLE"].(string) == "Y",
		}

		// Optional fields
		if val, ok := row["DATA_LENGTH"].(int64); ok && val > 0 {
			column.MaxLength = &val
		}
		if val, ok := row["DATA_PRECISION"].(int64); ok && val > 0 {
			precision := int(val)
			column.Precision = &precision
		}
		if val, ok := row["DATA_SCALE"].(int64); ok && val > 0 {
			scale := int(val)
			column.Scale = &scale
		}

		columns = append(columns, column)
	}

	return columns, nil
}

// GetPrimaryKeys retrieves primary key columns for a table
func (c *OracleConnector) GetPrimaryKeys(tableName string) ([]string, error) {
	query := `
		SELECT COLUMN_NAME
		FROM USER_CONS_COLUMNS
		WHERE CONSTRAINT_NAME = (
			SELECT CONSTRAINT_NAME
			FROM USER_CONSTRAINTS
			WHERE TABLE_NAME = :1
			AND CONSTRAINT_TYPE = 'P'
		)
		ORDER BY POSITION
	`

	rows, err := c.ExecuteQuery(query, tableName)
	if err != nil {
		return nil, err
	}

	var primaryKeys []string
	for _, row := range rows {
		if colName, ok := row["COLUMN_NAME"].(string); ok {
			primaryKeys = append(primaryKeys, colName)
		}
	}

	return primaryKeys, nil
}

// sanitizeError converts Oracle errors to user-friendly messages
func (c *OracleConnector) sanitizeError(err error) error {
	if err == nil {
		return nil
	}

	errMsg := err.Error()

	// Map common Oracle errors to user-friendly messages
	errorMappings := map[string]string{
		"ORA-12154": "Invalid service name or SID. Please check connection details.",
		"ORA-01017": "Authentication failed. Please check username and password.",
		"ORA-12541": "Oracle listener not running. Please verify the database is accessible.",
		"ORA-12170": "Connection timeout. Please check network connectivity and firewall settings.",
		"ORA-28000": "Account is locked. Please contact your database administrator.",
		"ORA-01033": "Oracle initialization or shutdown in progress.",
		"ORA-01034": "Oracle not available. Database is not running.",
	}

	// Check if error message contains known Oracle error codes
	for code, friendlyMsg := range errorMappings {
		if contains(errMsg, code) {
			return fmt.Errorf("%s (Original: %s)", friendlyMsg, code)
		}
	}

	// Return sanitized error (remove sensitive connection details)
	return fmt.Errorf("database error: %w", err)
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsMiddle(s, substr)))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
