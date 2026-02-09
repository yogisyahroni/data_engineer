package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"reflect"
	"strings"
	"time"

	"github.com/google/uuid"
)

// JSONImportOptions represents JSON import configuration
type JSONImportOptions struct {
	RootPath      string   `json:"rootPath"`      // JSON path to data array (e.g., "data.items")
	FlattenNested bool     `json:"flattenNested"` // Flatten nested objects
	MaxDepth      int      `json:"maxDepth"`      // Max nesting depth to flatten
	MaxRows       int      `json:"maxRows"`       // Max rows to import (0 = all)
	DetectTypes   bool     `json:"detectTypes"`   // Auto-detect column types
	NullValues    []string `json:"nullValues"`    // Values to treat as NULL
	ArrayStrategy string   `json:"arrayStrategy"` // "json", "first", "ignore"
}

// JSONPreview represents a preview of JSON data
type JSONPreview struct {
	Structure    string      `json:"structure"` // "array" or "object"
	Columns      []CSVColumn `json:"columns"`   // Reuse CSVColumn type
	Rows         [][]string  `json:"rows"`
	TotalRows    int         `json:"totalRows"`
	SampleSize   int         `json:"sampleSize"`
	DetectedPath string      `json:"detectedPath"` // Auto-detected data path
}

// JSONImportResult represents the result of JSON import
type JSONImportResult struct {
	ImportID     uuid.UUID   `json:"importId"`
	FileName     string      `json:"fileName"`
	RowsImported int         `json:"rowsImported"`
	Columns      []CSVColumn `json:"columns"`
	Errors       []string    `json:"errors,omitempty"`
	TableName    string      `json:"tableName"`
	Duration     int64       `json:"durationMs"`
}

// JSONImporter handles JSON file imports
type JSONImporter struct {
	maxFileSize int64
	sampleSize  int
	csvImporter *CSVImporter
}

// NewJSONImporter creates a new JSON importer
func NewJSONImporter() *JSONImporter {
	return &JSONImporter{
		maxFileSize: 100 * 1024 * 1024, // 100 MB
		sampleSize:  100,
		csvImporter: NewCSVImporter(),
	}
}

// ParseJSONPreview generates a preview of JSON file
func (imp *JSONImporter) ParseJSONPreview(
	ctx context.Context,
	file multipart.File,
	fileName string,
	options *JSONImportOptions,
) (*JSONPreview, error) {
	startTime := time.Now()

	// Set default options
	if options == nil {
		options = &JSONImportOptions{
			RootPath:      "",
			FlattenNested: true,
			MaxDepth:      3,
			MaxRows:       0,
			DetectTypes:   true,
			ArrayStrategy: "json", // Convert arrays to JSON strings
		}
	}

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read JSON file: %w", err)
	}

	// Parse JSON
	var data interface{}
	if err := json.Unmarshal(content, &data); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Navigate to root path if specified
	if options.RootPath != "" {
		data, err = imp.navigateJSONPath(data, options.RootPath)
		if err != nil {
			return nil, fmt.Errorf("failed to navigate to root path: %w", err)
		}
	}

	// Determine structure
	structure := "unknown"
	var rows []map[string]interface{}

	switch v := data.(type) {
	case []interface{}:
		structure = "array"
		rows = imp.convertArrayToMaps(v, options.MaxRows)
	case map[string]interface{}:
		structure = "object"
		// Try to find array property
		arrayData, path := imp.findArrayProperty(v)
		if arrayData != nil {
			rows = imp.convertArrayToMaps(arrayData, options.MaxRows)
			structure = "nested_array"
			options.RootPath = path
		} else {
			// Treat single object as one row
			rows = []map[string]interface{}{v}
		}
	default:
		return nil, errors.New("unsupported JSON structure: expected array or object")
	}

	if len(rows) == 0 {
		return nil, errors.New("no data rows found in JSON")
	}

	// Flatten nested objects if requested
	if options.FlattenNested {
		rows = imp.flattenRows(rows, options.MaxDepth, options.ArrayStrategy)
	}

	// Extract columns from schema
	columns := imp.extractColumns(rows)

	// Convert rows to string array format
	stringRows := imp.convertRowsToStrings(rows, columns)

	// Sample rows
	maxSample := imp.sampleSize
	if len(stringRows) > maxSample {
		stringRows = stringRows[:maxSample]
	}

	// Detect column types
	columnHeaders := make([]string, len(columns))
	for i, col := range columns {
		columnHeaders[i] = col.Name
	}

	detectedColumns := imp.csvImporter.detectColumnTypes(columnHeaders, stringRows, &CSVImportOptions{
		DetectTypes: options.DetectTypes,
		NullValues:  options.NullValues,
	})

	preview := &JSONPreview{
		Structure:    structure,
		Columns:      detectedColumns,
		Rows:         stringRows,
		TotalRows:    len(rows),
		SampleSize:   len(stringRows),
		DetectedPath: options.RootPath,
	}

	LogDebug("json_preview_performance", "JSON preview generated", map[string]interface{}{
		"duration_ms": time.Since(startTime).Milliseconds(),
		"total_rows":  len(rows),
		"sample_size": len(stringRows),
	})

	return preview, nil
}

