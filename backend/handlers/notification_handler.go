package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// NotificationHandler handles notification-related requests
type NotificationHandler struct {
	notificationService *services.NotificationService
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(notificationService *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
	}
}

// GetNotifications retrieves user notifications with pagination
// GET /api/v1/notifications?limit=20&offset=0
func (h *NotificationHandler) GetNotifications(c *fiber.Ctx) error {
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

	// Get notifications
	notifications, total, err := h.notificationService.GetUserNotifications(userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get notifications",
		})
	}

	return c.JSON(fiber.Map{
		"notifications": notifications,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

// GetUnreadNotifications retrieves unread notifications
// GET /api/v1/notifications/unread
func (h *NotificationHandler) GetUnreadNotifications(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	notifications, err := h.notificationService.GetUnreadNotifications(userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get unread notifications",
		})
	}

	return c.JSON(fiber.Map{
		"notifications": notifications,
	})
}

// GetUnreadCount retrieves the count of unread notifications
// GET /api/v1/notifications/unread-count
func (h *NotificationHandler) GetUnreadCount(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	count, err := h.notificationService.GetUnreadCount(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get unread count",
		})
	}

	return c.JSON(fiber.Map{
		"count": count,
	})
}

// MarkAsRead marks a notification as read
// PUT /api/v1/notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	notificationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid notification ID",
		})
	}

	if err := h.notificationService.MarkAsRead(notificationID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Notification marked as read",
	})
}

// MarkAllAsRead marks all notifications as read
// PUT /api/v1/notifications/read-all
func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	if err := h.notificationService.MarkAllAsRead(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to mark all as read",
		})
	}

	return c.JSON(fiber.Map{
		"message": "All notifications marked as read",
	})
}

// DeleteNotification deletes a notification
// DELETE /api/v1/notifications/:id
func (h *NotificationHandler) DeleteNotification(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	notificationID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid notification ID",
		})
	}

	if err := h.notificationService.DeleteNotification(notificationID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Notification deleted",
	})
}

// DeleteReadNotifications deletes all read notifications
// DELETE /api/v1/notifications/read
func (h *NotificationHandler) DeleteReadNotifications(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	if err := h.notificationService.DeleteReadNotifications(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete read notifications",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Read notifications deleted",
	})
}

// CreateNotification creates a new notification (admin only)
// POST /api/v1/notifications
func (h *NotificationHandler) CreateNotification(c *fiber.Ctx) error {
	var input struct {
		UserID   string                 `json:"userId"`
		Title    string                 `json:"title"`
		Message  string                 `json:"message"`
		Type     string                 `json:"type"` // info, success, warning, error
		Link     string                 `json:"link"`
		Metadata map[string]interface{} `json:"metadata"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if input.UserID == "" || input.Title == "" || input.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "UserID, title, and message are required",
		})
	}

	userID, err := uuid.Parse(input.UserID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Default type to info if not provided
	if input.Type == "" {
		input.Type = "info"
	}

	notification := &models.Notification{
		UserID:  userID,
		Title:   input.Title,
		Message: input.Message,
		Type:    input.Type,
		Link:    input.Link,
	}

	if err := h.notificationService.CreateNotification(notification); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create notification",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(notification)
}

// BroadcastSystemNotification broadcasts a notification to all users (admin only)
// POST /api/v1/notifications/broadcast
func (h *NotificationHandler) BroadcastSystemNotification(c *fiber.Ctx) error {
	var input struct {
		Title   string `json:"title"`
		Message string `json:"message"`
		Type    string `json:"type"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if input.Title == "" || input.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title and message are required",
		})
	}

	if input.Type == "" {
		input.Type = "info"
	}

	if err := h.notificationService.BroadcastSystemNotification(input.Title, input.Message, input.Type); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to broadcast notification",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Notification broadcasted successfully",
	})
}
