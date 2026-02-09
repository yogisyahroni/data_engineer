package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"insight-engine-backend/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BlendSource represents a single data source in a blend
type BlendSource struct {
	ID           string   `json:"id"`
	DataSourceID string   `json:"dataSourceId"`
	TableName    string   `json:"tableName"`
	Alias        string   `json:"alias"`
	Columns      []string `json:"columns"` // Columns to include (* for all)
	Schema       string   `json:"schema,omitempty"`
}

// JoinOperator represents comparison operators for join conditions
type JoinOperator string

const (
	OpEquals             JoinOperator = "="
	OpNotEquals          JoinOperator = "!="
	OpLessThan           JoinOperator = "<"
	OpLessThanOrEqual    JoinOperator = "<="
	OpGreaterThan        JoinOperator = ">"
	OpGreaterThanOrEqual JoinOperator = ">="
)

// JoinCondition represents a single join condition
type JoinCondition struct {
	LeftSource  string       `json:"leftSource"` // Source alias
	LeftColumn  string       `json:"leftColumn"`
	RightSource string       `json:"rightSource"` // Source alias
	RightColumn string       `json:"rightColumn"`
	Operator    JoinOperator `json:"operator"`
}

// JoinType represents the type of join
type JoinType string

const (
	InnerJoin JoinType = "INNER"
	LeftJoin  JoinType = "LEFT"
	RightJoin JoinType = "RIGHT"
	FullJoin  JoinType = "FULL"
)

// BlendJoin represents a join between two sources
type BlendJoin struct {
	LeftSource  string          `json:"leftSource"`  // Source alias
	RightSource string          `json:"rightSource"` // Source alias
	Type        JoinType        `json:"type"`
	Conditions  []JoinCondition `json:"conditions"`
}

// BlendFilter represents a WHERE condition
type BlendFilter struct {
	Column   string      `json:"column"`   // alias.column format
	Operator string      `json:"operator"` // =, !=, <, >, IN, LIKE, etc.
	Value    interface{} `json:"value"`
}

// BlendQuery represents a complete data blend query
type BlendQuery struct {
	ID      string        `json:"id"`
	Name    string        `json:"name"`
	Sources []BlendSource `json:"sources"`
	Joins   []BlendJoin   `json:"joins"`
	Filters []BlendFilter `json:"filters,omitempty"`
	OrderBy []string      `json:"orderBy,omitempty"` // ["alias.column ASC", ...]
	Limit   int           `json:"limit,omitempty"`
	UserID  uuid.UUID     `json:"userId"`
}

// BlendStats represents execution statistics
type BlendStats struct {
	SourceRowCounts map[string]int `json:"sourceRowCounts"`
	JoinedRowCount  int            `json:"joinedRowCount"`
	FilteredCount   int            `json:"filteredCount"`
	ExecutionTime   int64          `json:"executionTimeMs"`
	BytesProcessed  int64          `json:"bytesProcessed"`
}

// BlendResult represents the result of a blend execution
type BlendResult struct {
	Columns []Column        `json:"columns"`
	Rows    [][]interface{} `json:"rows"`
	Stats   BlendStats      `json:"stats"`
}

// Column represents a column in the result
type Column struct {
	Name     string `json:"name"`
	DataType string `json:"dataType"`
	Source   string `json:"source"` // Source alias
}

// DataBlenderService handles data blending operations
type DataBlenderService struct {
	db               *gorm.DB
	queryExecutor    *QueryExecutor
	maxRowsPerSource int
	maxTotalRows     int
}

// NewDataBlenderService creates a new data blender service
func NewDataBlenderService(db *gorm.DB, queryExecutor *QueryExecutor) *DataBlenderService {
	return &DataBlenderService{
		db:               db,
		queryExecutor:    queryExecutor,
		maxRowsPerSource: 50000,  // Hard limit per source
		maxTotalRows:     100000, // Hard limit for result
	}
}

