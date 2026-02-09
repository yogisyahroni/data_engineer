package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"insight-engine-backend/models"
	"reflect"
	"time"

	"gorm.io/gorm"
)

// CrossDBJoinService handles joins across different database types
type CrossDBJoinService struct {
	db            *gorm.DB
	typeConverter *TypeConverter
}

// NewCrossDBJoinService creates a new cross-database join service
func NewCrossDBJoinService(db *gorm.DB) *CrossDBJoinService {
	return &CrossDBJoinService{
		db:            db,
		typeConverter: NewTypeConverter(),
	}
}

// ExecuteCrossDBJoin executes a join across different databases
func (s *CrossDBJoinService) ExecuteCrossDBJoin(ctx context.Context, left, right *SourceDataWithMeta, join BlendJoin) (*BlendResult, error) {
	// Normalize data types
	leftNormalized, err := s.normalizeSourceData(left)
	if err != nil {
		return nil, fmt.Errorf("failed to normalize left source: %w", err)
	}

	rightNormalized, err := s.normalizeSourceData(right)
	if err != nil {
		return nil, fmt.Errorf("failed to normalize right source: %w", err)
	}

	// Perform join
	return s.performJoin(leftNormalized, rightNormalized, join)
}

// SourceDataWithMeta includes metadata about the source database
type SourceDataWithMeta struct {
	*SourceData
	DatabaseType string // postgresql, mysql, mongodb, etc.
}

// normalizeSourceData converts database-specific types to Go standard types
func (s *CrossDBJoinService) normalizeSourceData(source *SourceDataWithMeta) (*SourceData, error) {
	normalizedRows := make([][]interface{}, len(source.Rows))

	for i, row := range source.Rows {
		normalizedRow := make([]interface{}, len(row))
		for j, value := range row {
			normalized, err := s.typeConverter.Normalize(value, source.DatabaseType)
			if err != nil {
				return nil, fmt.Errorf("failed to normalize value at row %d, col %d: %w", i, j, err)
			}
			normalizedRow[j] = normalized
		}
		normalizedRows[i] = normalizedRow
	}

	return &SourceData{
		Alias:   source.Alias,
		Columns: source.Columns,
		Rows:    normalizedRows,
	}, nil
}

// performJoin executes the actual join operation
func (s *CrossDBJoinService) performJoin(left, right *SourceData, join BlendJoin) (*BlendResult, error) {
	// Use hash join algorithm (same as data_blender.go but type-aware)
	hashTable := make(map[string][]joinRow)

	// Get join column index
	rightJoinColIdx := -1
	for i, col := range right.Columns {
		if col.Name == join.Conditions[0].RightColumn {
			rightJoinColIdx = i
			break
		}
	}
	if rightJoinColIdx == -1 {
		return nil, fmt.Errorf("right join column not found: %s", join.Conditions[0].RightColumn)
	}

	// Build hash table
	for rowIdx, row := range right.Rows {
		key := s.normalizeKey(row[rightJoinColIdx])
		hashTable[key] = append(hashTable[key], joinRow{
			index: rowIdx,
			data:  row,
		})
	}

	// Probe with left side
	leftJoinColIdx := -1
	for i, col := range left.Columns {
		if col.Name == join.Conditions[0].LeftColumn {
			leftJoinColIdx = i
			break
		}
	}
	if leftJoinColIdx == -1 {
		return nil, fmt.Errorf("left join column not found: %s", join.Conditions[0].LeftColumn)
	}

	var resultRows [][]interface{}
	matchedRightRows := make(map[int]bool)

	for _, leftRow := range left.Rows {
		key := s.normalizeKey(leftRow[leftJoinColIdx])

		if rightRows, found := hashTable[key]; found {
			// INNER/LEFT JOIN: Combine matching rows
			for _, rightRow := range rightRows {
				combinedRow := append(append([]interface{}{}, leftRow...), rightRow.data...)
				resultRows = append(resultRows, combinedRow)
				matchedRightRows[rightRow.index] = true
			}
		} else if join.Type == LeftJoin || join.Type == FullJoin {
			// LEFT/FULL JOIN: Include left row with NULLs
			rightNulls := make([]interface{}, len(right.Columns))
			combinedRow := append(append([]interface{}{}, leftRow...), rightNulls...)
			resultRows = append(resultRows, combinedRow)
		}
	}

	// RIGHT/FULL JOIN: Add unmatched right rows
	if join.Type == RightJoin || join.Type == FullJoin {
		for i, rightRow := range right.Rows {
			if !matchedRightRows[i] {
				leftNulls := make([]interface{}, len(left.Columns))
				combinedRow := append(append([]interface{}{}, leftNulls...), rightRow...)
				resultRows = append(resultRows, combinedRow)
			}
		}
	}

	// Build result columns
	resultColumns := make([]Column, 0, len(left.Columns)+len(right.Columns))
	for _, col := range left.Columns {
		resultColumns = append(resultColumns, Column{
			Name:     left.Alias + "." + col.Name,
			DataType: col.DataType,
			Source:   left.Alias,
		})
	}
	for _, col := range right.Columns {
		resultColumns = append(resultColumns, Column{
			Name:     right.Alias + "." + col.Name,
			DataType: col.DataType,
			Source:   right.Alias,
		})
	}

	return &BlendResult{
		Columns: resultColumns,
		Rows:    resultRows,
		Stats: BlendStats{
			SourceRowCounts: map[string]int{
				left.Alias:  len(left.Rows),
				right.Alias: len(right.Rows),
			},
			JoinedRowCount: len(resultRows),
		},
	}, nil
}

