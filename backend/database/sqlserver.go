package database

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	_ "github.com/denisenkom/go-mssqldb" // SQL Server driver
)

// SQLServerConfig holds SQL Server connection configuration
type SQLServerConfig struct {
	Host               string
	Port               int
	Instance           string // Optional named instance (e.g., SQLEXPRESS)
	Database           string
	Username           string
	Password           string
	AuthType           string // "sql" or "windows"
	Encrypt            string // "disable", "false", "true"
	TrustServerCert    bool
	ConnectionTimeout  int // seconds
	MaxOpenConnections int
	MaxIdleConnections int
	ConnMaxLifetime    int // minutes
}

// SQLServerConnector manages SQL Server database connections
type SQLServerConnector struct {
	db     *sql.DB
	config *SQLServerConfig
}

// NewSQLServerConnector creates a new SQL Server connector
func NewSQLServerConnector(config *SQLServerConfig) *SQLServerConnector {
	// Set defaults
	if config.Port == 0 {
		config.Port = 1433
	}
	if config.ConnectionTimeout == 0 {
		config.ConnectionTimeout = 30
	}
	if config.MaxOpenConnections == 0 {
		config.MaxOpenConnections = 25
	}
	if config.MaxIdleConnections == 0 {
		config.MaxIdleConnections = 5
	}
	if config.ConnMaxLifetime == 0 {
		config.ConnMaxLifetime = 60 // 1 hour
	}
	if config.Encrypt == "" {
		config.Encrypt = "true" // Default to encrypted
	}

	return &SQLServerConnector{
		config: config,
	}
}

// buildConnectionString constructs SQL Server connection string
func (c *SQLServerConnector) buildConnectionString() string {
	// Build server address
	server := c.config.Host
	if c.config.Instance != "" {
		server = fmt.Sprintf("%s\\%s", c.config.Host, c.config.Instance)
	}

	// Build query parameters
	query := url.Values{}
	query.Add("database", c.config.Database)
	query.Add("connection timeout", fmt.Sprintf("%d", c.config.ConnectionTimeout))
	query.Add("encrypt", c.config.Encrypt)

	if c.config.TrustServerCert {
		query.Add("TrustServerCertificate", "true")
	}

	// Windows Authentication
	if strings.ToLower(c.config.AuthType) == "windows" {
		query.Add("trusted_connection", "true")
		// For Windows Auth, use ADO format
		return fmt.Sprintf("sqlserver://%s:%d?%s", server, c.config.Port, query.Encode())
	}

	// SQL Server Authentication
	u := &url.URL{
		Scheme: "sqlserver",
		User:   url.UserPassword(c.config.Username, c.config.Password),
		Host:   fmt.Sprintf("%s:%d", server, c.config.Port),
	}
	u.RawQuery = query.Encode()

	return u.String()
}

