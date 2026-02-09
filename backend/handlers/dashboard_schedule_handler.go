package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"

	"github.com/gofiber/fiber/v2"
)

// CreateSchedule creates a report schedule for a dashboard
func CreateSchedule(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Verify dashboard ownership
	var dashboard models.Dashboard
	if err := database.DB.Where("id = ? AND user_id = ?", dashboardID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Dashboard not found",
		})
	}

	type CreateScheduleRequest struct {
		Frequency string `json:"frequency"` // DAILY, WEEKLY, MONTHLY
		Email     string `json:"email"`
		Format    string `json:"format"` // PDF, PNG
	}

	req := new(CreateScheduleRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid input: " + err.Error(),
		})
	}

	// Validation
	if req.Frequency == "" || req.Email == "" || req.Format == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Frequency, email, and format are required",
		})
	}

	if req.Frequency != "DAILY" && req.Frequency != "WEEKLY" && req.Frequency != "MONTHLY" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Frequency must be DAILY, WEEKLY, or MONTHLY",
		})
	}

	if req.Format != "PDF" && req.Format != "PNG" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Format must be PDF or PNG",
		})
	}

	schedule := models.ReportSchedule{
		DashboardID: dashboardID,
		Frequency:   req.Frequency,
		Email:       req.Email,
		Format:      req.Format,
		IsActive:    true,
		NextRunAt:   models.CalculateNextRun(req.Frequency),
	}

	if err := database.DB.Create(&schedule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create schedule: " + err.Error(),
		})
	}

	return c.JSON(schedule)
}
