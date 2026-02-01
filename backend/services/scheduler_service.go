package services

import (
	"fmt"
	"insight-engine-backend/models"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

// SchedulerService handles scheduled job operations
type SchedulerService struct {
	db   *gorm.DB
	cron *cron.Cron
	// Map of job ID to cron entry ID
	entries map[string]cron.EntryID
}

// NewSchedulerService creates a new scheduler service
func NewSchedulerService(db *gorm.DB) *SchedulerService {
	return &SchedulerService{
		db:      db,
		cron:    cron.New(),
		entries: make(map[string]cron.EntryID),
	}
}

// Start starts the scheduler
func (s *SchedulerService) Start() error {
	// Load all active jobs from database
	var jobs []models.SchedulerJob
	if err := s.db.Where("status = ?", "active").Find(&jobs).Error; err != nil {
		return fmt.Errorf("failed to load active jobs: %w", err)
	}

	// Schedule each job
	for _, job := range jobs {
		if err := s.scheduleJob(&job); err != nil {
			log.Printf("[Scheduler] Failed to schedule job %s: %v", job.Name, err)
			continue
		}
	}

	s.cron.Start()
	log.Printf("[Scheduler] Started with %d active jobs", len(jobs))
	return nil
}

// Stop stops the scheduler
func (s *SchedulerService) Stop() {
	s.cron.Stop()
	log.Println("[Scheduler] Stopped")
}

// CreateJob creates a new scheduled job
func (s *SchedulerService) CreateJob(job *models.SchedulerJob) error {
	// Validate cron expression
	if _, err := cron.ParseStandard(job.Schedule); err != nil {
		return fmt.Errorf("invalid cron expression: %w", err)
	}

	// Create job in database
	if err := s.db.Create(job).Error; err != nil {
		return fmt.Errorf("failed to create job: %w", err)
	}

	// Schedule if active
	if job.Status == "active" {
		if err := s.scheduleJob(job); err != nil {
			return fmt.Errorf("failed to schedule job: %w", err)
		}
	}

	return nil
}

// UpdateJob updates a scheduled job
func (s *SchedulerService) UpdateJob(jobID uuid.UUID, updates map[string]interface{}) error {
	// Get existing job
	var job models.SchedulerJob
	if err := s.db.First(&job, "id = ?", jobID).Error; err != nil {
		return fmt.Errorf("job not found: %w", err)
	}

	// Update job
	if err := s.db.Model(&job).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update job: %w", err)
	}

	// Reschedule if schedule or status changed
	if _, hasSchedule := updates["schedule"]; hasSchedule || updates["status"] != nil {
		// Remove old entry
		if entryID, ok := s.entries[jobID.String()]; ok {
			s.cron.Remove(entryID)
			delete(s.entries, jobID.String())
		}

		// Reload job
		if err := s.db.First(&job, "id = ?", jobID).Error; err != nil {
			return fmt.Errorf("failed to reload job: %w", err)
		}

		// Reschedule if active
		if job.Status == "active" {
			if err := s.scheduleJob(&job); err != nil {
				return fmt.Errorf("failed to reschedule job: %w", err)
			}
		}
	}

	return nil
}

// DeleteJob deletes a scheduled job
func (s *SchedulerService) DeleteJob(jobID uuid.UUID) error {
	// Remove from cron if scheduled
	if entryID, ok := s.entries[jobID.String()]; ok {
		s.cron.Remove(entryID)
		delete(s.entries, jobID.String())
	}

	// Delete from database
	if err := s.db.Delete(&models.SchedulerJob{}, "id = ?", jobID).Error; err != nil {
		return fmt.Errorf("failed to delete job: %w", err)
	}

	return nil
}

// GetJob retrieves a job by ID
func (s *SchedulerService) GetJob(jobID uuid.UUID) (*models.SchedulerJob, error) {
	var job models.SchedulerJob
	if err := s.db.First(&job, "id = ?", jobID).Error; err != nil {
		return nil, fmt.Errorf("job not found: %w", err)
	}
	return &job, nil
}

// ListJobs retrieves all jobs
func (s *SchedulerService) ListJobs() ([]models.SchedulerJob, error) {
	var jobs []models.SchedulerJob
	if err := s.db.Order("created_at DESC").Find(&jobs).Error; err != nil {
		return nil, fmt.Errorf("failed to list jobs: %w", err)
	}
	return jobs, nil
}

