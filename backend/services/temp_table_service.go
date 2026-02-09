package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TempTableMetadata represents metadata for a temporary table
type TempTableMetadata struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID        uuid.UUID `gorm:"type:uuid;not null;index" json:"userId"`
	TempTableName string    `gorm:"column:table_name;type:varchar(255);not null;uniqueIndex" json:"tableName"`
	DisplayName   string    `gorm:"type:varchar(255)" json:"displayName"`
	Source        string    `gorm:"type:varchar(50)" json:"source"` // csv, excel, json, api
	FileName      string    `gorm:"type:varchar(255)" json:"fileName"`
	RowCount      int       `gorm:"type:integer" json:"rowCount"`
	ColumnCount   int       `gorm:"type:integer" json:"columnCount"`
	FileSize      int64     `gorm:"type:bigint" json:"fileSize"`
	TTL           int       `gorm:"type:integer" json:"ttl"` // Time-to-live in hours
	ExpiresAt     time.Time `gorm:"type:timestamp" json:"expiresAt"`
	CreatedAt     time.Time `gorm:"type:timestamp;autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"type:timestamp;autoUpdateTime" json:"updatedAt"`
}

// TableName specifies the table name for GORM
func (TempTableMetadata) TableName() string {
	return "temp_table_metadata"
}

// TempTableColumn represents a column in a temporary table
type TempTableColumn struct {
	Name     string `json:"name"`
	DataType string `json:"dataType"` // text, integer, float, boolean, timestamp
	Nullable bool   `json:"nullable"`
	Index    int    `json:"index"`
}

// TempTableService manages temporary tables for uploaded data
type TempTableService struct {
	db           *gorm.DB
	defaultTTL   int    // Default TTL in hours
	schemaPrefix string // Schema prefix for temp tables
	maxTables    int    // Max temp tables per user
}

// NewTempTableService creates a new temporary table service
func NewTempTableService(db *gorm.DB) *TempTableService {
	return &TempTableService{
		db:           db,
		defaultTTL:   24,      // 24 hours default
		schemaPrefix: "temp_", // Prefix for temp table names
		maxTables:    50,      // Max 50 temp tables per user
	}
}

// CreateTempTable creates a new temporary table for imported data
func (s *TempTableService) CreateTempTable(
	ctx context.Context,
	userID uuid.UUID,
	displayName string,
	source string,
	fileName string,
	columns []TempTableColumn,
	rows [][]interface{},
) (*TempTableMetadata, error) {
	// Generate unique table name
	tableName := s.generateTableName(userID)

	// Check user's table quota
	count, err := s.GetUserTableCount(ctx, userID)
	if err != nil {
		return nil, err
	}
	if count >= s.maxTables {
		return nil, fmt.Errorf("user has reached maximum temp table limit (%d)", s.maxTables)
	}

	// Create table DDL
	ddl := s.generateCreateTableDDL(tableName, columns)

	// Execute DDL
	if err := s.db.Exec(ddl).Error; err != nil {
		return nil, fmt.Errorf("failed to create temp table: %w", err)
	}

	// Insert data
	if len(rows) > 0 {
		if err := s.insertData(tableName, columns, rows); err != nil {
			// Rollback: drop table
			_ = s.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName))
			return nil, fmt.Errorf("failed to insert data: %w", err)
		}
	}

	// Create metadata entry
	metadata := &TempTableMetadata{
		ID:            uuid.New(),
		UserID:        userID,
		TempTableName: tableName,
		DisplayName:   displayName,
		Source:        source,
		FileName:      fileName,
		RowCount:      len(rows),
		ColumnCount:   len(columns),
		TTL:           s.defaultTTL,
		ExpiresAt:     time.Now().Add(time.Duration(s.defaultTTL) * time.Hour),
	}

	if err := s.db.Create(metadata).Error; err != nil {
		// Rollback: drop table
		_ = s.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", tableName))
		return nil, fmt.Errorf("failed to create metadata: %w", err)
	}

	return metadata, nil
}

// generateTableName generates a unique table name
func (s *TempTableService) generateTableName(userID uuid.UUID) string {
	// Format: temp_<user_id_short>_<timestamp>_<random>
	userIDShort := strings.ReplaceAll(userID.String(), "-", "")[:8]
	timestamp := time.Now().Unix()
	random := uuid.New().String()[:8]
	return fmt.Sprintf("%s%s_%d_%s", s.schemaPrefix, userIDShort, timestamp, random)
}

