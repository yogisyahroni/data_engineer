package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// MongoDBConfig holds MongoDB connection configuration
type MongoDBConfig struct {
	// Connection method
	UseURI bool   // If true, use ConnectionURI; otherwise build from parts
	URI    string // Full connection string (mongodb:// or mongodb+srv://)

	// Manual configuration (used if UseURI is false)
	Host       string
	Port       int
	Database   string
	Username   string
	Password   string
	AuthSource string // Default: "admin"

	// Advanced options
	ReplicaSet string // Optional replica set name
	TLS        bool
	TLSCAFile  string // Path to CA certificate file

	// Connection settings
	Timeout         int // Connection timeout in seconds
	MaxPoolSize     int // Maximum connection pool size
	MinPoolSize     int // Minimum connection pool size
	MaxConnIdleTime int // Max idle time in minutes
}

// MongoDBConnector manages MongoDB database connections
type MongoDBConnector struct {
	client *mongo.Client
	db     *mongo.Database
	config *MongoDBConfig
}

// NewMongoDBConnector creates a new MongoDB connector
func NewMongoDBConnector(config *MongoDBConfig) *MongoDBConnector {
	// Set defaults
	if config.Port == 0 {
		config.Port = 27017
	}
	if config.AuthSource == "" {
		config.AuthSource = "admin"
	}
	if config.Timeout == 0 {
		config.Timeout = 30
	}
	if config.MaxPoolSize == 0 {
		config.MaxPoolSize = 25
	}
	if config.MinPoolSize == 0 {
		config.MinPoolSize = 5
	}
	if config.MaxConnIdleTime == 0 {
		config.MaxConnIdleTime = 60 // 1 hour
	}

	return &MongoDBConnector{
		config: config,
	}
}

// buildConnectionString constructs MongoDB connection string
func (c *MongoDBConnector) buildConnectionString() string {
	// If URI is provided, use it directly
	if c.config.UseURI && c.config.URI != "" {
		return c.config.URI
	}

	// Build connection string from parts
	uri := "mongodb://"

	// Add credentials if provided
	if c.config.Username != "" && c.config.Password != "" {
		uri += fmt.Sprintf("%s:%s@", c.config.Username, c.config.Password)
	}

	// Add host:port
	uri += fmt.Sprintf("%s:%d", c.config.Host, c.config.Port)

	// Add database
	if c.config.Database != "" {
		uri += fmt.Sprintf("/%s", c.config.Database)
	} else {
		uri += "/"
	}

	// Add query parameters
	params := ""
	if c.config.AuthSource != "" && c.config.Username != "" {
		params += fmt.Sprintf("authSource=%s", c.config.AuthSource)
	}
	if c.config.ReplicaSet != "" {
		if params != "" {
			params += "&"
		}
		params += fmt.Sprintf("replicaSet=%s", c.config.ReplicaSet)
	}
	if c.config.TLS {
		if params != "" {
			params += "&"
		}
		params += "tls=true"
	}

	if params != "" {
		uri += "?" + params
	}

	return uri
}

// Connect establishes connection to MongoDB
func (c *MongoDBConnector) Connect() error {
	connString := c.buildConnectionString()

	// Don't log connection string (contains password)
	log.Printf("🔌 Connecting to MongoDB: %s@%s:%d/%s",
		c.config.Username, c.config.Host, c.config.Port, c.config.Database)

	// Create client options
	clientOpts := options.Client().ApplyURI(connString)

	// Set connection pool settings
	clientOpts.SetMaxPoolSize(uint64(c.config.MaxPoolSize))
	clientOpts.SetMinPoolSize(uint64(c.config.MinPoolSize))
	clientOpts.SetMaxConnIdleTime(time.Duration(c.config.MaxConnIdleTime) * time.Minute)

	// Set timeout
	clientOpts.SetServerSelectionTimeout(time.Duration(c.config.Timeout) * time.Second)

	// TLS configuration
	if c.config.TLS && c.config.TLSCAFile != "" {
		// Note: Advanced TLS config with CA file would go here
		// For now, basic TLS is handled in connection string
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(c.config.Timeout)*time.Second)
	defer cancel()

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	// Ping to verify connection
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		client.Disconnect(ctx)
		return c.sanitizeError(err)
	}

	c.client = client

	// Get database reference
	if c.config.Database != "" {
		c.db = client.Database(c.config.Database)
	}

	log.Printf("✅ Connected to MongoDB: %s:%d/%s", c.config.Host, c.config.Port, c.config.Database)
	return nil
}

// Disconnect closes the MongoDB connection
func (c *MongoDBConnector) Disconnect() error {
	if c.client != nil {
		log.Printf("🔌 Disconnecting from MongoDB: %s:%d", c.config.Host, c.config.Port)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return c.client.Disconnect(ctx)
	}
	return nil
}