// PauseJob pauses a job
func (s *SchedulerService) PauseJob(jobID uuid.UUID) error {
	// Remove from cron
	if entryID, ok := s.entries[jobID.String()]; ok {
		s.cron.Remove(entryID)
		delete(s.entries, jobID.String())
	}

	// Update status
	if err := s.db.Model(&models.SchedulerJob{}).
		Where("id = ?", jobID).
		Update("status", "paused").Error; err != nil {
		return fmt.Errorf("failed to pause job: %w", err)
	}

	return nil
}

// ResumeJob resumes a paused job
func (s *SchedulerService) ResumeJob(jobID uuid.UUID) error {
	// Get job
	var job models.SchedulerJob
	if err := s.db.First(&job, "id = ?", jobID).Error; err != nil {
		return fmt.Errorf("job not found: %w", err)
	}

	// Update status
	if err := s.db.Model(&job).Update("status", "active").Error; err != nil {
		return fmt.Errorf("failed to resume job: %w", err)
	}

	// Reschedule
	job.Status = "active"
	if err := s.scheduleJob(&job); err != nil {
		return fmt.Errorf("failed to schedule job: %w", err)
	}

	return nil
}

// TriggerJobNow triggers a job immediately
func (s *SchedulerService) TriggerJobNow(jobID uuid.UUID) error {
	var job models.SchedulerJob
	if err := s.db.First(&job, "id = ?", jobID).Error; err != nil {
		return fmt.Errorf("job not found: %w", err)
	}

	// Execute job function
	go s.executeJob(&job)

	return nil
}

// scheduleJob schedules a job in the cron scheduler
func (s *SchedulerService) scheduleJob(job *models.SchedulerJob) error {
	entryID, err := s.cron.AddFunc(job.Schedule, func() {
		s.executeJob(job)
	})

	if err != nil {
		return fmt.Errorf("failed to add cron job: %w", err)
	}

	s.entries[job.ID.String()] = entryID
	log.Printf("[Scheduler] Scheduled job: %s (%s)", job.Name, job.Schedule)

	return nil
}

// executeJob executes a job's function
func (s *SchedulerService) executeJob(job *models.SchedulerJob) {
	log.Printf("[Scheduler] Executing job: %s", job.Name)

	now := time.Now()
	var lastError string

	// Execute based on job name/config
	switch job.Name {
	case "budget_reset":
		if err := s.db.Exec("SELECT reset_budgets()").Error; err != nil {
			lastError = err.Error()
			log.Printf("[Scheduler] Job %s failed: %v", job.Name, err)
		}

	case "view_refresh":
		if err := s.db.Exec("SELECT refresh_ai_usage_stats()").Error; err != nil {
			lastError = err.Error()
			log.Printf("[Scheduler] Job %s failed: %v", job.Name, err)
		}

	case "cleanup_old_notifications":
		// Extract config
		days := 30
		readOnly := true
		if err := s.db.Exec("SELECT cleanup_old_notifications(?, ?)", days, readOnly).Error; err != nil {
			lastError = err.Error()
			log.Printf("[Scheduler] Job %s failed: %v", job.Name, err)
		}

	case "cleanup_old_activity_logs":
		days := 90
		if err := s.db.Exec("SELECT cleanup_old_activity_logs(?)", days).Error; err != nil {
			lastError = err.Error()
			log.Printf("[Scheduler] Job %s failed: %v", job.Name, err)
		}

	default:
		lastError = "unknown job type"
		log.Printf("[Scheduler] Unknown job: %s", job.Name)
	}

	// Update job status
	updates := map[string]interface{}{
		"last_run": now,
	}

	if lastError != "" {
		updates["last_error"] = lastError
		updates["status"] = "error"
	} else {
		updates["last_error"] = ""
		log.Printf("[Scheduler] Job %s completed successfully", job.Name)
	}

	if err := s.db.Model(&models.SchedulerJob{}).
		Where("id = ?", job.ID).
		Updates(updates).Error; err != nil {
		log.Printf("[Scheduler] Failed to update job status: %v", err)
	}
}
