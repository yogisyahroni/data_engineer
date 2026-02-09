package database

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"strings"
	"time"

	"cloud.google.com/go/bigquery"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

// BigQueryConfig holds BigQuery connection configuration
type BigQueryConfig struct {
	ProjectID       string // GCP Project ID
	CredentialsJSON string // Base64-encoded service account JSON
	DefaultDataset  string // Optional default dataset
	Location        string // Dataset location (e.g., "US", "EU", "asia-southeast1")
	Timeout         int    // Query timeout in seconds
}

// BigQueryConnector manages BigQuery connections
type BigQueryConnector struct {
	client *bigquery.Client
	config *BigQueryConfig
	ctx    context.Context
}

// NewBigQueryConnector creates a new BigQuery connector
func NewBigQueryConnector(config *BigQueryConfig) *BigQueryConnector {
	// Set defaults
	if config.Location == "" {
		config.Location = "US"
	}
	if config.Timeout == 0 {
		config.Timeout = 300 // 5 minutes default for BigQuery queries
	}

	return &BigQueryConnector{
		config: config,
		ctx:    context.Background(),
	}
}

// Connect establishes connection to BigQuery
func (c *BigQueryConnector) Connect() error {
	log.Printf("🔌 Connecting to BigQuery: Project=%s, Location=%s", c.config.ProjectID, c.config.Location)

	// Decode credentials from base64
	credJSON, err := base64.StdEncoding.DecodeString(c.config.CredentialsJSON)
	if err != nil {
		return fmt.Errorf("failed to decode credentials: %w", err)
	}

	// Create BigQuery client with credentials
	ctx, cancel := context.WithTimeout(c.ctx, time.Duration(c.config.Timeout)*time.Second)
	defer cancel()

	client, err := bigquery.NewClient(ctx, c.config.ProjectID, option.WithCredentialsJSON(credJSON))
	if err != nil {
		return c.sanitizeError(err)
	}

	c.client = client
	log.Printf("✅ Connected to BigQuery: Project=%s", c.config.ProjectID)
	return nil
}

// Disconnect closes the BigQuery connection
func (c *BigQueryConnector) Disconnect() error {
	if c.client != nil {
		log.Printf("🔌 Disconnecting from BigQuery: %s", c.config.ProjectID)
		return c.client.Close()
	}
	return nil
}

// Ping tests the BigQuery connection by listing datasets
func (c *BigQueryConnector) Ping() error {
	if c.client == nil {
		return fmt.Errorf("bigquery client not initialized")
	}

	// Test connection by attempting to list datasets
	ctx, cancel := context.WithTimeout(c.ctx, 10*time.Second)
	defer cancel()

	it := c.client.Datasets(ctx)
	_, err := it.Next()
	if err != nil && err != iterator.Done {
		return c.sanitizeError(err)
	}

	return nil
}

// GetClient returns the underlying BigQuery client
func (c *BigQueryConnector) GetClient() *bigquery.Client {
	return c.client
}

// GetDatasets retrieves all datasets in the project
func (c *BigQueryConnector) GetDatasets() ([]string, error) {
	if c.client == nil {
		return nil, fmt.Errorf("bigquery client not initialized")
	}

	ctx, cancel := context.WithTimeout(c.ctx, 30*time.Second)
	defer cancel()

	var datasets []string
	it := c.client.Datasets(ctx)

	for {
		dataset, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, c.sanitizeError(err)
		}
		datasets = append(datasets, dataset.DatasetID)
	}

	return datasets, nil
}

// GetTables retrieves all tables in a dataset
func (c *BigQueryConnector) GetTables(datasetID string) ([]TableInfo, error) {
	if c.client == nil {
		return nil, fmt.Errorf("bigquery client not initialized")
	}

	ctx, cancel := context.WithTimeout(c.ctx, 30*time.Second)
	defer cancel()

	dataset := c.client.Dataset(datasetID)
	it := dataset.Tables(ctx)

	var tables []TableInfo
	for {
		table, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, c.sanitizeError(err)
		}

		// Get table metadata to determine type
		metadata, err := table.Metadata(ctx)
		if err != nil {
			continue // Skip tables we can't access
		}

		tableType := "TABLE"
		if metadata.Type == bigquery.ViewTable {
			tableType = "VIEW"
		} else if metadata.Type == bigquery.MaterializedView {
			tableType = "MATERIALIZED VIEW"
		} else if metadata.Type == bigquery.ExternalTable {
			tableType = "EXTERNAL"
		}

		tables = append(tables, TableInfo{
			Schema: datasetID,
			Name:   table.TableID,
			Type:   tableType,
		})
	}

	return tables, nil
}