// Ping tests the MongoDB connection
func (c *MongoDBConnector) Ping() error {
	if c.client == nil {
		return fmt.Errorf("database connection not established")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return c.client.Ping(ctx, readpref.Primary())
}

// GetClient returns the underlying MongoDB client
func (c *MongoDBConnector) GetClient() *mongo.Client {
	return c.client
}

// GetDatabase returns the database reference
func (c *MongoDBConnector) GetDatabase() *mongo.Database {
	return c.db
}

// SetDatabase sets the active database
func (c *MongoDBConnector) SetDatabase(dbName string) {
	if c.client != nil {
		c.db = c.client.Database(dbName)
		c.config.Database = dbName
	}
}

// ListDatabases retrieves all databases
func (c *MongoDBConnector) ListDatabases() ([]string, error) {
	if c.client == nil {
		return nil, fmt.Errorf("database connection not established")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	databases, err := c.client.ListDatabaseNames(ctx, bson.M{})
	if err != nil {
		return nil, c.sanitizeError(err)
	}

	return databases, nil
}

// GetCollections retrieves all collections in the current database
func (c *MongoDBConnector) GetCollections() ([]TableInfo, error) {
	if c.db == nil {
		return nil, fmt.Errorf("no database selected")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collections, err := c.db.ListCollectionNames(ctx, bson.M{})
	if err != nil {
		return nil, c.sanitizeError(err)
	}

	var tables []TableInfo
	for _, collName := range collections {
		tables = append(tables, TableInfo{
			Schema: c.config.Database,
			Name:   collName,
			Type:   "COLLECTION",
		})
	}

	return tables, nil
}

// GetDocumentCount returns the number of documents in a collection
func (c *MongoDBConnector) GetDocumentCount(collection string) (int64, error) {
	if c.db == nil {
		return 0, fmt.Errorf("no database selected")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	coll := c.db.Collection(collection)
	count, err := coll.CountDocuments(ctx, bson.M{})
	if err != nil {
		return 0, c.sanitizeError(err)
	}

	return count, nil
}

// FindDocuments queries documents from a collection
func (c *MongoDBConnector) FindDocuments(collection string, filter bson.M, limit int64) ([]bson.M, error) {
	if c.db == nil {
		return nil, fmt.Errorf("no database selected")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	coll := c.db.Collection(collection)

	// Create find options
	findOpts := options.Find()
	if limit > 0 {
		findOpts.SetLimit(limit)
	}

	// Execute query
	cursor, err := coll.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer cursor.Close(ctx)

	// Decode results
	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, c.sanitizeError(err)
	}

	return results, nil
}

// ExecuteAggregation runs an aggregation pipeline
func (c *MongoDBConnector) ExecuteAggregation(collection string, pipeline []bson.M) ([]bson.M, error) {
	if c.db == nil {
		return nil, fmt.Errorf("no database selected")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	coll := c.db.Collection(collection)

	// Convert []bson.M to []interface{} for pipeline
	pipelineInterface := make([]interface{}, len(pipeline))
	for i, stage := range pipeline {
		pipelineInterface[i] = stage
	}

	// Execute aggregation
	cursor, err := coll.Aggregate(ctx, pipelineInterface)
	if err != nil {
		return nil, c.sanitizeError(err)
	}
	defer cursor.Close(ctx)

	// Decode results
	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, c.sanitizeError(err)
	}

	return results, nil
}

// InferSchema samples collection to discover field types
func (c *MongoDBConnector) InferSchema(collection string, sampleSize int64) ([]ColumnInfo, error) {
	if c.db == nil {
		return nil, fmt.Errorf("no database selected")
	}

	// Sample documents
	filter := bson.M{}
	docs, err := c.FindDocuments(collection, filter, sampleSize)
	if err != nil {
		return nil, err
	}

	if len(docs) == 0 {
		return []ColumnInfo{}, nil
	}

	// Collect all unique field names
	fieldMap := make(map[string]bool)
	for _, doc := range docs {
		c.collectFields(doc, "", fieldMap)
	}

	// Convert to ColumnInfo slice
	var columns []ColumnInfo
	for field := range fieldMap {
		columns = append(columns, ColumnInfo{
			Name:     field,
			DataType: "VARIANT", // MongoDB field types are dynamic
			Nullable: true,      // All MongoDB fields are nullable
		})
	}

	return columns, nil
}

// collectFields recursively collects all field names (flattened)
func (c *MongoDBConnector) collectFields(doc bson.M, prefix string, fieldMap map[string]bool) {
	for key, value := range doc {
		fieldName := key
		if prefix != "" {
			fieldName = prefix + "_" + key
		}

		switch v := value.(type) {
		case bson.M: // Nested object
			c.collectFields(v, fieldName, fieldMap)
		case primitive.A: // Array - don't recurse, treat as single field
			fieldMap[fieldName] = true
		default:
			fieldMap[fieldName] = true
		}
	}
}

// sanitizeError converts MongoDB errors to user-friendly messages
func (c *MongoDBConnector) sanitizeError(err error) error {
	if err == nil {
		return nil
	}

	errMsg := err.Error()

	// Map common MongoDB errors
	errorMappings := map[string]string{
		"authentication failed":      "Authentication failed. Please check username and password.",
		"server selection timeout":   "Connection timeout. Please check host, port, and network connectivity.",
		"no reachable servers":       "Cannot reach MongoDB server. Please verify the server is running.",
		"connection refused":         "Connection refused. Please check if MongoDB is running on the specified port.",
		"does not exist":             "Database or collection does not exist.",
		"not authorized":             "Not authorized to perform this operation. Please check permissions.",
		"connection was interrupted": "Connection was interrupted. Please try again.",
	}

	// Check if error message contains known patterns
	for pattern, friendlyMsg := range errorMappings {
		if contains(errMsg, pattern) {
			return fmt.Errorf("%s", friendlyMsg)
		}
	}

	// Return sanitized error
	return fmt.Errorf("database error: %w", err)
}
