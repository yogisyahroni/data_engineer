package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// SchedulerHandler handles scheduler job requests
type SchedulerHandler struct {
	schedulerService *services.SchedulerService
}

// NewSchedulerHandler creates a new scheduler handler
func NewSchedulerHandler(schedulerService *services.SchedulerService) *SchedulerHandler {
	return &SchedulerHandler{
		schedulerService: schedulerService,
	}
}

// ListJobs retrieves all scheduled jobs
// GET /api/v1/scheduler/jobs
func (h *SchedulerHandler) ListJobs(c *fiber.Ctx) error {
	jobs, err := h.schedulerService.ListJobs()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list jobs",
		})
	}

	return c.JSON(fiber.Map{
		"jobs": jobs,
	})
}

// GetJob retrieves a specific job by ID
// GET /api/v1/scheduler/jobs/:id
func (h *SchedulerHandler) GetJob(c *fiber.Ctx) error {
	jobID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid job ID",
		})
	}

	job, err := h.schedulerService.GetJob(jobID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Job not found",
		})
	}

	return c.JSON(job)
}

// CreateJob creates a new scheduled job (admin only)
// POST /api/v1/scheduler/jobs
func (h *SchedulerHandler) CreateJob(c *fiber.Ctx) error {
	var input struct {
		Name        string                 `json:"name"`
		Description string                 `json:"description"`
		Schedule    string                 `json:"schedule"`
		Status      string                 `json:"status"`
		Config      map[string]interface{} `json:"config"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if input.Name == "" || input.Schedule == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name and schedule are required",
		})
	}

	// Default status to active
	if input.Status == "" {
		input.Status = "active"
	}

	job := &models.SchedulerJob{
		Name:     input.Name,
		Schedule: input.Schedule,
		Status:   input.Status,
	}

	if err := h.schedulerService.CreateJob(job); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(job)
}

// UpdateJob updates a scheduled job (admin only)
// PUT /api/v1/scheduler/jobs/:id
func (h *SchedulerHandler) UpdateJob(c *fiber.Ctx) error {
	jobID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid job ID",
		})
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := h.schedulerService.UpdateJob(jobID, updates); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Get updated job
	job, _ := h.schedulerService.GetJob(jobID)

	return c.JSON(job)
}

// DeleteJob deletes a scheduled job (admin only)
// DELETE /api/v1/scheduler/jobs/:id
func (h *SchedulerHandler) DeleteJob(c *fiber.Ctx) error {
	jobID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid job ID",
		})
	}

	if err := h.schedulerService.DeleteJob(jobID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Job deleted successfully",
	})
}

// PauseJob pauses a scheduled job
// POST /api/v1/scheduler/jobs/:id/pause
func (h *SchedulerHandler) PauseJob(c *fiber.Ctx) error {
	jobID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid job ID",
		})
	}

	if err := h.schedulerService.PauseJob(jobID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Job paused successfully",
	})
}

// ResumeJob resumes a paused job
// POST /api/v1/scheduler/jobs/:id/resume
func (h *SchedulerHandler) ResumeJob(c *fiber.Ctx) error {
	jobID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid job ID",
		})
	}

	if err := h.schedulerService.ResumeJob(jobID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Job resumed successfully",
	})
}

// TriggerJob triggers a job immediately
// POST /api/v1/scheduler/jobs/:id/trigger
func (h *SchedulerHandler) TriggerJob(c *fiber.Ctx) error {
	jobID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid job ID",
		})
	}

	if err := h.schedulerService.TriggerJobNow(jobID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Job triggered successfully",
	})
}
