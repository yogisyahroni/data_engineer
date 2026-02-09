package services

import (
	"context"
	"database/sql"
	"fmt"
	"insight-engine-backend/models"
	"time"

	_ "github.com/denisenkom/go-mssqldb" // SQL Server driver
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	_ "github.com/sijms/go-ora/v2"         // Oracle driver
	_ "github.com/snowflakedb/gosnowflake" // Snowflake driver
	_ "go.mongodb.org/mongo-driver/mongo"  // MongoDB driver
)

// QueryExecutor handles SQL query execution across different database types
type QueryExecutor struct {
	connectionPool map[string]*sql.DB
}

// NewQueryExecutor creates a new query executor
func NewQueryExecutor() *QueryExecutor {
	return &QueryExecutor{
		connectionPool: make(map[string]*sql.DB),
	}
}

// Execute runs a SQL query and returns results
func (qe *QueryExecutor) Execute(ctx context.Context, conn *models.Connection, sqlQuery string, limit *int, offset *int) (*models.QueryResult, error) {
	startTime := time.Now()

	// Get or create database connection
	db, err := qe.getConnection(conn)
	if err != nil {
		errorMsg := err.Error()
		return &models.QueryResult{
			Error: &errorMsg,
		}, err
	}

	// Apply limit/offset if provided
	if limit != nil {
		sqlQuery = fmt.Sprintf("%s LIMIT %d", sqlQuery, *limit)
	}
	if offset != nil {
		sqlQuery = fmt.Sprintf("%s OFFSET %d", sqlQuery, *offset)
	}

	// Execute query with timeout
	queryCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	rows, err := db.QueryContext(queryCtx, sqlQuery)
	if err != nil {
		errorMsg := err.Error()
		return &models.QueryResult{
			Error: &errorMsg,
		}, err
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		errorMsg := err.Error()
		return &models.QueryResult{
			Error: &errorMsg,
		}, err
	}

	// Fetch rows
	var resultRows [][]interface{}
	for rows.Next() {
		// Create a slice of interface{} to hold each column value
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			errorMsg := err.Error()
			return &models.QueryResult{
				Error: &errorMsg,
			}, err
		}

		// Convert byte arrays to strings for JSON serialization
		for i, v := range values {
			if b, ok := v.([]byte); ok {
				values[i] = string(b)
			}
		}

		resultRows = append(resultRows, values)
	}

	if err := rows.Err(); err != nil {
		errorMsg := err.Error()
		return &models.QueryResult{
			Error: &errorMsg,
		}, err
	}

	executionTime := time.Since(startTime).Milliseconds()

	return &models.QueryResult{
		Columns:       columns,
		Rows:          resultRows,
		RowCount:      len(resultRows),
		ExecutionTime: executionTime,
	}, nil
}

// getConnection retrieves or creates a database connection
func (qe *QueryExecutor) getConnection(conn *models.Connection) (*sql.DB, error) {
	// Check if connection already exists in pool
	if db, exists := qe.connectionPool[conn.ID]; exists {
		// Verify connection is still alive
		if err := db.Ping(); err == nil {
			return db, nil
		}
		// Connection dead, remove from pool
		delete(qe.connectionPool, conn.ID)
	}

	// Create new connection
	dsn, err := qe.buildDSN(conn)
	if err != nil {
		return nil, err
	}

	db, err := sql.Open(conn.Type, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Store in pool
	qe.connectionPool[conn.ID] = db

	return db, nil
}

// buildDSN constructs a database connection string
func (qe *QueryExecutor) buildDSN(conn *models.Connection) (string, error) {
	switch conn.Type {
	case "postgres":
		host := "localhost"
		if conn.Host != nil {
			host = *conn.Host
		}
		port := 5432
		if conn.Port != nil {
			port = *conn.Port
		}
		username := ""
		if conn.Username != nil {
			username = *conn.Username
		}
		password := ""
		if conn.Password != nil {
			password = *conn.Password
		}
		return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			host, port, username, password, conn.Database), nil

	case "mysql":
		host := "localhost"
		if conn.Host != nil {
			host = *conn.Host
		}
		port := 3306
		if conn.Port != nil {
			port = *conn.Port
		}
		username := ""
		if conn.Username != nil {
			username = *conn.Username
		}
		password := ""
		if conn.Password != nil {
			password = *conn.Password
		}
		return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
			username, password, host, port, conn.Database), nil

	case "sqlserver", "mssql":
		host := "localhost"
		if conn.Host != nil {
			host = *conn.Host
		}
		port := 1433
		if conn.Port != nil {
			port = *conn.Port
		}
		username := ""
		if conn.Username != nil {
			username = *conn.Username
		}
		password := ""
		if conn.Password != nil {
			password = *conn.Password
		}

		// Build connection string for SQL Server
		// Format: sqlserver://username:password@host:port?database=dbname&encrypt=true
		return fmt.Sprintf("sqlserver://%s:%s@%s:%d?database=%s&encrypt=true&TrustServerCertificate=false",
			username, password, host, port, conn.Database), nil

	case "oracle":
		host := "localhost"
		if conn.Host != nil {
			host = *conn.Host
		}
		port := 1521
		if conn.Port != nil {
			port = *conn.Port
		}
		username := ""
		if conn.Username != nil {
			username = *conn.Username
		}
		password := ""
		if conn.Password != nil {
			password = *conn.Password
		}

		// Oracle connection using go-ora
		// Format: oracle://username:password@host:port/service_name
		serviceName := conn.Database
		return fmt.Sprintf("oracle://%s:%s@%s:%d/%s",
			username, password, host, port, serviceName), nil

	case "snowflake":
		// Snowflake DSN format: username:password@account/database/schema?warehouse=wh&role=role
		username := ""
		if conn.Username != nil {
			username = *conn.Username
		}
		password := ""
		if conn.Password != nil {
			password = *conn.Password
		}

		// Get account identifier (stored in Host field)
		account := "localhost"
		if conn.Host != nil {
			account = *conn.Host
		}

		// Get database and schema (schema stored in Port as string via Options)
		database := conn.Database
		schema := "PUBLIC" // default schema
		if conn.Options != nil {
			schemaVal, exists := (*conn.Options)["schema"]
			if exists {
				if schemaStr, ok := schemaVal.(string); ok {
					schema = schemaStr
				}
			}
		}

		// Build base DSN
		dsn := fmt.Sprintf("%s:%s@%s/%s/%s", username, password, account, database, schema)

		// Add warehouse and role from Options
		params := []string{}
		if conn.Options != nil {
			if warehouse, exists := (*conn.Options)["warehouse"]; exists {
				if warehouseStr, ok := warehouse.(string); ok {
					params = append(params, fmt.Sprintf("warehouse=%s", warehouseStr))
				}
			}
			if role, exists := (*conn.Options)["role"]; exists {
				if roleStr, ok := role.(string); ok {
					params = append(params, fmt.Sprintf("role=%s", roleStr))
				}
			}
		}

		if len(params) > 0 {
			dsn += "?" + fmt.Sprintf("%s", params[0])
			for i := 1; i < len(params); i++ {
				dsn += "&" + params[i]
			}
		}

		return dsn, nil

	default:
		return "", fmt.Errorf("unsupported database type: %s", conn.Type)
	}
}

// Close closes all database connections in the pool
func (qe *QueryExecutor) Close() error {
	for _, db := range qe.connectionPool {
		if err := db.Close(); err != nil {
			return err
		}
	}
	qe.connectionPool = make(map[string]*sql.DB)
	return nil
}
