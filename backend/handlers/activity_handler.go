package handlers

import (
	"insight-engine-backend/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ActivityHandler handles activity log requests
type ActivityHandler struct {
	activityService *services.ActivityService
}

// NewActivityHandler creates a new activity handler
func NewActivityHandler(activityService *services.ActivityService) *ActivityHandler {
	return &ActivityHandler{
		activityService: activityService,
	}
}

// GetUserActivity retrieves activity logs for the current user
// GET /api/v1/activity?limit=20&offset=0
func (h *ActivityHandler) GetUserActivity(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse pagination params
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	activities, total, err := h.activityService.GetUserActivity(userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get activities",
		})
	}

	return c.JSON(fiber.Map{
		"activities": activities,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// GetWorkspaceActivity retrieves activity logs for a workspace
// GET /api/v1/activity/workspace/:id
func (h *ActivityHandler) GetWorkspaceActivity(c *fiber.Ctx) error {
	workspaceID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid workspace ID",
		})
	}

	// Parse pagination params
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	activities, total, err := h.activityService.GetWorkspaceActivity(workspaceID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get workspace activities",
		})
	}

	return c.JSON(fiber.Map{
		"activities": activities,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// GetRecentActivity retrieves recent activity across all users (admin only)
// GET /api/v1/activity/recent
func (h *ActivityHandler) GetRecentActivity(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	activities, err := h.activityService.GetRecentActivity(limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get recent activities",
		})
	}

	return c.JSON(fiber.Map{
		"activities": activities,
	})
}
