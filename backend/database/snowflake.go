package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/snowflakedb/gosnowflake" // Snowflake driver
)

// SnowflakeConfig holds Snowflake connection configuration
type SnowflakeConfig struct {
	// Required connection parameters
	Account   string // Account identifier (e.g., "xy12345" or "xy12345.us-east-1")
	Username  string
	Password  string
	Warehouse string // Virtual warehouse name
	Database  string
	Schema    string // Default: "PUBLIC"

	// Optional parameters
	Role          string // User role (e.g., "ACCOUNTADMIN", "SYSADMIN")
	Region        string // AWS region (e.g., "us-east-1")
	Cloud         string // Cloud provider (aws, azure, gcp)
	Authenticator string // Authentication method (default: "snowflake")

	// Connection settings
	Timeout         int // Login timeout in seconds
	MaxPoolSize     int // Maximum connection pool size
	MaxIdleConns    int // Minimum idle connections
	ConnMaxLifetime int // Connection max lifetime in minutes
}

// SnowflakeConnector manages Snowflake database connections
type SnowflakeConnector struct {
	db     *sql.DB
	config *SnowflakeConfig
}

// NewSnowflakeConnector creates a new Snowflake connector
func NewSnowflakeConnector(config *SnowflakeConfig) *SnowflakeConnector {
	// Set defaults
	if config.Schema == "" {
		config.Schema = "PUBLIC"
	}
	if config.Timeout == 0 {
		config.Timeout = 30
	}
	if config.MaxPoolSize == 0 {
		config.MaxPoolSize = 25
	}
	if config.MaxIdleConns == 0 {
		config.MaxIdleConns = 5
	}
	if config.ConnMaxLifetime == 0 {
		config.ConnMaxLifetime = 60 // 1 hour
	}
	if config.Authenticator == "" {
		config.Authenticator = "snowflake"
	}

	return &SnowflakeConnector{
		config: config,
	}
}

// buildDSN constructs Snowflake connection string
// Format: username:password@account/database/schema?warehouse=wh&role=role
func (c *SnowflakeConnector) buildDSN() string {
	// Build account identifier
	account := c.config.Account

	// Add region and cloud if specified
	if c.config.Region != "" && c.config.Cloud != "" {
		// Full format: account.region.cloud_provider
		account = fmt.Sprintf("%s.%s.%s", c.config.Account, c.config.Region, c.config.Cloud)
	} else if c.config.Region != "" {
		// Legacy format: account.region
		account = fmt.Sprintf("%s.%s", c.config.Account, c.config.Region)
	}

	// Build DSN
	// username:password@account/database/schema?warehouse=wh&param=value
	dsn := fmt.Sprintf("%s:%s@%s/%s/%s",
		c.config.Username,
		c.config.Password,
		account,
		c.config.Database,
		c.config.Schema,
	)

	// Add query parameters
	params := []string{}
	if c.config.Warehouse != "" {
		params = append(params, fmt.Sprintf("warehouse=%s", c.config.Warehouse))
	}
	if c.config.Role != "" {
		params = append(params, fmt.Sprintf("role=%s", c.config.Role))
	}
	if c.config.Authenticator != "snowflake" {
		params = append(params, fmt.Sprintf("authenticator=%s", c.config.Authenticator))
	}
	if c.config.Timeout > 0 {
		params = append(params, fmt.Sprintf("loginTimeout=%d", c.config.Timeout))
	}

	if len(params) > 0 {
		dsn += "?" + strings.Join(params, "&")
	}

	return dsn
}

