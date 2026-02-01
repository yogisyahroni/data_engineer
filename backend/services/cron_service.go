package services

import (
	"log"

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
		log.Println("[CRON] Running budget reset...")
		if err := s.resetBudgets(); err != nil {
			log.Printf("[CRON] Budget reset failed: %v", err)
		} else {
			log.Println("[CRON] Budget reset completed successfully")
		}
	})
	if err != nil {
		log.Printf("[CRON] Failed to schedule budget reset: %v", err)
	}

	// Materialized view refresh - runs every hour
	_, err = s.cron.AddFunc("0 * * * *", func() {
		log.Println("[CRON] Refreshing materialized views...")
		if err := s.refreshMaterializedViews(); err != nil {
			log.Printf("[CRON] View refresh failed: %v", err)
		} else {
			log.Println("[CRON] View refresh completed successfully")
		}
	})
	if err != nil {
		log.Printf("[CRON] Failed to schedule view refresh: %v", err)
	}

	s.cron.Start()
	log.Println("[CRON] Cron jobs started successfully")
}

// Stop stops all cron jobs
func (s *CronService) Stop() {
	s.cron.Stop()
	log.Println("[CRON] Cron jobs stopped")
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
	log.Println("[CRON] Manual budget reset triggered")
	return s.resetBudgets()
}

// RunViewRefreshNow manually triggers view refresh (for testing)
func (s *CronService) RunViewRefreshNow() error {
	log.Println("[CRON] Manual view refresh triggered")
	return s.refreshMaterializedViews()
}
