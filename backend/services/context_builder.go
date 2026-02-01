package services

import (
	"context"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// ContextBuilder builds context for AI semantic operations
type ContextBuilder struct {
	db *gorm.DB
}

// NewContextBuilder creates a new context builder
func NewContextBuilder(db *gorm.DB) *ContextBuilder {
	return &ContextBuilder{db: db}
}

// SchemaInfo represents database schema information
type SchemaInfo struct {
	Tables        []SchemaTableInfo  `json:"tables"`
	Relationships []RelationshipInfo `json:"relationships"`
}

// SchemaTableInfo represents a database table
type SchemaTableInfo struct {
	Name     string             `json:"name"`
	Columns  []SchemaColumnInfo `json:"columns"`
	RowCount int64              `json:"rowCount"`
}

// SchemaColumnInfo represents a table column
type SchemaColumnInfo struct {
	Name     string `json:"name"`
	DataType string `json:"dataType"`
	Nullable bool   `json:"nullable"`
}

// RelationshipInfo represents a foreign key relationship
type RelationshipInfo struct {
	FromTable  string `json:"fromTable"`
	FromColumn string `json:"fromColumn"`
	ToTable    string `json:"toTable"`
	ToColumn   string `json:"toColumn"`
}

// BuildSchemaContext builds schema context for AI query generation
func (cb *ContextBuilder) BuildSchemaContext(ctx context.Context, dataSourceID string) (string, error) {
	// For now, we'll build context from the current database
	// In production, this should fetch schema from the specific data source

	schema, err := cb.fetchSchema(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to fetch schema: %w", err)
	}

	return cb.formatSchemaForAI(schema), nil
}

// fetchSchema fetches schema information from database
func (cb *ContextBuilder) fetchSchema(ctx context.Context) (*SchemaInfo, error) {
	var tables []SchemaTableInfo

	// Query to get all tables and columns
	query := `
		SELECT 
			t.table_name,
			c.column_name,
			c.data_type,
			c.is_nullable
		FROM information_schema.tables t
		JOIN information_schema.columns c 
			ON t.table_name = c.table_name
		WHERE t.table_schema = 'public'
			AND t.table_type = 'BASE TABLE'
		ORDER BY t.table_name, c.ordinal_position
	`

	type columnRow struct {
		TableName  string
		ColumnName string
		DataType   string
		IsNullable string
	}

	var rows []columnRow
	if err := cb.db.WithContext(ctx).Raw(query).Scan(&rows).Error; err != nil {
		return nil, err
	}

	// Group columns by table
	tableMap := make(map[string]*SchemaTableInfo)
	for _, row := range rows {
		if _, exists := tableMap[row.TableName]; !exists {
			tableMap[row.TableName] = &SchemaTableInfo{
				Name:    row.TableName,
				Columns: []SchemaColumnInfo{},
			}
		}

		tableMap[row.TableName].Columns = append(tableMap[row.TableName].Columns, SchemaColumnInfo{
			Name:     row.ColumnName,
			DataType: row.DataType,
			Nullable: row.IsNullable == "YES",
		})
	}

	// Convert map to slice
	for _, table := range tableMap {
		// Get row count for each table
		var count int64
		cb.db.WithContext(ctx).Table(table.Name).Count(&count)
		table.RowCount = count

		tables = append(tables, *table)
	}

	// Fetch relationships (foreign keys)
	relationships, err := cb.fetchRelationships(ctx)
	if err != nil {
		return nil, err
	}

	return &SchemaInfo{
		Tables:        tables,
		Relationships: relationships,
	}, nil
}

// fetchRelationships fetches foreign key relationships
func (cb *ContextBuilder) fetchRelationships(ctx context.Context) ([]RelationshipInfo, error) {
	query := `
		SELECT
			tc.table_name as from_table,
			kcu.column_name as from_column,
			ccu.table_name as to_table,
			ccu.column_name as to_column
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name
		JOIN information_schema.constraint_column_usage ccu
			ON ccu.constraint_name = tc.constraint_name
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = 'public'
	`

	type relationshipRow struct {
		FromTable  string
		FromColumn string
		ToTable    string
		ToColumn   string
	}

	var rows []relationshipRow
	if err := cb.db.WithContext(ctx).Raw(query).Scan(&rows).Error; err != nil {
		return nil, err
	}

	relationships := make([]RelationshipInfo, len(rows))
	for i, row := range rows {
		relationships[i] = RelationshipInfo{
			FromTable:  row.FromTable,
			FromColumn: row.FromColumn,
			ToTable:    row.ToTable,
			ToColumn:   row.ToColumn,
		}
	}

	return relationships, nil
}

// formatSchemaForAI formats schema information for AI consumption
func (cb *ContextBuilder) formatSchemaForAI(schema *SchemaInfo) string {
	var sb strings.Builder

	sb.WriteString("Available Database Schema:\n\n")

	// Tables and columns
	sb.WriteString("Tables:\n")
	for i, table := range schema.Tables {
		sb.WriteString(fmt.Sprintf("%d. %s (%d rows)\n", i+1, table.Name, table.RowCount))
		sb.WriteString("   Columns: ")

		columnNames := make([]string, len(table.Columns))
		for j, col := range table.Columns {
			nullable := ""
			if col.Nullable {
				nullable = "?"
			}
			columnNames[j] = fmt.Sprintf("%s:%s%s", col.Name, col.DataType, nullable)
		}
		sb.WriteString(strings.Join(columnNames, ", "))
		sb.WriteString("\n\n")
	}

	// Relationships
	if len(schema.Relationships) > 0 {
		sb.WriteString("\nRelationships:\n")
		for _, rel := range schema.Relationships {
			sb.WriteString(fmt.Sprintf("- %s.%s → %s.%s\n",
				rel.FromTable, rel.FromColumn, rel.ToTable, rel.ToColumn))
		}
	}

	return sb.String()
}

// BuildDataContext builds context from sample data
func (cb *ContextBuilder) BuildDataContext(data interface{}) string {
	// Format data for AI context
	// This is a simplified version - in production, format based on data type
	return fmt.Sprintf("Sample Data:\n%v", data)
}

// BuildConversationContext builds context from conversation history
func (cb *ContextBuilder) BuildConversationContext(messages []map[string]string) string {
	var sb strings.Builder
	sb.WriteString("Conversation History:\n\n")

	for i, msg := range messages {
		role := msg["role"]
		content := msg["content"]
		sb.WriteString(fmt.Sprintf("%d. %s: %s\n", i+1, role, content))
	}

	return sb.String()
}
