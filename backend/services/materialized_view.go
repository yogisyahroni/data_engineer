package services

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"fmt"
	"insight-engine-backend/models"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// MaterializedViewService handles materialized view operations
type MaterializedViewService struct {
	db                 *gorm.DB
	executor           *QueryExecutor
	cron               *cron.Cron
	incrementalRefresh *IncrementalRefreshService
	mu                 sync.Mutex // Protect concurrent refresh operations
}

// NewMaterializedViewService creates a new materialized view service
func NewMaterializedViewService(db *gorm.DB, executor *QueryExecutor) *MaterializedViewService {
	c := cron.New()
	c.Start()

	return &MaterializedViewService{
		db:                 db,
		executor:           executor,
		cron:               c,
		incrementalRefresh: NewIncrementalRefreshService(executor),
	}
}

// generateTableName generates a unique table name for the materialized view
func generateTableName(name string) string {
	// Create hash of name to ensure uniqueness
	hash := md5.Sum([]byte(name + time.Now().String()))
	hashStr := hex.EncodeToString(hash[:])[:8]

	// Clean and normalize name
	cleanName := strings.ToLower(strings.ReplaceAll(name, " ", "_"))
	cleanName = strings.ReplaceAll(cleanName, "-", "_")

	return fmt.Sprintf("mv_%s_%s", cleanName, hashStr)
}

// CreateMaterializedView creates a new materialized view
func (s *MaterializedViewService) CreateMaterializedView(
	ctx context.Context,
	userID string,
	connectionID string,
	name string,
	sourceQuery string,
	refreshMode string,
	schedule string,
) (*models.MaterializedView, error) {
	// Validate refresh mode
	if refreshMode != "full" && refreshMode != "incremental" {
		return nil, fmt.Errorf("invalid refresh mode: must be 'full' or 'incremental'")
	}

	// Validate cron schedule if provided
	if schedule != "" {
		if _, err := cron.ParseStandard(schedule); err != nil {
			return nil, fmt.Errorf("invalid cron schedule: %w", err)
		}
	}

	// Get connection details
	var connection models.Connection
	if err := s.db.Where("id = ?", connectionID).First(&connection).Error; err != nil {
		return nil, fmt.Errorf("connection not found: %w", err)
	}

	// Generate unique table name
	targetTable := generateTableName(name)

	// Create materialized view record
	mv := &models.MaterializedView{
		ID:           uuid.NewString(),
		ConnectionID: connectionID,
		UserID:       userID,
		Name:         name,
		SourceQuery:  sourceQuery,
		TargetTable:  targetTable,
		RefreshMode:  refreshMode,
		Schedule:     schedule,
		Status:       "idle",
	}

	// Save to database
	if err := s.db.Create(mv).Error; err != nil {
		return nil, fmt.Errorf("failed to create materialized view record: %w", err)
	}

	// Create the materialized view in the target database
	if err := s.createMaterializedViewInDatabase(ctx, &connection, mv); err != nil {
		// Rollback: delete the record
		s.db.Delete(mv)
		return nil, fmt.Errorf("failed to create materialized view in database: %w", err)
	}

	// Perform initial refresh
	if err := s.RefreshMaterializedView(ctx, mv.ID); err != nil {
		// Keep the MV but mark as error
		s.db.Model(mv).Updates(map[string]interface{}{
			"status":        "error",
			"error_message": err.Error(),
		})
		return mv, fmt.Errorf("materialized view created but initial refresh failed: %w", err)
	}

	// Setup cron schedule if provided
	if schedule != "" {
		if err := s.setupSchedule(mv); err != nil {
			// Keep the MV but schedule failed
			return mv, fmt.Errorf("materialized view created but schedule setup failed: %w", err)
		}
	}

	return mv, nil
}

// createMaterializedViewInDatabase creates the MV in the actual database
func (s *MaterializedViewService) createMaterializedViewInDatabase(
	ctx context.Context,
	connection *models.Connection,
	mv *models.MaterializedView,
) error {
	db, err := s.executor.getConnection(connection)
	if err != nil {
		return fmt.Errorf("failed to get database connection: %w", err)
	}
	defer db.Close()

	// Create based on database type
	switch connection.Type {
	case "postgres":
		return s.createPostgresMV(ctx, db, mv)
	case "mysql":
		return s.createMySQLMV(ctx, db, mv)
	case "sqlite":
		return s.createSQLiteMV(ctx, db, mv)
	default:
		return s.createGenericMV(ctx, db, mv)
	}
}