// Connect establishes connection to Snowflake
func (c *SnowflakeConnector) Connect() error {
	dsn := c.buildDSN()

	// Don't log DSN (contains password)
	log.Printf("🔌 Connecting to Snowflake: %s@%s/%s/%s (warehouse: %s)",
		c.config.Username, c.config.Account, c.config.Database, c.config.Schema, c.config.Warehouse)

	// Open database connection
	db, err := sql.Open("snowflake", dsn)
	if err != nil {
		return fmt.Errorf("failed to open connection: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(c.config.MaxPoolSize)
	db.SetMaxIdleConns(c.config.MaxIdleConns)
	db.SetConnMaxLifetime(time.Duration(c.config.ConnMaxLifetime) * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		db.Close()
		return c.sanitizeError(err)
	}

	c.db = db
	log.Printf("✅ Connected to Snowflake: %s/%s", c.config.Database, c.config.Schema)
	return nil
}

// Disconnect closes the Snowflake connection
func (c *SnowflakeConnector) Disconnect() error {
	if c.db != nil {
		log.Printf("🔌 Disconnecting from Snowflake: %s", c.config.Account)
		return c.db.Close()
	}
	return nil
}

// Ping tests the Snowflake connection
func (c *SnowflakeConnector) Ping() error {
	if c.db == nil {
		return fmt.Errorf("database connection not established")
	}
	return c.db.Ping()
}

// GetDB returns the underlying database connection
func (c *SnowflakeConnector) GetDB() *sql.DB {
	return c.db
}

// GetDatabases retrieves all databases
func (c *SnowflakeConnector) GetDatabases() ([]string, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	query := "SHOW DATABASES"
	rows, err := c.db.Query(query)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer rows.Close()

	var databases []string
	for rows.Next() {
		var (
			createdOn     string
			name          string
			isDefault     string
			isCurrent     string
			origin        string
			owner         string
			comment       sql.NullString
			options       sql.NullString
			retentionTime string
		)
		if err := rows.Scan(&createdOn, &name, &isDefault, &isCurrent, &origin, &owner, &comment, &options, &retentionTime); err != nil {
			continue
		}
		databases = append(databases, name)
	}

	return databases, nil
}

// GetSchemas retrieves all schemas in the current database
func (c *SnowflakeConnector) GetSchemas() ([]string, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	query := "SHOW SCHEMAS"
	rows, err := c.db.Query(query)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer rows.Close()

	var schemas []string
	for rows.Next() {
		var (
			createdOn     string
			name          string
			isDefault     string
			isCurrent     string
			databaseName  string
			owner         string
			comment       sql.NullString
			options       sql.NullString
			retentionTime string
		)
		if err := rows.Scan(&createdOn, &name, &isDefault, &isCurrent, &databaseName, &owner, &comment, &options, &retentionTime); err != nil {
			continue
		}
		schemas = append(schemas, name)
	}

	return schemas, nil
}

// GetTables retrieves all tables and views
func (c *SnowflakeConnector) GetTables() ([]TableInfo, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	// Get tables
	tablesQuery := fmt.Sprintf("SHOW TABLES IN SCHEMA %s.%s", c.config.Database, c.config.Schema)
	tables, err := c.execShowQuery(tablesQuery, "TABLE")
	if err != nil {
		return nil, err
	}

	// Get views
	viewsQuery := fmt.Sprintf("SHOW VIEWS IN SCHEMA %s.%s", c.config.Database, c.config.Schema)
	views, err := c.execShowQuery(viewsQuery, "VIEW")
	if err != nil {
		return nil, err
	}

	// Combine results
	return append(tables, views...), nil
}

// execShowQuery executes SHOW TABLES/VIEWS query
func (c *SnowflakeConnector) execShowQuery(query string, tableType string) ([]TableInfo, error) {
	rows, err := c.db.Query(query)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		var (
			createdOn           string
			name                string
			databaseName        string
			schemaName          string
			kind                sql.NullString
			comment             sql.NullString
			clusterBy           sql.NullString
			rows_               sql.NullInt64
			bytes_              sql.NullInt64
			owner               sql.NullString
			retentionTime       sql.NullString
			automaticClustering sql.NullString
			changeTracking      sql.NullString
		)

		// SHOW TABLES returns different columns than SHOW VIEWS
		if tableType == "TABLE" {
			if err := rows.Scan(&createdOn, &name, &databaseName, &schemaName, &kind, &comment,
				&clusterBy, &rows_, &bytes_, &owner, &retentionTime, &automaticClustering, &changeTracking); err != nil {
				continue
			}
		} else {
			// SHOW VIEWS has fewer columns
			if err := rows.Scan(&createdOn, &name, &databaseName, &schemaName, &comment,
				&owner, &retentionTime, &changeTracking); err != nil {
				continue
			}
		}

		tables = append(tables, TableInfo{
			Schema: schemaName,
			Name:   name,
			Type:   tableType,
		})
	}

	return tables, nil
}

// GetColumns retrieves column metadata for a table
func (c *SnowflakeConnector) GetColumns(tableName string) ([]ColumnInfo, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	query := fmt.Sprintf("DESCRIBE TABLE %s.%s.%s", c.config.Database, c.config.Schema, tableName)
	rows, err := c.db.Query(query)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var (
			name         string
			dataType     string
			kind         string
			nullable     string
			defaultValue sql.NullString
			primaryKey   string
			uniqueKey    string
			check        sql.NullString
			expression   sql.NullString
			comment      sql.NullString
			policyName   sql.NullString
		)

		if err := rows.Scan(&name, &dataType, &kind, &nullable, &defaultValue,
			&primaryKey, &uniqueKey, &check, &expression, &comment, &policyName); err != nil {
			continue
		}

		columns = append(columns, ColumnInfo{
			Name:     name,
			DataType: dataType,
			Nullable: nullable == "Y",
		})
	}

	return columns, nil
}