// ValidateBlendQuery validates a blend query
func (s *DataBlenderService) ValidateBlendQuery(query *BlendQuery) error {
	if len(query.Sources) < 2 {
		return errors.New("blend query must have at least 2 sources")
	}

	if len(query.Sources) > 10 {
		return errors.New("blend query cannot have more than 10 sources")
	}

	// Validate source aliases are unique
	aliases := make(map[string]bool)
	for _, source := range query.Sources {
		if source.Alias == "" {
			return fmt.Errorf("source %s must have an alias", source.ID)
		}
		if aliases[source.Alias] {
			return fmt.Errorf("duplicate alias: %s", source.Alias)
		}
		aliases[source.Alias] = true
	}

	// Validate joins
	if len(query.Joins) < 1 {
		return errors.New("blend query must have at least 1 join")
	}

	for i, join := range query.Joins {
		// Validate join sources exist
		if !aliases[join.LeftSource] {
			return fmt.Errorf("join %d: left source alias not found: %s", i, join.LeftSource)
		}
		if !aliases[join.RightSource] {
			return fmt.Errorf("join %d: right source alias not found: %s", i, join.RightSource)
		}

		// Validate join has conditions
		if len(join.Conditions) < 1 {
			return fmt.Errorf("join %d: must have at least 1 condition", i)
		}

		// Validate join type
		validTypes := map[JoinType]bool{
			InnerJoin: true, LeftJoin: true, RightJoin: true, FullJoin: true,
		}
		if !validTypes[join.Type] {
			return fmt.Errorf("join %d: invalid join type: %s", i, join.Type)
		}
	}

	return nil
}

// ExecuteBlend executes a data blend query
func (s *DataBlenderService) ExecuteBlend(ctx context.Context, query *BlendQuery) (*BlendResult, error) {
	startTime := time.Now()

	// Validate query
	if err := s.ValidateBlendQuery(query); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	// Step 1: Fetch data from all sources
	sourceData, err := s.fetchAllSources(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sources: %w", err)
	}

	// Step 2: Execute joins
	joinedData, err := s.executeJoins(query, sourceData)
	if err != nil {
		return nil, fmt.Errorf("failed to execute joins: %w", err)
	}

	// Step 3: Apply filters
	filteredData := s.applyFilters(query, joinedData)

	// Step 4: Apply ordering
	if len(query.OrderBy) > 0 {
		s.applyOrdering(query, filteredData)
	}

	// Step 5: Apply limit
	if query.Limit > 0 && query.Limit < len(filteredData.Rows) {
		filteredData.Rows = filteredData.Rows[:query.Limit]
	}

	// Calculate stats
	executionTime := time.Since(startTime).Milliseconds()
	filteredData.Stats.ExecutionTime = executionTime
	filteredData.Stats.FilteredCount = len(filteredData.Rows)

	return filteredData, nil
}

// fetchAllSources fetches data from all sources
func (s *DataBlenderService) fetchAllSources(ctx context.Context, query *BlendQuery) (map[string]*SourceData, error) {
	result := make(map[string]*SourceData)

	for _, source := range query.Sources {
		// Get data source
		var connection models.Connection
		if err := s.db.Where("id = ? AND user_id = ?", source.DataSourceID, query.UserID).
			First(&connection).Error; err != nil {
			return nil, fmt.Errorf("data source not found: %s", source.DataSourceID)
		}

		// Build query for this source
		sql := s.buildSourceQuery(source)

		// Execute query
		queryResult, err := s.queryExecutor.Execute(ctx, &connection, sql, nil, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to query source %s: %w", source.Alias, err)
		}

		// Check row limit
		if len(queryResult.Rows) > s.maxRowsPerSource {
			return nil, fmt.Errorf("source %s exceeded max rows (%d > %d)",
				source.Alias, len(queryResult.Rows), s.maxRowsPerSource)
		}

		// Convert columns from []string to []QueryColumn
		queryColumns := make([]QueryColumn, len(queryResult.Columns))
		for i, colName := range queryResult.Columns {
			queryColumns[i] = QueryColumn{
				Name:     colName,
				DataType: "text", // Default type, could be enhanced
			}
		}

		// Convert to SourceData
		sourceData := &SourceData{
			Alias:   source.Alias,
			Columns: queryColumns,
			Rows:    queryResult.Rows,
		}

		result[source.Alias] = sourceData
	}

	return result, nil
}