// generateCreateTableDDL generates CREATE TABLE DDL
func (s *TempTableService) generateCreateTableDDL(tableName string, columns []TempTableColumn) string {
	var columnDefs []string

	// Add row_id as primary key
	columnDefs = append(columnDefs, "row_id SERIAL PRIMARY KEY")

	// Add data columns
	for _, col := range columns {
		colDef := fmt.Sprintf("%s %s", s.sanitizeColumnName(col.Name), s.mapDataType(col.DataType))
		if !col.Nullable {
			colDef += " NOT NULL"
		}
		columnDefs = append(columnDefs, colDef)
	}

	// Add metadata columns
	columnDefs = append(columnDefs, "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")

	ddl := fmt.Sprintf("CREATE TABLE %s (\n  %s\n)", tableName, strings.Join(columnDefs, ",\n  "))
	return ddl
}

// sanitizeColumnName sanitizes column name for SQL
func (s *TempTableService) sanitizeColumnName(name string) string {
	// Replace invalid characters
	sanitized := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			return r
		}
		return '_'
	}, strings.ToLower(name))

	// Ensure it doesn't start with a number
	if len(sanitized) > 0 && sanitized[0] >= '0' && sanitized[0] <= '9' {
		sanitized = "col_" + sanitized
	}

	return sanitized
}

// mapDataType maps internal type to PostgreSQL type
func (s *TempTableService) mapDataType(dataType string) string {
	switch dataType {
	case "integer":
		return "BIGINT"
	case "float":
		return "DOUBLE PRECISION"
	case "boolean":
		return "BOOLEAN"
	case "date", "timestamp":
		return "TIMESTAMP"
	default:
		return "TEXT"
	}
}

// insertData inserts data into temporary table
func (s *TempTableService) insertData(tableName string, columns []TempTableColumn, rows [][]interface{}) error {
	if len(rows) == 0 {
		return nil
	}

	// Build INSERT statement
	columnNames := make([]string, len(columns))
	for i, col := range columns {
		columnNames[i] = s.sanitizeColumnName(col.Name)
	}

	// Prepare batch insert
	batchSize := 1000
	for i := 0; i < len(rows); i += batchSize {
		end := i + batchSize
		if end > len(rows) {
			end = len(rows)
		}

		batch := rows[i:end]
		if err := s.insertBatch(tableName, columnNames, batch); err != nil {
			return err
		}
	}

	return nil
}

// insertBatch inserts a batch of rows
func (s *TempTableService) insertBatch(tableName string, columnNames []string, rows [][]interface{}) error {
	// Build placeholders
	placeholders := make([]string, len(rows))
	values := make([]interface{}, 0, len(rows)*len(columnNames))

	for i, row := range rows {
		rowPlaceholders := make([]string, len(columnNames))
		for j := range columnNames {
			idx := i*len(columnNames) + j
			rowPlaceholders[j] = fmt.Sprintf("$%d", idx+1)

			// Add value (with bounds checking)
			if j < len(row) {
				values = append(values, row[j])
			} else {
				values = append(values, nil)
			}
		}
		placeholders[i] = fmt.Sprintf("(%s)", strings.Join(rowPlaceholders, ", "))
	}

	sql := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES %s",
		tableName,
		strings.Join(columnNames, ", "),
		strings.Join(placeholders, ", "),
	)

	return s.db.Exec(sql, values...).Error
}

// GetTempTable retrieves temp table metadata
func (s *TempTableService) GetTempTable(ctx context.Context, tableID uuid.UUID, userID uuid.UUID) (*TempTableMetadata, error) {
	var metadata TempTableMetadata
	err := s.db.Where("id = ? AND user_id = ?", tableID, userID).First(&metadata).Error
	if err != nil {
		return nil, err
	}
	return &metadata, nil
}

// ListUserTables lists all temp tables for a user
func (s *TempTableService) ListUserTables(ctx context.Context, userID uuid.UUID) ([]TempTableMetadata, error) {
	var tables []TempTableMetadata
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&tables).Error
	if err != nil {
		return nil, err
	}
	return tables, nil
}

// GetUserTableCount gets the count of temp tables for a user
func (s *TempTableService) GetUserTableCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int64
	err := s.db.Model(&TempTableMetadata{}).Where("user_id = ?", userID).Count(&count).Error
	return int(count), err
}