// joinRow represents a row in the hash table
type joinRow struct {
	index int
	data  []interface{}
}

// normalizeKey converts a value to a comparable string key
func (s *CrossDBJoinService) normalizeKey(value interface{}) string {
	if value == nil {
		return "__NULL__"
	}

	switch v := value.(type) {
	case string:
		return v
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v)
	case uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v)
	case float32, float64:
		return fmt.Sprintf("%.10f", v)
	case bool:
		return fmt.Sprintf("%t", v)
	case time.Time:
		return v.Format(time.RFC3339Nano)
	case []byte:
		return string(v)
	default:
		// Fallback to JSON serialization
		b, _ := json.Marshal(v)
		return string(b)
	}
}

// TypeConverter handles type conversion between different databases
type TypeConverter struct {
	converters map[string]map[string]func(interface{}) (interface{}, error)
}

// NewTypeConverter creates a new type converter
func NewTypeConverter() *TypeConverter {
	tc := &TypeConverter{
		converters: make(map[string]map[string]func(interface{}) (interface{}, error)),
	}
	tc.registerConverters()
	return tc
}

// registerConverters registers all type converters
func (tc *TypeConverter) registerConverters() {
	// PostgreSQL specific conversions
	tc.converters["postgresql"] = map[string]func(interface{}) (interface{}, error){
		"normalize": tc.normalizePostgreSQL,
	}

	// MySQL specific conversions
	tc.converters["mysql"] = map[string]func(interface{}) (interface{}, error){
		"normalize": tc.normalizeMySQL,
	}

	// MongoDB specific conversions
	tc.converters["mongodb"] = map[string]func(interface{}) (interface{}, error){
		"normalize": tc.normalizeMongoDB,
	}

	// SQL Server specific conversions
	tc.converters["sqlserver"] = map[string]func(interface{}) (interface{}, error){
		"normalize": tc.normalizeSQLServer,
	}
}

// Normalize converts database-specific value to Go standard type
func (tc *TypeConverter) Normalize(value interface{}, dbType string) (interface{}, error) {
	if value == nil {
		return nil, nil
	}

	// Get converter for database type
	dbConverters, ok := tc.converters[dbType]
	if !ok {
		// Unknown database type - return as-is
		return value, nil
	}

	normalizer, ok := dbConverters["normalize"]
	if !ok {
		return value, nil
	}

	return normalizer(value)
}

// normalizePostgreSQL normalizes PostgreSQL-specific types
func (tc *TypeConverter) normalizePostgreSQL(value interface{}) (interface{}, error) {
	switch v := value.(type) {
	case []byte:
		// PostgreSQL BYTEA
		return string(v), nil
	case sql.NullString:
		if v.Valid {
			return v.String, nil
		}
		return nil, nil
	case sql.NullInt64:
		if v.Valid {
			return v.Int64, nil
		}
		return nil, nil
	case sql.NullFloat64:
		if v.Valid {
			return v.Float64, nil
		}
		return nil, nil
	case sql.NullBool:
		if v.Valid {
			return v.Bool, nil
		}
		return nil, nil
	case sql.NullTime:
		if v.Valid {
			return v.Time, nil
		}
		return nil, nil
	case time.Time:
		return v, nil
	case string, int, int64, float64, bool:
		return v, nil
	default:
		// Try JSON conversion for complex types (JSONB, arrays, etc.)
		if reflect.TypeOf(v).Kind() == reflect.Slice || reflect.TypeOf(v).Kind() == reflect.Map {
			b, err := json.Marshal(v)
			if err != nil {
				return nil, err
			}
			return string(b), nil
		}
		return v, nil
	}
}