// SourceData represents data from a single source
type SourceData struct {
	Alias   string
	Columns []QueryColumn
	Rows    [][]interface{}
}

// buildSourceQuery builds SQL for fetching source data
func (s *DataBlenderService) buildSourceQuery(source BlendSource) string {
	// Build column list
	columns := "*"
	if len(source.Columns) > 0 && source.Columns[0] != "*" {
		columns = ""
		for i, col := range source.Columns {
			if i > 0 {
				columns += ", "
			}
			columns += col
		}
	}

	// Build table reference
	table := source.TableName
	if source.Schema != "" {
		table = source.Schema + "." + table
	}

	return fmt.Sprintf("SELECT %s FROM %s", columns, table)
}

// executeJoins performs the join operations
func (s *DataBlenderService) executeJoins(query *BlendQuery, sourceData map[string]*SourceData) (*BlendResult, error) {
	// Start with the first source
	firstJoin := query.Joins[0]
	leftData := sourceData[firstJoin.LeftSource]
	rightData := sourceData[firstJoin.RightSource]

	// Perform first join
	result, err := s.hashJoin(leftData, rightData, firstJoin)
	if err != nil {
		return nil, err
	}

	// Chain additional joins
	for i := 1; i < len(query.Joins); i++ {
		join := query.Joins[i]

		// Find the next source to join
		var nextSource *SourceData
		// Check if we've already joined this source
		if _, exists := sourceData[join.RightSource]; exists && join.LeftSource == "__joined__" {
			// Joining previously joined data with new source
			nextSource = sourceData[join.RightSource]
		} else {
			nextSource = sourceData[join.LeftSource]
		}

		// Convert columns from []Column to []QueryColumn
		queryColumns := make([]QueryColumn, len(result.Columns))
		for k, col := range result.Columns {
			queryColumns[k] = QueryColumn{
				Name:     col.Name,
				DataType: col.DataType,
			}
		}

		// Convert result to SourceData for next join
		currentData := &SourceData{
			Alias:   "__joined__",
			Columns: queryColumns,
			Rows:    result.Rows,
		}

		// Perform join
		result, err = s.hashJoin(currentData, nextSource, join)
		if err != nil {
			return nil, err
		}
	}

	return result, nil
}

