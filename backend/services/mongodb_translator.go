package services

import (
	"encoding/json"
	"fmt"
	"insight-engine-backend/database"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// MongoDBTranslator converts MongoDB documents to SQL-like tabular format
type MongoDBTranslator struct {
	connector *database.MongoDBConnector
}

// NewMongoDBTranslator creates a new MongoDB translator
func NewMongoDBTranslator(connector *database.MongoDBConnector) *MongoDBTranslator {
	return &MongoDBTranslator{
		connector: connector,
	}
}

// ConvertToTableFormat executes query and converts results to tabular format
func (t *MongoDBTranslator) ConvertToTableFormat(
	collection string,
	filter bson.M,
	limit int64,
) ([]map[string]interface{}, error) {
	// 1. Execute MongoDB query
	docs, err := t.connector.FindDocuments(collection, filter, limit)
	if err != nil {
		return nil, err
	}

	if len(docs) == 0 {
		return []map[string]interface{}{}, nil
	}

	// 2. Flatten all documents
	var flattenedDocs []map[string]interface{}
	allColumns := make(map[string]bool)

	for _, doc := range docs {
		flattened := t.FlattenDocument(doc, "")
		flattenedDocs = append(flattenedDocs, flattened)

		// Track all columns across all documents
		for col := range flattened {
			allColumns[col] = true
		}
	}

	// 3. Normalize rows - ensure all rows have the same columns
	normalized := t.NormalizeRows(flattenedDocs, allColumns)

	return normalized, nil
}

// ConvertAggregationToTable converts aggregation pipeline results to tabular format
func (t *MongoDBTranslator) ConvertAggregationToTable(
	collection string,
	pipeline []bson.M,
) ([]map[string]interface{}, error) {
	// Execute aggregation
	docs, err := t.connector.ExecuteAggregation(collection, pipeline)
	if err != nil {
		return nil, err
	}

	if len(docs) == 0 {
		return []map[string]interface{}{}, nil
	}

	// Flatten and normalize
	var flattenedDocs []map[string]interface{}
	allColumns := make(map[string]bool)

	for _, doc := range docs {
		flattened := t.FlattenDocument(doc, "")
		flattenedDocs = append(flattenedDocs, flattened)

		for col := range flattened {
			allColumns[col] = true
		}
	}

	normalized := t.NormalizeRows(flattenedDocs, allColumns)

	return normalized, nil
}

// FlattenDocument recursively flattens nested MongoDB document
// Converts:
//
//	{_id: ObjectId(...), user: {name: "John", age: 30}, tags: ["go", "js"]}
//
// To:
//
//	{_id: "507f1f77bcf86cd799439011", user_name: "John", user_age: 30, tags: "go,js"}
func (t *MongoDBTranslator) FlattenDocument(doc bson.M, prefix string) map[string]interface{} {
	result := make(map[string]interface{})

	for key, value := range doc {
		// Build field name with prefix
		fieldName := key
		if prefix != "" {
			fieldName = prefix + "_" + key
		}

		// Check if value is a map type first (bson.M and primitive.M are aliases)
		if mapVal, ok := value.(bson.M); ok {
			// Nested object - recurse
			nested := t.FlattenDocument(mapVal, fieldName)
			for nestedKey, nestedVal := range nested {
				result[nestedKey] = nestedVal
			}
			continue
		}

		// Handle different types
		switch v := value.(type) {
		case primitive.A: // Array - convert to comma-separated string
			result[fieldName] = t.arrayToString(v)

		case []interface{}: // Array (alternative type)
			result[fieldName] = t.arrayToString(primitive.A(v))

		case primitive.ObjectID: // ObjectID - convert to hex string
			result[fieldName] = v.Hex()

		case primitive.DateTime: // DateTime - convert to ISO8601 string
			t := v.Time()
			result[fieldName] = t.Format(time.RFC3339)

		case time.Time: // Go time.Time
			result[fieldName] = v.Format(time.RFC3339)

		case primitive.Binary: // Binary data - base64 encode
			result[fieldName] = fmt.Sprintf("binary(%d bytes)", len(v.Data))

		case primitive.Regex: // Regex - convert to string
			result[fieldName] = fmt.Sprintf("/%s/%s", v.Pattern, v.Options)

		case primitive.Timestamp: // Timestamp
			result[fieldName] = fmt.Sprintf("Timestamp(%d, %d)", v.T, v.I)

		case nil: // NULL value
			result[fieldName] = nil

		default: // All other types (string, int, float, bool)
			result[fieldName] = v
		}
	}

	return result
}

// arrayToString converts MongoDB array to comma-separated string
func (t *MongoDBTranslator) arrayToString(arr primitive.A) string {
	if len(arr) == 0 {
		return ""
	}

	var elements []string
	for _, elem := range arr {
		// Check if element is a map type first
		if mapElem, ok := elem.(bson.M); ok {
			// For nested objects in array, convert to JSON
			jsonBytes, err := json.Marshal(mapElem)
			if err == nil {
				elements = append(elements, string(jsonBytes))
			}
			continue
		}

		// Handle different element types
		switch v := elem.(type) {
		case primitive.ObjectID:
			elements = append(elements, v.Hex())
		case nil:
			elements = append(elements, "null")
		default:
			elements = append(elements, fmt.Sprintf("%v", v))
		}
	}

	// Join with comma
	result := ""
	for i, elem := range elements {
		if i > 0 {
			result += ","
		}
		result += elem
	}

	return result
}

// NormalizeRows ensures all rows have the same columns
// Missing fields are filled with nil
func (t *MongoDBTranslator) NormalizeRows(
	rows []map[string]interface{},
	allColumns map[string]bool,
) []map[string]interface{} {
	var normalized []map[string]interface{}

	for _, row := range rows {
		normalizedRow := make(map[string]interface{})

		// Add all columns to this row
		for col := range allColumns {
			if val, exists := row[col]; exists {
				normalizedRow[col] = val
			} else {
				normalizedRow[col] = nil
			}
		}

		normalized = append(normalized, normalizedRow)
	}

	return normalized
}

// GetCollectionSchema infers schema from collection
func (t *MongoDBTranslator) GetCollectionSchema(collection string, sampleSize int64) ([]database.ColumnInfo, error) {
	return t.connector.InferSchema(collection, sampleSize)
}

// ParseFilter parses JSON filter string to bson.M
func (t *MongoDBTranslator) ParseFilter(filterJSON string) (bson.M, error) {
	if filterJSON == "" || filterJSON == "{}" {
		return bson.M{}, nil
	}

	var filter bson.M
	if err := json.Unmarshal([]byte(filterJSON), &filter); err != nil {
		return nil, fmt.Errorf("invalid JSON filter: %w", err)
	}

	return filter, nil
}

// ParseAggregationPipeline parses JSON aggregation pipeline
func (t *MongoDBTranslator) ParseAggregationPipeline(pipelineJSON string) ([]bson.M, error) {
	if pipelineJSON == "" || pipelineJSON == "[]" {
		return []bson.M{}, nil
	}

	var pipeline []bson.M
	if err := json.Unmarshal([]byte(pipelineJSON), &pipeline); err != nil {
		return nil, fmt.Errorf("invalid JSON pipeline: %w", err)
	}

	return pipeline, nil
}

// GetTablePreview gets a preview of collection data (first N rows)
func (t *MongoDBTranslator) GetTablePreview(collection string, limit int64) ([]map[string]interface{}, error) {
	// Query with empty filter to get all documents
	filter := bson.M{}
	return t.ConvertToTableFormat(collection, filter, limit)
}