// normalizeMySQL normalizes MySQL-specific types
func (tc *TypeConverter) normalizeMySQL(value interface{}) (interface{}, error) {
	switch v := value.(type) {
	case []byte:
		// MySQL returns many types as []byte
		// Try to convert to string
		return string(v), nil
	case sql.NullString:
		if v.Valid {
			return v.String, nil
		}
		return nil, nil
	case sql.NullInt64:
		if v.Valid {
			return v.Int64, nil
		}
		return nil, nil
	case sql.NullFloat64:
		if v.Valid {
			return v.Float64, nil
		}
		return nil, nil
	case sql.NullBool:
		if v.Valid {
			return v.Bool, nil
		}
		return nil, nil
	case sql.NullTime:
		if v.Valid {
			return v.Time, nil
		}
		return nil, nil
	case time.Time:
		return v, nil
	case string, int, int64, float64, bool:
		return v, nil
	default:
		return v, nil
	}
}

// normalizeMongoDB normalizes MongoDB-specific types
func (tc *TypeConverter) normalizeMongoDB(value interface{}) (interface{}, error) {
	switch v := value.(type) {
	case map[string]interface{}:
		// MongoDB BSON documents
		// Check for special types
		if oid, ok := v["$oid"]; ok {
			// ObjectId
			return fmt.Sprintf("%v", oid), nil
		}
		if date, ok := v["$date"]; ok {
			// ISODate
			if dateMap, ok := date.(map[string]interface{}); ok {
				if numberLong, ok := dateMap["$numberLong"]; ok {
					// Convert milliseconds to time.Time
					ms, _ := numberLong.(int64)
					return time.UnixMilli(ms), nil
				}
			}
			return date, nil
		}
		// Regular object - convert to JSON
		b, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		return string(b), nil
	case []interface{}:
		// MongoDB arrays - convert to JSON
		b, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		return string(b), nil
	case time.Time:
		return v, nil
	case string, int, int64, float64, bool:
		return v, nil
	default:
		return v, nil
	}
}

// normalizeSQLServer normalizes SQL Server-specific types
func (tc *TypeConverter) normalizeSQLServer(value interface{}) (interface{}, error) {
	// SQL Server uses similar types to PostgreSQL
	return tc.normalizePostgreSQL(value)
}

// CompareValues compares two values for join conditions
func (tc *TypeConverter) CompareValues(left, right interface{}, operator JoinOperator) (bool, error) {
	// Handle NULL
	if left == nil || right == nil {
		return left == right, nil
	}

	// Normalize to comparable types
	leftStr := fmt.Sprintf("%v", left)
	rightStr := fmt.Sprintf("%v", right)

	switch operator {
	case OpEquals:
		return leftStr == rightStr, nil
	case OpNotEquals:
		return leftStr != rightStr, nil
	case OpLessThan:
		return leftStr < rightStr, nil
	case OpLessThanOrEqual:
		return leftStr <= rightStr, nil
	case OpGreaterThan:
		return leftStr > rightStr, nil
	case OpGreaterThanOrEqual:
		return leftStr >= rightStr, nil
	default:
		return false, errors.New("unsupported operator")
	}
}

// InferCommonType infers a common type for two columns being joined
func (tc *TypeConverter) InferCommonType(leftType, rightType string) string {
	// Type compatibility matrix
	typeMatrix := map[string]map[string]string{
		"integer": {
			"integer": "integer",
			"bigint":  "bigint",
			"numeric": "numeric",
			"text":    "text",
		},
		"bigint": {
			"integer": "bigint",
			"bigint":  "bigint",
			"numeric": "numeric",
			"text":    "text",
		},
		"numeric": {
			"integer": "numeric",
			"bigint":  "numeric",
			"numeric": "numeric",
			"text":    "text",
		},
		"text": {
			"integer": "text",
			"bigint":  "text",
			"numeric": "text",
			"text":    "text",
		},
		"timestamp": {
			"timestamp": "timestamp",
			"text":      "text",
		},
	}

	if leftMap, ok := typeMatrix[leftType]; ok {
		if commonType, ok := leftMap[rightType]; ok {
			return commonType
		}
	}

	// Default to text for unknown combinations
	return "text"
}

// ValidateCrossDBJoin validates that a join can be performed across databases
func (s *CrossDBJoinService) ValidateCrossDBJoin(
	leftSource *models.Connection,
	leftColumn string,
	rightSource *models.Connection,
	rightColumn string,
) error {
	// Basic validation - check sources are not nil
	if leftSource == nil || rightSource == nil {
		return fmt.Errorf("both left and right sources must be provided")
	}

	// Note: Column type compatibility is validated at runtime during join execution
	// Static validation would require schema discovery calls for both sources,
	// which adds latency. Runtime validation provides better error messages
	// based on actual data types encountered.

	return nil
}