// DropTempTable drops a temporary table
func (s *TempTableService) DropTempTable(ctx context.Context, tableID uuid.UUID, userID uuid.UUID) error {
	// Get metadata
	metadata, err := s.GetTempTable(ctx, tableID, userID)
	if err != nil {
		return err
	}

	// Drop table
	if err := s.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", metadata.TempTableName)).Error; err != nil {
		return fmt.Errorf("failed to drop table: %w", err)
	}

	// Delete metadata
	if err := s.db.Delete(&TempTableMetadata{}, "id = ?", tableID).Error; err != nil {
		return fmt.Errorf("failed to delete metadata: %w", err)
	}

	return nil
}

// CleanupExpiredTables removes expired temporary tables
func (s *TempTableService) CleanupExpiredTables(ctx context.Context) (int, error) {
	// Find expired tables
	var expiredTables []TempTableMetadata
	err := s.db.Where("expires_at < ?", time.Now()).Find(&expiredTables).Error
	if err != nil {
		return 0, err
	}

	// Drop each table
	droppedCount := 0
	for _, metadata := range expiredTables {
		// Drop table
		if err := s.db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s", metadata.TempTableName)).Error; err != nil {
			LogWarn("temp_table_cleanup_failed", "Failed to drop expired table", map[string]interface{}{
				"table_name": metadata.TempTableName,
				"error":      err,
			})
			continue
		}

		// Delete metadata
		if err := s.db.Delete(&metadata).Error; err != nil {
			LogWarn("temp_table_metadata_delete_failed", "Failed to delete metadata", map[string]interface{}{
				"table_name":  metadata.TempTableName,
				"metadata_id": metadata.ID,
				"error":       err,
			})
			continue
		}

		droppedCount++
	}

	return droppedCount, nil
}

// ExtendTTL extends the TTL of a temp table
func (s *TempTableService) ExtendTTL(ctx context.Context, tableID uuid.UUID, userID uuid.UUID, additionalHours int) error {
	metadata, err := s.GetTempTable(ctx, tableID, userID)
	if err != nil {
		return err
	}

	newExpiry := metadata.ExpiresAt.Add(time.Duration(additionalHours) * time.Hour)

	return s.db.Model(&TempTableMetadata{}).
		Where("id = ?", tableID).
		Updates(map[string]interface{}{
			"expires_at": newExpiry,
			"ttl":        metadata.TTL + additionalHours,
		}).Error
}

// QueryTempTable executes a query on a temp table
func (s *TempTableService) QueryTempTable(
	ctx context.Context,
	tableName string,
	limit int,
	offset int,
) ([]map[string]interface{}, error) {
	var results []map[string]interface{}

	query := fmt.Sprintf("SELECT * FROM %s LIMIT %d OFFSET %d", tableName, limit, offset)

	if err := s.db.Raw(query).Scan(&results).Error; err != nil {
		return nil, err
	}

	return results, nil
}

// GetTableSchema retrieves the schema of a temp table
func (s *TempTableService) GetTableSchema(ctx context.Context, tableName string) ([]TempTableColumn, error) {
	var columns []TempTableColumn

	query := `
		SELECT 
			column_name as name,
			data_type,
			is_nullable,
			ordinal_position as index
		FROM information_schema.columns
		WHERE table_name = $1
		AND column_name NOT IN ('row_id', 'created_at')
		ORDER BY ordinal_position
	`

	rows, err := s.db.Raw(query, tableName).Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var col TempTableColumn
		var dataType string
		var isNullable string

		if err := rows.Scan(&col.Name, &dataType, &isNullable, &col.Index); err != nil {
			return nil, err
		}

		col.DataType = s.unmapDataType(dataType)
		col.Nullable = isNullable == "YES"

		columns = append(columns, col)
	}

	return columns, nil
}

// unmapDataType maps PostgreSQL type back to internal type
func (s *TempTableService) unmapDataType(pgType string) string {
	switch strings.ToUpper(pgType) {
	case "BIGINT", "INTEGER", "SMALLINT":
		return "integer"
	case "DOUBLE PRECISION", "REAL", "NUMERIC":
		return "float"
	case "BOOLEAN":
		return "boolean"
	case "TIMESTAMP", "DATE", "TIMESTAMPTZ":
		return "timestamp"
	default:
		return "text"
	}
}