// GetWarehouses retrieves all virtual warehouses
func (c *SnowflakeConnector) GetWarehouses() ([]string, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	query := "SHOW WAREHOUSES"
	rows, err := c.db.Query(query)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer rows.Close()

	var warehouses []string
	for rows.Next() {
		var (
			name            string
			state           string
			typ             string
			size            string
			minClusterCount int
			maxClusterCount int
			startedClusters int
			running         int
			queued          int
			isDefault       string
			isCurrent       string
			autoSuspend     sql.NullInt64
			autoResume      string
			available       sql.NullString
			provisioning    sql.NullString
			quiescing       sql.NullString
			other           sql.NullString
			createdOn       string
			resumedOn       sql.NullString
			updatedOn       sql.NullString
			owner           string
			comment         sql.NullString
			resourceMonitor string
			actives         sql.NullInt64
			pendings        sql.NullInt64
			failed          sql.NullInt64
			suspended       sql.NullInt64
			uuid            sql.NullString
			scalingPolicy   sql.NullString
		)

		if err := rows.Scan(&name, &state, &typ, &size, &minClusterCount, &maxClusterCount,
			&startedClusters, &running, &queued, &isDefault, &isCurrent, &autoSuspend, &autoResume,
			&available, &provisioning, &quiescing, &other, &createdOn, &resumedOn, &updatedOn,
			&owner, &comment, &resourceMonitor, &actives, &pendings, &failed, &suspended, &uuid, &scalingPolicy); err != nil {
			continue
		}

		warehouses = append(warehouses, name)
	}

	return warehouses, nil
}

// ExecuteQuery executes a SQL query and returns results
func (c *SnowflakeConnector) ExecuteQuery(query string) (*sql.Rows, error) {
	if c.db == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	rows, err := c.db.Query(query)
	if err != nil {
		return nil, c.sanitizeError(err)
	}

	return rows, nil
}

// sanitizeError converts Snowflake errors to user-friendly messages
func (c *SnowflakeConnector) sanitizeError(err error) error {
	if err == nil {
		return nil
	}

	errMsg := err.Error()

	// Map common Snowflake errors
	errorMappings := map[string]string{
		"390144": "Invalid account identifier. Please check your account name and region.",
		"390100": "Authentication failed. Please check username and password.",
		"390189": "Warehouse does not exist or not authorized to use.",
		"002003": "Database does not exist or not authorized to access.",
		"002043": "Schema does not exist.",
		"090006": "Connection timeout. Please check network connectivity.",
		"390201": "Role does not exist or not authorized to use.",
		"000605": "Network error. Please check your connection.",
	}

	// Check if error message contains known error codes
	for code, friendlyMsg := range errorMappings {
		if strings.Contains(errMsg, code) {
			return fmt.Errorf("%s", friendlyMsg)
		}
	}

	// Return sanitized error
	return fmt.Errorf("database error: %w", err)
}