// Connect establishes connection to SQL Server
func (c *SQLServerConnector) Connect() error {
	connString := c.buildConnectionString()

	// Don't log connection string (contains password)
	log.Printf("🔌 Connecting to SQL Server: %s@%s/%s", c.config.Username, c.config.Host, c.config.Database)

	db, err := sql.Open("sqlserver", connString)
	if err != nil {
		return fmt.Errorf("failed to open connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(c.config.MaxOpenConnections)
	db.SetMaxIdleConns(c.config.MaxIdleConnections)
	db.SetConnMaxLifetime(time.Duration(c.config.ConnMaxLifetime) * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return fmt.Errorf("failed to ping database: %w", err)
	}

	c.db = db
	log.Printf("✅ Connected to SQL Server: %s/%s", c.config.Host, c.config.Database)
	return nil
}

// Disconnect closes the SQL Server connection
func (c *SQLServerConnector) Disconnect() error {
	if c.db != nil {
		log.Printf("🔌 Disconnecting from SQL Server: %s/%s", c.config.Host, c.config.Database)
		return c.db.Close()
	}
	return nil
}

// Ping tests the SQL Server connection
func (c *SQLServerConnector) Ping() error {
	if c.db == nil {
		return fmt.Errorf("database connection not established")
	}
	return c.db.Ping()
}

// GetDB returns the underlying *sql.DB
func (c *SQLServerConnector) GetDB() *sql.DB {
	return c.db
}

// ExecuteQuery executes a SELECT query and returns results
func (c *SQLServerConnector) ExecuteQuery(query string, args ...interface{}) ([]map[string]interface{}, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("query execution failed: %w", err)
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
func (c *SQLServerConnector) ExecuteNonQuery(query string, args ...interface{}) (int64, error) {
	if c.db == nil {
		return 0, fmt.Errorf("database connection not established")
	}

	result, err := c.db.Exec(query, args...)
	if err != nil {
		return 0, fmt.Errorf("query execution failed: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

// GetTables retrieves all tables from the database
func (c *SQLServerConnector) GetTables() ([]TableInfo, error) {
	query := `
		SELECT 
			TABLE_SCHEMA,
			TABLE_NAME,
			TABLE_TYPE
		FROM INFORMATION_SCHEMA.TABLES
		WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
		ORDER BY TABLE_SCHEMA, TABLE_NAME
	`

	rows, err := c.ExecuteQuery(query)
	if err != nil {
		return nil, err
	}

	var tables []TableInfo
	for _, row := range rows {
		table := TableInfo{
			Schema: row["TABLE_SCHEMA"].(string),
			Name:   row["TABLE_NAME"].(string),
			Type:   row["TABLE_TYPE"].(string),
		}
		tables = append(tables, table)
	}

	return tables, nil
}

// GetColumns retrieves columns for a specific table
func (c *SQLServerConnector) GetColumns(schema, tableName string) ([]ColumnInfo, error) {
	query := `
		SELECT 
			COLUMN_NAME,
			DATA_TYPE,
			IS_NULLABLE,
			CHARACTER_MAXIMUM_LENGTH,
			NUMERIC_PRECISION,
			NUMERIC_SCALE,
			COLUMN_DEFAULT
		FROM INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_SCHEMA = @p1 AND TABLE_NAME = @p2
		ORDER BY ORDINAL_POSITION
	`

	rows, err := c.ExecuteQuery(query, schema, tableName)
	if err != nil {
		return nil, err
	}

	var columns []ColumnInfo
	for _, row := range rows {
		column := ColumnInfo{
			Name:     row["COLUMN_NAME"].(string),
			DataType: row["DATA_TYPE"].(string),
			Nullable: row["IS_NULLABLE"].(string) == "YES",
		}

		// Optional fields
		if val, ok := row["CHARACTER_MAXIMUM_LENGTH"].(int64); ok {
			column.MaxLength = &val
		}
		if val, ok := row["NUMERIC_PRECISION"].(int64); ok {
			precision := int(val)
			column.Precision = &precision
		}
		if val, ok := row["NUMERIC_SCALE"].(int64); ok {
			scale := int(val)
			column.Scale = &scale
		}
		if val, ok := row["COLUMN_DEFAULT"].(string); ok && val != "" {
			column.Default = &val
		}

		columns = append(columns, column)
	}

	return columns, nil
}

// GetDatabases retrieves all available databases on the server
func (c *SQLServerConnector) GetDatabases() ([]string, error) {
	query := `
		SELECT name 
		FROM sys.databases
		WHERE state_desc = 'ONLINE'
		  AND name NOT IN ('master', 'tempdb', 'model', 'msdb')
		ORDER BY name
	`

	rows, err := c.ExecuteQuery(query)
	if err != nil {
		return nil, err
	}

	var databases []string
	for _, row := range rows {
		if name, ok := row["name"].(string); ok {
			databases = append(databases, name)
		}
	}

	return databases, nil
}

// GetPrimaryKeys retrieves primary key columns for a table
func (c *SQLServerConnector) GetPrimaryKeys(schema, tableName string) ([]string, error) {
	query := `
		SELECT COLUMN_NAME
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
		WHERE TABLE_SCHEMA = @p1 
		  AND TABLE_NAME = @p2
		  AND CONSTRAINT_NAME LIKE 'PK_%'
		ORDER BY ORDINAL_POSITION
	`

	rows, err := c.ExecuteQuery(query, schema, tableName)
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

// TableInfo represents table metadata
type TableInfo struct {
	Schema string `json:"schema"`
	Name   string `json:"name"`
	Type   string `json:"type"` // TABLE or VIEW
}

// ColumnInfo represents column metadata
type ColumnInfo struct {
	Name      string  `json:"name"`
	DataType  string  `json:"data_type"`
	Nullable  bool    `json:"nullable"`
	MaxLength *int64  `json:"max_length,omitempty"`
	Precision *int    `json:"precision,omitempty"`
	Scale     *int    `json:"scale,omitempty"`
	Default   *string `json:"default,omitempty"`
}