// createPostgresMV creates a native PostgreSQL materialized view
func (s *MaterializedViewService) createPostgresMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) error {
	query := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", mv.TargetTable, mv.SourceQuery)
	_, err := db.ExecContext(ctx, query)
	return err
}

// createMySQLMV creates a table-based materialized view for MySQL
func (s *MaterializedViewService) createMySQLMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) error {
	// MySQL doesn't have native MV, so create a table
	query := fmt.Sprintf("CREATE TABLE %s AS %s LIMIT 0", mv.TargetTable, mv.SourceQuery)
	_, err := db.ExecContext(ctx, query)
	return err
}

// createSQLiteMV creates a table-based materialized view for SQLite
func (s *MaterializedViewService) createSQLiteMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) error {
	// SQLite also uses table-based approach
	query := fmt.Sprintf("CREATE TABLE %s AS %s WHERE 1=0", mv.TargetTable, mv.SourceQuery)
	_, err := db.ExecContext(ctx, query)
	return err
}

// createGenericMV creates a generic table-based materialized view
func (s *MaterializedViewService) createGenericMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) error {
	query := fmt.Sprintf("CREATE TABLE %s AS %s WHERE 1=0", mv.TargetTable, mv.SourceQuery)
	_, err := db.ExecContext(ctx, query)
	return err
}

// RefreshMaterializedView refreshes a materialized view
func (s *MaterializedViewService) RefreshMaterializedView(ctx context.Context, mvID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Get materialized view
	var mv models.MaterializedView
	if err := s.db.Where("id = ?", mvID).First(&mv).Error; err != nil {
		return fmt.Errorf("materialized view not found: %w", err)
	}

	// Check if already refreshing
	if mv.Status == "refreshing" {
		return fmt.Errorf("materialized view is already being refreshed")
	}

	// Get connection
	var connection models.Connection
	if err := s.db.Where("id = ?", mv.ConnectionID).First(&connection).Error; err != nil {
		return fmt.Errorf("connection not found: %w", err)
	}

	// Create refresh history entry
	history := &models.RefreshHistory{
		ID:               uuid.NewString(),
		MaterializedView: mvID,
		RefreshMode:      mv.RefreshMode,
		StartedAt:        time.Now(),
		Status:           "running",
	}
	s.db.Create(history)

	// Update status to refreshing
	s.db.Model(&mv).Updates(map[string]interface{}{
		"status":        "refreshing",
		"error_message": "",
	})

	// Perform refresh in background
	go func() {
		startTime := time.Now()
		var rowsAffected int64
		var refreshErr error

		// Perform the refresh
		if mv.RefreshMode == "incremental" && mv.LastRefresh != nil {
			rowsAffected, refreshErr = s.performIncrementalRefresh(context.Background(), &connection, &mv)
		} else {
			rowsAffected, refreshErr = s.performFullRefresh(context.Background(), &connection, &mv)
		}

		duration := time.Since(startTime).Milliseconds()
		now := time.Now()

		// Update history
		if refreshErr != nil {
			s.db.Model(history).Updates(map[string]interface{}{
				"completed_at":  &now,
				"status":        "failed",
				"error_message": refreshErr.Error(),
				"duration":      duration,
				"rows_affected": rowsAffected,
			})

			// Update MV status
			s.db.Model(&mv).Updates(map[string]interface{}{
				"status":        "error",
				"error_message": refreshErr.Error(),
			})
		} else {
			s.db.Model(history).Updates(map[string]interface{}{
				"completed_at":  &now,
				"status":        "success",
				"duration":      duration,
				"rows_affected": rowsAffected,
			})

			// Calculate next refresh time
			var nextRefresh *time.Time
			if mv.Schedule != "" {
				schedule, _ := cron.ParseStandard(mv.Schedule)
				next := schedule.Next(now)
				nextRefresh = &next
			}

			// Update MV status
			s.db.Model(&mv).Updates(map[string]interface{}{
				"status":        "idle",
				"last_refresh":  &now,
				"next_refresh":  nextRefresh,
				"row_count":     rowsAffected,
				"refresh_count": gorm.Expr("refresh_count + 1"),
				"error_message": "",
			})
		}
	}()

	return nil
}