// GetColumns retrieves column metadata for a table
func (c *BigQueryConnector) GetColumns(datasetID, tableID string) ([]ColumnInfo, error) {
	if c.client == nil {
		return nil, fmt.Errorf("bigquery client not initialized")
	}

	ctx, cancel := context.WithTimeout(c.ctx, 30*time.Second)
	defer cancel()

	dataset := c.client.Dataset(datasetID)
	table := dataset.Table(tableID)

	metadata, err := table.Metadata(ctx)
	if err != nil {
		return nil, c.sanitizeError(err)
	}

	var columns []ColumnInfo
	for _, field := range metadata.Schema {
		columns = append(columns, ColumnInfo{
			Name:     field.Name,
			DataType: string(field.Type),
			Nullable: !field.Required,
		})
	}

	return columns, nil
}

// ExecuteQuery executes a BigQuery SQL query
func (c *BigQueryConnector) ExecuteQuery(query string) (*bigquery.RowIterator, error) {
	if c.client == nil {
		return nil, fmt.Errorf("bigquery client not initialized")
	}

	ctx, cancel := context.WithTimeout(c.ctx, time.Duration(c.config.Timeout)*time.Second)
	defer cancel()

	q := c.client.Query(query)
	q.Location = c.config.Location

	// Set default dataset if specified
	if c.config.DefaultDataset != "" {
		q.DefaultDatasetID = c.config.DefaultDataset
	}

	it, err := q.Read(ctx)
	if err != nil {
		return nil, c.sanitizeError(err)
	}

	return it, nil
}

// ExecuteQueryToSlice executes a query and returns results as slice of maps
func (c *BigQueryConnector) ExecuteQueryToSlice(query string, limit int) ([]map[string]interface{}, error) {
	it, err := c.ExecuteQuery(query)
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	count := 0

	for {
		if limit > 0 && count >= limit {
			break
		}

		var row map[string]bigquery.Value
		err := it.Next(&row)
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, c.sanitizeError(err)
		}

		// Convert BigQuery values to standard types
		result := make(map[string]interface{})
		for k, v := range row {
			result[k] = v
		}

		results = append(results, result)
		count++
	}

	return results, nil
}

// GetProjectID returns the project ID
func (c *BigQueryConnector) GetProjectID() string {
	return c.config.ProjectID
}

// ValidateCredentials validates the service account JSON structure
func ValidateBigQueryCredentials(credJSON string) error {
	// Decode from base64
	decoded, err := base64.StdEncoding.DecodeString(credJSON)
	if err != nil {
		return fmt.Errorf("invalid base64 encoding: %w", err)
	}

	// Basic validation - check for required fields
	jsonStr := string(decoded)
	requiredFields := []string{
		"\"type\"",
		"\"project_id\"",
		"\"private_key_id\"",
		"\"private_key\"",
		"\"client_email\"",
	}

	for _, field := range requiredFields {
		if !strings.Contains(jsonStr, field) {
			return fmt.Errorf("invalid service account JSON: missing %s", field)
		}
	}

	return nil
}

// sanitizeError converts BigQuery errors to user-friendly messages
func (c *BigQueryConnector) sanitizeError(err error) error {
	if err == nil {
		return nil
	}

	errMsg := err.Error()

	// Map common BigQuery errors
	if strings.Contains(errMsg, "credentials") || strings.Contains(errMsg, "authentication") {
		return fmt.Errorf("authentication failed: invalid service account credentials")
	}
	if strings.Contains(errMsg, "not found") || strings.Contains(errMsg, "404") {
		return fmt.Errorf("resource not found: check project ID, dataset, or table name")
	}
	if strings.Contains(errMsg, "permission") || strings.Contains(errMsg, "403") {
		return fmt.Errorf("permission denied: service account lacks required permissions")
	}
	if strings.Contains(errMsg, "quota") || strings.Contains(errMsg, "exceeded") {
		return fmt.Errorf("quota exceeded: BigQuery API limits reached")
	}
	if strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "deadline") {
		return fmt.Errorf("query timeout: operation took too long to complete")
	}
	if strings.Contains(errMsg, "syntax") || strings.Contains(errMsg, "invalid") {
		return fmt.Errorf("invalid query: check SQL syntax")
	}

	// Return generic error
	return fmt.Errorf("bigquery error: %w", err)
}