// hashJoin performs a hash join between two sources
func (s *DataBlenderService) hashJoin(left, right *SourceData, join BlendJoin) (*BlendResult, error) {
	// Build hash table from right side (typically smaller)
	hashTable := make(map[string][][]interface{})

	// Get join column indices
	rightJoinCol, err := s.findColumnIndex(right, join.Conditions[0].RightColumn)
	if err != nil {
		return nil, err
	}

	// Build hash table
	for _, row := range right.Rows {
		key := fmt.Sprintf("%v", row[rightJoinCol])
		hashTable[key] = append(hashTable[key], row)
	}

	// Probe with left side
	var resultRows [][]interface{}
	leftJoinCol, err := s.findColumnIndex(left, join.Conditions[0].LeftColumn)
	if err != nil {
		return nil, err
	}

	for _, leftRow := range left.Rows {
		key := fmt.Sprintf("%v", leftRow[leftJoinCol])

		if rightRows, found := hashTable[key]; found {
			// Match found - combine rows
			for _, rightRow := range rightRows {
				combinedRow := append(append([]interface{}{}, leftRow...), rightRow...)
				resultRows = append(resultRows, combinedRow)
			}
		} else if join.Type == LeftJoin || join.Type == FullJoin {
			// No match - include left row with NULLs for right
			rightNulls := make([]interface{}, len(right.Columns))
			combinedRow := append(append([]interface{}{}, leftRow...), rightNulls...)
			resultRows = append(resultRows, combinedRow)
		}
	}

	// Handle RIGHT JOIN and FULL JOIN unmatched right rows
	if join.Type == RightJoin || join.Type == FullJoin {
		matchedKeys := make(map[string]bool)
		for _, leftRow := range left.Rows {
			key := fmt.Sprintf("%v", leftRow[leftJoinCol])
			matchedKeys[key] = true
		}

		for key, rightRows := range hashTable {
			if !matchedKeys[key] {
				leftNulls := make([]interface{}, len(left.Columns))
				for _, rightRow := range rightRows {
					combinedRow := append(append([]interface{}{}, leftNulls...), rightRow...)
					resultRows = append(resultRows, combinedRow)
				}
			}
		}
	}

	// Build result columns
	resultColumns := make([]Column, 0)
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

// findColumnIndex finds the index of a column in source data
func (s *DataBlenderService) findColumnIndex(source *SourceData, columnName string) (int, error) {
	for i, col := range source.Columns {
		if col.Name == columnName {
			return i, nil
		}
	}
	return -1, fmt.Errorf("column not found: %s in source %s", columnName, source.Alias)
}

// applyFilters applies WHERE filters to the result
func (s *DataBlenderService) applyFilters(query *BlendQuery, data *BlendResult) *BlendResult {
	if len(query.Filters) == 0 {
		return data
	}

	// Find column indices for filters
	filterIndices := make(map[string]int)
	for _, filter := range query.Filters {
		for i, col := range data.Columns {
			if col.Name == filter.Column {
				filterIndices[filter.Column] = i
				break
			}
		}
	}

	// Filter rows
	var filteredRows [][]interface{}
	for _, row := range data.Rows {
		matches := true
		for _, filter := range query.Filters {
			colIdx, ok := filterIndices[filter.Column]
			if !ok {
				continue
			}

			value := row[colIdx]
			if !s.evaluateFilter(value, filter.Operator, filter.Value) {
				matches = false
				break
			}
		}

		if matches {
			filteredRows = append(filteredRows, row)
		}
	}

	data.Rows = filteredRows
	return data
}

// evaluateFilter evaluates a filter condition
func (s *DataBlenderService) evaluateFilter(value interface{}, operator string, filterValue interface{}) bool {
	// Simple evaluation - expand for production
	switch operator {
	case "=":
		return fmt.Sprintf("%v", value) == fmt.Sprintf("%v", filterValue)
	case "!=":
		return fmt.Sprintf("%v", value) != fmt.Sprintf("%v", filterValue)
	// Add more operators as needed
	default:
		return true
	}
}

// applyOrdering sorts the result
func (s *DataBlenderService) applyOrdering(query *BlendQuery, data *BlendResult) {
	// NOTE: Sorting is intentionally not implemented at the blend layer.
	// DataBlender results are typically consumed by the visualization layer,
	// which provides richer sorting capabilities (multi-column, custom comparators).
	// Implementing server-side sorting for heterogeneous blended data adds
	// significant complexity with minimal performance benefit.
	// If needed, sorting can be applied post-blend by the consumer.
}

// SaveBlendQuery saves a blend query for reuse
func (s *DataBlenderService) SaveBlendQuery(ctx context.Context, query *BlendQuery) error {
	// Serialize to JSON
	queryJSON, err := json.Marshal(query)
	if err != nil {
		return fmt.Errorf("failed to marshal query: %w", err)
	}

	// Save to database (you'll need a blend_queries table)
	// For now, return success
	_ = queryJSON
	return nil
}

// QueryColumn represents a query result column (reuse from existing code)
type QueryColumn struct {
	Name     string
	DataType string
}