// navigateJSONPath navigates to a specific path in JSON
func (imp *JSONImporter) navigateJSONPath(data interface{}, path string) (interface{}, error) {
	parts := strings.Split(path, ".")
	current := data

	for _, part := range parts {
		switch v := current.(type) {
		case map[string]interface{}:
			value, ok := v[part]
			if !ok {
				return nil, fmt.Errorf("path not found: %s", part)
			}
			current = value
		default:
			return nil, fmt.Errorf("cannot navigate path at: %s", part)
		}
	}

	return current, nil
}

// findArrayProperty finds the first array property in an object
func (imp *JSONImporter) findArrayProperty(obj map[string]interface{}) ([]interface{}, string) {
	// Look for array properties
	for key, value := range obj {
		if arr, ok := value.([]interface{}); ok && len(arr) > 0 {
			return arr, key
		}
	}

	// Look one level deeper
	for key, value := range obj {
		if nested, ok := value.(map[string]interface{}); ok {
			if arr, path := imp.findArrayProperty(nested); arr != nil {
				return arr, key + "." + path
			}
		}
	}

	return nil, ""
}

// convertArrayToMaps converts array of any to array of maps
func (imp *JSONImporter) convertArrayToMaps(arr []interface{}, maxRows int) []map[string]interface{} {
	rows := make([]map[string]interface{}, 0)
	limit := len(arr)
	if maxRows > 0 && maxRows < limit {
		limit = maxRows
	}

	for i := 0; i < limit; i++ {
		if obj, ok := arr[i].(map[string]interface{}); ok {
			rows = append(rows, obj)
		}
	}

	return rows
}

// flattenRows flattens nested objects in rows
func (imp *JSONImporter) flattenRows(rows []map[string]interface{}, maxDepth int, arrayStrategy string) []map[string]interface{} {
	flattened := make([]map[string]interface{}, len(rows))

	for i, row := range rows {
		flattened[i] = imp.flattenObject(row, "", maxDepth, arrayStrategy)
	}

	return flattened
}

// flattenObject flattens a nested object
func (imp *JSONImporter) flattenObject(obj map[string]interface{}, prefix string, maxDepth int, arrayStrategy string) map[string]interface{} {
	if maxDepth == 0 {
		return obj
	}

	result := make(map[string]interface{})

	for key, value := range obj {
		fullKey := key
		if prefix != "" {
			fullKey = prefix + "_" + key
		}

		switch v := value.(type) {
		case map[string]interface{}:
			// Recursively flatten nested object
			nested := imp.flattenObject(v, fullKey, maxDepth-1, arrayStrategy)
			for nestedKey, nestedValue := range nested {
				result[nestedKey] = nestedValue
			}
		case []interface{}:
			// Handle arrays based on strategy
			switch arrayStrategy {
			case "json":
				// Convert array to JSON string
				jsonBytes, _ := json.Marshal(v)
				result[fullKey] = string(jsonBytes)
			case "first":
				// Take first element
				if len(v) > 0 {
					result[fullKey] = v[0]
				}
			case "ignore":
				// Skip arrays
			default:
				// Default: JSON string
				jsonBytes, _ := json.Marshal(v)
				result[fullKey] = string(jsonBytes)
			}
		default:
			result[fullKey] = value
		}
	}

	return result
}