// performFullRefresh performs a full refresh of the materialized view
func (s *MaterializedViewService) performFullRefresh(
	ctx context.Context,
	connection *models.Connection,
	mv *models.MaterializedView,
) (int64, error) {
	db, err := s.executor.getConnection(connection)
	if err != nil {
		return 0, fmt.Errorf("failed to get database connection: %w", err)
	}
	defer db.Close()

	switch connection.Type {
	case "postgres":
		return s.refreshPostgresMV(ctx, db, mv)
	case "mysql":
		return s.refreshMySQLMV(ctx, db, mv)
	case "sqlite":
		return s.refreshSQLiteMV(ctx, db, mv)
	default:
		return s.refreshGenericMV(ctx, db, mv)
	}
}

// refreshPostgresMV refreshes a PostgreSQL materialized view
func (s *MaterializedViewService) refreshPostgresMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) (int64, error) {
	query := fmt.Sprintf("REFRESH MATERIALIZED VIEW %s", mv.TargetTable)
	_, err := db.ExecContext(ctx, query)
	if err != nil {
		return 0, err
	}

	// Get row count
	var count int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", mv.TargetTable)
	db.QueryRowContext(ctx, countQuery).Scan(&count)

	return count, nil
}

// refreshMySQLMV refreshes a MySQL table-based materialized view
func (s *MaterializedViewService) refreshMySQLMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) (int64, error) {
	// Truncate and repopulate
	truncateQuery := fmt.Sprintf("TRUNCATE TABLE %s", mv.TargetTable)
	if _, err := db.ExecContext(ctx, truncateQuery); err != nil {
		return 0, fmt.Errorf("failed to truncate table: %w", err)
	}

	insertQuery := fmt.Sprintf("INSERT INTO %s %s", mv.TargetTable, mv.SourceQuery)
	result, err := db.ExecContext(ctx, insertQuery)
	if err != nil {
		return 0, fmt.Errorf("failed to insert data: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	return rowsAffected, nil
}

// refreshSQLiteMV refreshes a SQLite table-based materialized view
func (s *MaterializedViewService) refreshSQLiteMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) (int64, error) {
	// Delete all rows and repopulate
	deleteQuery := fmt.Sprintf("DELETE FROM %s", mv.TargetTable)
	if _, err := db.ExecContext(ctx, deleteQuery); err != nil {
		return 0, fmt.Errorf("failed to delete rows: %w", err)
	}

	insertQuery := fmt.Sprintf("INSERT INTO %s %s", mv.TargetTable, mv.SourceQuery)
	result, err := db.ExecContext(ctx, insertQuery)
	if err != nil {
		return 0, fmt.Errorf("failed to insert data: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	return rowsAffected, nil
}

// refreshGenericMV refreshes a generic table-based materialized view
func (s *MaterializedViewService) refreshGenericMV(ctx context.Context, db *sql.DB, mv *models.MaterializedView) (int64, error) {
	return s.refreshSQLiteMV(ctx, db, mv)
}

// performIncrementalRefresh performs an incremental refresh using IncrementalRefreshService
func (s *MaterializedViewService) performIncrementalRefresh(
	ctx context.Context,
	connection *models.Connection,
	mv *models.MaterializedView,
) (int64, error) {
	// Ensure we have a last refresh time
	if mv.LastRefresh == nil || mv.LastRefresh.IsZero() {
		// First refresh - do full refresh
		return s.performFullRefresh(ctx, connection, mv)
	}

	// Auto-detect timestamp column
	timestampColumn, err := s.incrementalRefresh.DetectTimestampColumn(ctx, connection, mv.SourceQuery)
	if err != nil {
		// Fall back to full refresh if no timestamp column found
		return s.performFullRefresh(ctx, connection, mv)
	}

	// Extract primary keys from metadata, with fallback to "id"
	var primaryKeys []string
	if mv.Metadata != nil {
		if keys, ok := mv.Metadata["primary_keys"].([]interface{}); ok {
			for _, key := range keys {
				if keyStr, ok := key.(string); ok {
					primaryKeys = append(primaryKeys, keyStr)
				}
			}
		}
	}

	// Fallback to "id" if no primary keys configured (common convention)
	if len(primaryKeys) == 0 {
		primaryKeys = []string{"id"}
	}

	// Build refresh config
	config := RefreshConfig{
		TimestampColumn: timestampColumn,
		PrimaryKeys:     primaryKeys,
		LastRefresh:     *mv.LastRefresh,
	}

	// Perform incremental refresh
	rowsAffected, err := s.incrementalRefresh.PerformIncrementalRefresh(ctx, connection, mv, config)
	if err != nil {
		// If incremental refresh fails, fall back to full refresh
		return s.performFullRefresh(ctx, connection, mv)
	}

	return rowsAffected, nil
}

// DropMaterializedView drops a materialized view
func (s *MaterializedViewService) DropMaterializedView(ctx context.Context, mvID string) error {
	// Get materialized view
	var mv models.MaterializedView
	if err := s.db.Where("id = ?", mvID).First(&mv).Error; err != nil {
		return fmt.Errorf("materialized view not found: %w", err)
	}

	// Get connection
	var connection models.Connection
	if err := s.db.Where("id = ?", mv.ConnectionID).First(&connection).Error; err != nil {
		return fmt.Errorf("connection not found: %w", err)
	}

	// Drop from database
	db, err := s.executor.getConnection(&connection)
	if err != nil {
		return fmt.Errorf("failed to get database connection: %w", err)
	}
	defer db.Close()

	var dropQuery string
	if connection.Type == "postgres" {
		dropQuery = fmt.Sprintf("DROP MATERIALIZED VIEW IF EXISTS %s", mv.TargetTable)
	} else {
		dropQuery = fmt.Sprintf("DROP TABLE IF EXISTS %s", mv.TargetTable)
	}

	if _, err := db.ExecContext(ctx, dropQuery); err != nil {
		return fmt.Errorf("failed to drop materialized view from database: %w", err)
	}

	// Remove cron job if exists
	if mv.Schedule != "" {
		// Note: cron job removal would need job IDs stored, simplified here
	}

	// Delete from our database
	if err := s.db.Delete(&mv).Error; err != nil {
		return fmt.Errorf("failed to delete materialized view record: %w", err)
	}

	return nil
}

// ListMaterializedViews lists all materialized views for a connection
func (s *MaterializedViewService) ListMaterializedViews(connectionID string) ([]models.MaterializedView, error) {
	var mvs []models.MaterializedView
	if err := s.db.Where("connection_id = ?", connectionID).Find(&mvs).Error; err != nil {
		return nil, err
	}
	return mvs, nil
}

// GetMaterializedView gets a single materialized view by ID
func (s *MaterializedViewService) GetMaterializedView(mvID string) (*models.MaterializedView, error) {
	var mv models.MaterializedView
	if err := s.db.Where("id = ?", mvID).First(&mv).Error; err != nil {
		return nil, err
	}
	return &mv, nil
}

// GetRefreshHistory gets refresh history for a materialized view
func (s *MaterializedViewService) GetRefreshHistory(mvID string, limit int) ([]models.RefreshHistory, error) {
	var history []models.RefreshHistory
	query := s.db.Where("materialized_view = ?", mvID).Order("started_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&history).Error; err != nil {
		return nil, err
	}
	return history, nil
}

// setupSchedule sets up a cron job for the materialized view
func (s *MaterializedViewService) setupSchedule(mv *models.MaterializedView) error {
	if mv.Schedule == "" {
		return nil
	}

	_, err := s.cron.AddFunc(mv.Schedule, func() {
		s.RefreshMaterializedView(context.Background(), mv.ID)
	})

	return err
}

// UpdateSchedule updates the refresh schedule
func (s *MaterializedViewService) UpdateSchedule(mvID string, schedule string) error {
	// Validate cron schedule
	if schedule != "" {
		if _, err := cron.ParseStandard(schedule); err != nil {
			return fmt.Errorf("invalid cron schedule: %w", err)
		}
	}

	// Update in database
	if err := s.db.Model(&models.MaterializedView{}).Where("id = ?", mvID).Update("schedule", schedule).Error; err != nil {
		return err
	}

	// Reload cron jobs (simplified - in production would track job IDs)
	// For now, the schedule will be picked up on next app restart

	return nil
}
