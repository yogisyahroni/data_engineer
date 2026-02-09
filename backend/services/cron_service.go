package services

import (
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// CronService manages scheduled tasks
type CronService struct {
	db   *gorm.DB
	cron *cron.Cron
}

// NewCronService creates a new cron service
func NewCronService(db *gorm.DB) *CronService {
	return &CronService{
		db:   db,
		cron: cron.New(),
	}
}

// Start starts all cron jobs
func (s *CronService) Start() {
	// Budget reset - runs every hour
	_, err := s.cron.AddFunc("0 * * * *", func() {
		LogInfo("cron_budget_reset", "Starting budget reset job", nil)
		if err := s.resetBudgets(); err != nil {
			LogError("cron_budget_reset", "Budget reset failed", map[string]interface{}{"error": err})
		} else {
			LogInfo("cron_budget_reset", "Budget reset completed successfully", nil)
		}
	})
	if err != nil {
		LogError("cron_schedule", "Failed to schedule budget reset job", map[string]interface{}{"error": err})
	}

	// Materialized view refresh - runs every hour
	_, err = s.cron.AddFunc("0 * * * *", func() {
		LogInfo("cron_view_refresh", "Starting materialized view refresh job", nil)
		if err := s.refreshMaterializedViews(); err != nil {
			LogError("cron_view_refresh", "Materialized view refresh failed", map[string]interface{}{"error": err})
		} else {
			LogInfo("cron_view_refresh", "Materialized view refresh completed successfully", nil)
		}
	})
	if err != nil {
		LogError("cron_schedule", "Failed to schedule view refresh job", map[string]interface{}{"error": err})
	}

	s.cron.Start()
	LogInfo("cron_start", "Cron jobs started successfully", nil)
}

// Stop stops all cron jobs
func (s *CronService) Stop() {
	s.cron.Stop()
	LogInfo("cron_stop", "Cron jobs stopped", nil)
}

// resetBudgets calls the PostgreSQL function to reset budgets
func (s *CronService) resetBudgets() error {
	return s.db.Exec("SELECT reset_budgets()").Error
}

// refreshMaterializedViews refreshes all materialized views
func (s *CronService) refreshMaterializedViews() error {
	return s.db.Exec("SELECT refresh_ai_usage_stats()").Error
}

// RunBudgetResetNow manually triggers budget reset (for testing)
func (s *CronService) RunBudgetResetNow() error {
	LogInfo("cron_manual_budget_reset", "Manual budget reset triggered", nil)
	return s.resetBudgets()
}

// RunViewRefreshNow manually triggers view refresh (for testing)
func (s *CronService) RunViewRefreshNow() error {
	LogInfo("cron_manual_view_refresh", "Manual view refresh triggered", nil)
	return s.refreshMaterializedViews()
}