// extractColumns extracts column schema from rows
func (imp *JSONImporter) extractColumns(rows []map[string]interface{}) []CSVColumn {
	// Collect all unique keys
	keySet := make(map[string]bool)
	for _, row := range rows {
		for key := range row {
			keySet[key] = true
		}
	}

	// Convert to sorted array
	columns := make([]CSVColumn, 0, len(keySet))
	idx := 0
	for key := range keySet {
		columns = append(columns, CSVColumn{
			Name:         key,
			Index:        idx,
			DetectedType: "text",
		})
		idx++
	}

	return columns
}

// convertRowsToStrings converts map rows to string array format
func (imp *JSONImporter) convertRowsToStrings(rows []map[string]interface{}, columns []CSVColumn) [][]string {
	stringRows := make([][]string, len(rows))

	for i, row := range rows {
		stringRow := make([]string, len(columns))
		for j, col := range columns {
			value := row[col.Name]
			stringRow[j] = imp.valueToString(value)
		}
		stringRows[i] = stringRow
	}

	return stringRows
}

// valueToString converts any value to string
func (imp *JSONImporter) valueToString(value interface{}) string {
	if value == nil {
		return ""
	}

	switch v := value.(type) {
	case string:
		return v
	case float64:
		// Check if it's actually an integer
		if v == float64(int64(v)) {
			return fmt.Sprintf("%d", int64(v))
		}
		return fmt.Sprintf("%f", v)
	case bool:
		return fmt.Sprintf("%t", v)
	case []interface{}, map[string]interface{}:
		// Convert complex types to JSON
		jsonBytes, _ := json.Marshal(v)
		return string(jsonBytes)
	default:
		return fmt.Sprintf("%v", v)
	}
}

// ImportJSON imports JSON file to temporary table
func (imp *JSONImporter) ImportJSON(
	ctx context.Context,
	file multipart.File,
	fileName string,
	options *JSONImportOptions,
	preview *JSONPreview,
) (*JSONImportResult, error) {
	startTime := time.Now()

	// This would integrate with TempTableService
	result := &JSONImportResult{
		ImportID:     uuid.New(),
		FileName:     fileName,
		RowsImported: preview.TotalRows,
		Columns:      preview.Columns,
		TableName:    fmt.Sprintf("json_import_%s", uuid.New().String()[:8]),
		Duration:     time.Since(startTime).Milliseconds(),
	}

	return result, nil
}

// ValidateJSONFile validates JSON file before import
func (imp *JSONImporter) ValidateJSONFile(fileHeader *multipart.FileHeader) error {
	// Check file size
	if fileHeader.Size > imp.maxFileSize {
		return fmt.Errorf("file too large: %d bytes (max %d)", fileHeader.Size, imp.maxFileSize)
	}

	// Check file extension
	ext := strings.ToLower(fileHeader.Filename)
	if !strings.HasSuffix(ext, ".json") {
		return errors.New("invalid file type: only .json files are supported")
	}

	return nil
}

// GetDefaultOptions returns default JSON import options
func (imp *JSONImporter) GetDefaultOptions() *JSONImportOptions {
	return &JSONImportOptions{
		RootPath:      "",
		FlattenNested: true,
		MaxDepth:      3,
		MaxRows:       0,
		DetectTypes:   true,
		NullValues:    []string{"", "null"},
		ArrayStrategy: "json",
	}
}

// InferStructure analyzes JSON structure
func (imp *JSONImporter) InferStructure(data interface{}) string {
	kind := reflect.TypeOf(data).Kind()

	switch kind {
	case reflect.Slice:
		return "array"
	case reflect.Map:
		return "object"
	default:
		return "primitive"
	}
}
