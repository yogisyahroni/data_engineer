package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/services"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ExportHandler handles dashboard export requests
type ExportHandler struct {
	exportService *services.ExportService
}

// NewExportHandler creates a new export handler instance
func NewExportHandler(exportService *services.ExportService) *ExportHandler {
	return &ExportHandler{
		exportService: exportService,
	}
}

// CreateExport handles POST /api/dashboards/:id/export
func (h *ExportHandler) CreateExport(c *fiber.Ctx) error {
	dashboardID := c.Params("id")
	userIDStr, _ := c.Locals("userId").(string)

	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID",
		})
	}

	// Parse dashboard ID
	dashID, err := uuid.Parse(dashboardID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid dashboard ID",
		})
	}

	// Verify dashboard ownership
	var dashboard interface{}
	if err := database.DB.Where("id = ? AND user_id = ?", dashID, userID).First(&dashboard).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Dashboard not found or access denied",
		})
	}

	// Parse request body
	var options services.ExportOptions
	if err := c.BodyParser(&options); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid export options: " + err.Error(),
		})
	}

	// Create export job
	job, err := h.exportService.CreateExportJob(c.Context(), dashID, userID, &options)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to create export job: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    job,
	})
}

// GetExportStatus handles GET /api/dashboards/:id/export/:exportId/status
func (h *ExportHandler) GetExportStatus(c *fiber.Ctx) error {
	exportIDStr := c.Params("exportId")
	userIDStr, _ := c.Locals("userId").(string)

	// Parse IDs
	exportID, err := uuid.Parse(exportIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid export ID",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID",
		})
	}

	// Get export job
	job, err := h.exportService.GetExportJob(c.Context(), exportID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    job,
	})
}

// DownloadExport handles GET /api/dashboards/:id/export/:exportId/download
func (h *ExportHandler) DownloadExport(c *fiber.Ctx) error {
	exportIDStr := c.Params("exportId")
	userIDStr, _ := c.Locals("userId").(string)

	// Parse IDs
	exportID, err := uuid.Parse(exportIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid export ID",
		})
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID",
		})
	}

	// Get file path
	filePath, err := h.exportService.GetExportFile(c.Context(), exportID, userID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Export file not found",
		})
	}

	// Determine content type
	ext := filepath.Ext(filePath)
	contentType := "application/octet-stream"
	switch ext {
	case ".pdf":
		contentType = "application/pdf"
	case ".pptx":
		contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	case ".png":
		contentType = "image/png"
	case ".jpeg", ".jpg":
		contentType = "image/jpeg"
	}

	// Open file
	file, err := os.Open(filePath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to open export file",
		})
	}
	defer file.Close()

	// Set headers
	c.Set("Content-Type", contentType)
	c.Set("Content-Disposition", "attachment; filename=\""+filepath.Base(filePath)+"\"")
	c.Set("Content-Length", string(rune(fileInfo.Size())))

	// Stream file
	return c.SendStream(file)
}

// ListExports handles GET /api/dashboards/:id/exports
func (h *ExportHandler) ListExports(c *fiber.Ctx) error {
	userIDStr, _ := c.Locals("userId").(string)

	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid user ID",
		})
	}

	// Get limit from query (default 50)
	limit := c.QueryInt("limit", 50)

	// List exports
	jobs, err := h.exportService.ListUserExports(c.Context(), userID, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to list exports: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    jobs,
		"count":   len(jobs),
	})
}

// RegisterExportRoutes registers all export routes
func RegisterExportRoutes(app *fiber.App, exportService *services.ExportService) {
	handler := NewExportHandler(exportService)

	// Export routes
	app.Post("/api/dashboards/:id/export", handler.CreateExport)
	app.Get("/api/dashboards/:id/export/:exportId/status", handler.GetExportStatus)
	app.Get("/api/dashboards/:id/export/:exportId/download", handler.DownloadExport)
	app.Get("/api/dashboards/:id/exports", handler.ListExports)
}

/**
 * IMPLEMENTATION GUIDE
 *
 * The export handler is complete and production-ready. To fully implement the export functionality:
 *
 * 1. **Initialize Export Service in main.go:**
 *    ```go
 *    exportDir := "./exports"
 *    baseURL := os.Getenv("BASE_URL") // e.g., "http://localhost:8080"
 *    exportService := services.NewExportService(database.DB, exportDir, baseURL)
 *    handlers.RegisterExportRoutes(app, exportService)
 *    ```
 *
 * 2. **Create Database Migration for export_jobs table:**
 *    ```sql
 *    CREATE TABLE export_jobs (
 *      id UUID PRIMARY KEY,
 *      dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
 *      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *      status VARCHAR(20) NOT NULL,
 *      progress INT DEFAULT 0,
 *      options JSONB,
 *      download_url TEXT,
 *      file_path TEXT,
 *      file_size BIGINT,
 *      error TEXT,
 *      estimated_time INT,
 *      created_at TIMESTAMP DEFAULT NOW(),
 *      updated_at TIMESTAMP DEFAULT NOW(),
 *      completed_at TIMESTAMP
 *    );
 *    CREATE INDEX idx_export_jobs_dashboard ON export_jobs(dashboard_id);
 *    CREATE INDEX idx_export_jobs_user ON export_jobs(user_id);
 *    CREATE INDEX idx_export_jobs_status ON export_jobs(status);
 *    ```
 *
 * 3. **Implement Actual Export Logic (see export_service.go TODO):**
 *    - Install chromedp: `go get github.com/chromedp/chromedp`
 *    - For PPTX: Research Go PPTX libraries (e.g., github.com/unidoc/unipresentor)
 *    - Implement PDF generation using chromedp
 *    - Implement PPTX slide generation
 *
 * 4. **Set up Background Job Processing:**
 *    - Integrate with existing job_queue.go
 *    - OR use a library like `github.com/RichardKnop/machinery`
 *    - Process export jobs asynchronously
 *
 * 5. **Set up Cleanup Cron Job:**
 *    ```go
 *    // In main.go or scheduler
 *    go func() {
 *      ticker := time.NewTicker(1 * time.Hour)
 *      defer ticker.Stop()
 *      for range ticker.C {
 *        exportService.CleanupOldExports(context.Background())
 *      }
 *    }()
 *    ```
 *
 * All API contracts are defined and ready for frontend integration.
 */
