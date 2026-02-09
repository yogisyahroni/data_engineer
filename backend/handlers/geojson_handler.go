package handlers

import (
	"encoding/json"
	"insight-engine-backend/services"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GeoJSONHandler handles GeoJSON file upload and management endpoints
type GeoJSONHandler struct {
	service *services.GeoJSONService
}

// NewGeoJSONHandler creates a new GeoJSON handler instance
func NewGeoJSONHandler(service *services.GeoJSONService) *GeoJSONHandler {
	return &GeoJSONHandler{service: service}
}

// UploadGeoJSONRequest represents the request body for uploading GeoJSON
type UploadGeoJSONRequest struct {
	Name        string          `json:"name" validate:"required,min=1,max=255"`
	Description string          `json:"description"`
	GeoJSON     json.RawMessage `json:"geojson" validate:"required"`
}

// UpdateGeoJSONRequest represents the request body for updating GeoJSON metadata
type UpdateGeoJSONRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=255"`
	Description string `json:"description"`
}

// UploadGeoJSON handles POST /api/geojson
func (h *GeoJSONHandler) UploadGeoJSON(c *fiber.Ctx) error {
	// Extract user ID from context (set by auth middleware)
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: user ID not found",
		})
	}

	// Parse request body
	var req UploadGeoJSONRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate input
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name is required",
		})
	}

	if len(req.GeoJSON) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "GeoJSON data is required",
		})
	}

	// Validate file size
	if err := h.service.ValidateUploadSize(len(req.GeoJSON)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate filename from name
	filename := sanitizeFilename(req.Name) + ".geojson"

	// Upload GeoJSON
	geoJSONFile, err := h.service.UploadGeoJSON(userID, req.Name, filename, req.GeoJSON)
	if err != nil {
		if strings.Contains(err.Error(), "invalid GeoJSON") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to upload GeoJSON file",
		})
	}

	// Return file info (without full GeoJSON data)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":            geoJSONFile.ID,
		"name":          geoJSONFile.Name,
		"description":   geoJSONFile.Description,
		"filename":      geoJSONFile.Filename,
		"file_size":     geoJSONFile.FileSize,
		"feature_count": geoJSONFile.FeatureCount,
		"bbox":          json.RawMessage(geoJSONFile.BBox),
		"created_at":    geoJSONFile.CreatedAt,
	})
}

// ListGeoJSON handles GET /api/geojson
func (h *GeoJSONHandler) ListGeoJSON(c *fiber.Ctx) error {
	// Extract user ID from context
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: user ID not found",
		})
	}

	// List all GeoJSON files for user
	files, err := h.service.ListGeoJSON(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve GeoJSON files",
		})
	}

	return c.JSON(files)
}

// GetGeoJSON handles GET /api/geojson/:id
func (h *GeoJSONHandler) GetGeoJSON(c *fiber.Ctx) error {
	// Extract user ID from context
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: user ID not found",
		})
	}

	// Parse ID parameter
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid GeoJSON file ID",
		})
	}

	// Retrieve GeoJSON file
	file, err := h.service.GetGeoJSON(id, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "access denied") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "GeoJSON file not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve GeoJSON file",
		})
	}

	return c.JSON(file)
}

// GetGeoJSONData handles GET /api/geojson/:id/data
func (h *GeoJSONHandler) GetGeoJSONData(c *fiber.Ctx) error {
	// Extract user ID from context
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: user ID not found",
		})
	}

	// Parse ID parameter
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid GeoJSON file ID",
		})
	}

	// Retrieve only GeoJSON data
	data, err := h.service.GetGeoJSONData(id, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "access denied") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "GeoJSON file not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve GeoJSON data",
		})
	}

	// Return raw GeoJSON with correct content type
	c.Set("Content-Type", "application/geo+json")
	return c.Send(data)
}

// UpdateGeoJSON handles PUT /api/geojson/:id
func (h *GeoJSONHandler) UpdateGeoJSON(c *fiber.Ctx) error {
	// Extract user ID from context
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: user ID not found",
		})
	}

	// Parse ID parameter
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid GeoJSON file ID",
		})
	}

	// Parse request body
	var req UpdateGeoJSONRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate input
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Name is required",
		})
	}

	// Update GeoJSON file
	file, err := h.service.UpdateGeoJSON(id, userID, req.Name, req.Description)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "access denied") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "GeoJSON file not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update GeoJSON file",
		})
	}

	return c.JSON(file)
}

// DeleteGeoJSON handles DELETE /api/geojson/:id
func (h *GeoJSONHandler) DeleteGeoJSON(c *fiber.Ctx) error {
	// Extract user ID from context
	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized: user ID not found",
		})
	}

	// Parse ID parameter
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid GeoJSON file ID",
		})
	}

	// Delete GeoJSON file
	if err := h.service.DeleteGeoJSON(id, userID); err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "access denied") {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "GeoJSON file not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete GeoJSON file",
		})
	}

	return c.JSON(fiber.Map{
		"message": "GeoJSON file deleted successfully",
	})
}

// sanitizeFilename removes special characters from filename
func sanitizeFilename(name string) string {
	// Replace spaces with underscores
	name = strings.ReplaceAll(name, " ", "_")
	// Keep only alphanumeric, underscore, and hyphen
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			result.WriteRune(r)
		}
	}
	return result.String()
}
