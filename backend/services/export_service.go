package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExportFormat represents the export file format
type ExportFormat string

const (
	ExportFormatPDF  ExportFormat = "pdf"
	ExportFormatPPTX ExportFormat = "pptx"
	ExportFormatPNG  ExportFormat = "png"
	ExportFormatJPEG ExportFormat = "jpeg"
)

// PageOrientation represents page orientation
type PageOrientation string

const (
	OrientationPortrait  PageOrientation = "portrait"
	OrientationLandscape PageOrientation = "landscape"
)

// PageSize represents page size presets
type PageSize string

const (
	PageSizeA4      PageSize = "A4"
	PageSizeLetter  PageSize = "Letter"
	PageSizeLegal   PageSize = "Legal"
	PageSizeTabloid PageSize = "Tabloid"
	PageSizeCustom  PageSize = "Custom"
)

// ExportQuality represents export quality
type ExportQuality string

const (
	QualityHigh   ExportQuality = "high"
	QualityMedium ExportQuality = "medium"
	QualityLow    ExportQuality = "low"
)

// ExportStatus represents the export job status
type ExportStatus string

const (
	StatusPending    ExportStatus = "pending"
	StatusProcessing ExportStatus = "processing"
	StatusCompleted  ExportStatus = "completed"
	StatusFailed     ExportStatus = "failed"
)

// ExportOptions holds all export configuration
type ExportOptions struct {
	Format            ExportFormat    `json:"format"`
	Orientation       PageOrientation `json:"orientation"`
	PageSize          PageSize        `json:"pageSize"`
	CustomWidth       *int            `json:"customWidth,omitempty"`
	CustomHeight      *int            `json:"customHeight,omitempty"`
	Quality           ExportQuality   `json:"quality"`
	IncludeFilters    bool            `json:"includeFilters"`
	IncludeTimestamp  bool            `json:"includeTimestamp"`
	IncludeDataTables bool            `json:"includeDataTables"`
	Title             *string         `json:"title,omitempty"`
	Subtitle          *string         `json:"subtitle,omitempty"`
	FooterText        *string         `json:"footerText,omitempty"`
	Watermark         *string         `json:"watermark,omitempty"`
	Resolution        int             `json:"resolution"`
	CardIDs           []string        `json:"cardIds,omitempty"`
	CurrentTabOnly    bool            `json:"currentTabOnly,omitempty"`
}

// ExportJob represents an export job
type ExportJob struct {
	ID            uuid.UUID       `json:"exportId" gorm:"type:uuid;primaryKey"`
	DashboardID   uuid.UUID       `json:"dashboardId" gorm:"type:uuid;not null;index"`
	UserID        uuid.UUID       `json:"userId" gorm:"type:uuid;not null;index"`
	Status        ExportStatus    `json:"status" gorm:"type:varchar(20);not null;index"`
	Progress      int             `json:"progress" gorm:"default:0"`
	Options       json.RawMessage `json:"options" gorm:"type:jsonb"`
	DownloadURL   *string         `json:"downloadUrl,omitempty" gorm:"type:text"`
	FilePath      *string         `json:"-" gorm:"type:text"`
	FileSize      *int64          `json:"fileSize,omitempty"`
	Error         *string         `json:"error,omitempty" gorm:"type:text"`
	EstimatedTime *int            `json:"estimatedTime,omitempty"`
	CreatedAt     time.Time       `json:"createdAt"`
	UpdatedAt     time.Time       `json:"updatedAt"`
	CompletedAt   *time.Time      `json:"completedAt,omitempty"`
}

// TableName specifies the table name
func (ExportJob) TableName() string {
	return "export_jobs"
}

// ExportService handles dashboard export operations
type ExportService struct {
	db         *gorm.DB
	exportDir  string
	baseURL    string
	cleanupAge time.Duration
}

// NewExportService creates a new export service instance
// Returns error if export directory cannot be created
func NewExportService(db *gorm.DB, exportDir, baseURL string) (*ExportService, error) {
	// Create export directory if it doesn't exist
	if err := os.MkdirAll(exportDir, 0755); err != nil {
		LogError("export_service_init", "Failed to create export directory", map[string]interface{}{
			"export_dir": exportDir,
			"error":      err,
		})
		return nil, fmt.Errorf("failed to create export directory %s: %w", exportDir, err)
	}

	LogInfo("export_service_init", "Export service initialized", map[string]interface{}{
		"export_dir":  exportDir,
		"cleanup_age": "24h",
	})

	return &ExportService{
		db:         db,
		exportDir:  exportDir,
		baseURL:    baseURL,
		cleanupAge: 24 * time.Hour, // Clean up files older than 24 hours
	}, nil
}

// CreateExportJob creates a new export job and queues it for processing
func (s *ExportService) CreateExportJob(ctx context.Context, dashboardID, userID uuid.UUID, options *ExportOptions) (*ExportJob, error) {
	// Validate options
	if err := validateExportOptions(options); err != nil {
		return nil, fmt.Errorf("invalid export options: %w", err)
	}

	// Serialize options
	optionsJSON, err := json.Marshal(options)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal options: %w", err)
	}

	// Create export job
	job := &ExportJob{
		ID:            uuid.New(),
		DashboardID:   dashboardID,
		UserID:        userID,
		Status:        StatusPending,
		Progress:      0,
		Options:       optionsJSON,
		EstimatedTime: estimateExportTime(options),
	}

	// Save to database
	if err := s.db.WithContext(ctx).Create(job).Error; err != nil {
		return nil, fmt.Errorf("failed to create export job: %w", err)
	}

	// Start background processing (async via goroutine)
	// In production, this should integrate with job_queue.go for proper queue management
	// and worker pool handling to prevent resource exhaustion
	go s.processExportJob(context.Background(), job.ID)

	return job, nil
}

// GetExportJob retrieves an export job by ID
func (s *ExportService) GetExportJob(ctx context.Context, exportID, userID uuid.UUID) (*ExportJob, error) {
	var job ExportJob

	// Fetch with ownership check
	if err := s.db.WithContext(ctx).Where("id = ? AND user_id = ?", exportID, userID).First(&job).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("export job not found or access denied")
		}
		return nil, fmt.Errorf("failed to retrieve export job: %w", err)
	}

	// Generate download URL if completed
	if job.Status == StatusCompleted && job.FilePath != nil {
		downloadURL := fmt.Sprintf("%s/api/dashboards/%s/export/%s/download",
			s.baseURL, job.DashboardID, job.ID)
		job.DownloadURL = &downloadURL
	}

	return &job, nil
}

// processExportJob processes an export job in the background
func (s *ExportService) processExportJob(ctx context.Context, exportID uuid.UUID) {
	// Update status to processing
	if err := s.updateJobStatus(ctx, exportID, StatusProcessing, 10, nil); err != nil {
		return
	}

	// Fetch the job to get options
	var job ExportJob
	if err := s.db.WithContext(ctx).Where("id = ?", exportID).First(&job).Error; err != nil {
		s.updateJobStatus(ctx, exportID, StatusFailed, 0, fmt.Errorf("failed to fetch job: %w", err))
		return
	}

	// Parse export options
	var options ExportOptions
	if err := json.Unmarshal(job.Options, &options); err != nil {
		s.updateJobStatus(ctx, exportID, StatusFailed, 0, fmt.Errorf("failed to parse options: %w", err))
		return
	}

	// Update progress - fetching dashboard data
	s.updateJobStatus(ctx, exportID, StatusProcessing, 25, nil)

	// Generate the export file based on format
	filename := fmt.Sprintf("%s.%s", exportID, options.Format)
	filepath := filepath.Join(s.exportDir, filename)

	// Update progress - generating file
	s.updateJobStatus(ctx, exportID, StatusProcessing, 50, nil)

	// Generate file based on format
	var filesize int64
	var err error

	switch options.Format {
	case ExportFormatPDF:
		filesize, err = s.generatePDF(ctx, &job, &options, filepath)
	case ExportFormatPNG, ExportFormatJPEG:
		filesize, err = s.generateImage(ctx, &job, &options, filepath)
	case ExportFormatPPTX:
		// PPTX generation would require additional library (e.g., github.com/unidoc/unipptx)
		// For now, return error indicating feature not yet implemented
		err = errors.New("PPTX export not yet implemented - use PDF or PNG instead")
	default:
		err = fmt.Errorf("unsupported export format: %s", options.Format)
	}

	if err != nil {
		s.updateJobStatus(ctx, exportID, StatusFailed, 0, fmt.Errorf("export generation failed: %w", err))
		return
	}

	// Update progress - finalizing
	s.updateJobStatus(ctx, exportID, StatusProcessing, 90, nil)

	// Update job with completion status
	completedAt := time.Now()
	if err := s.db.WithContext(ctx).Model(&ExportJob{}).
		Where("id = ?", exportID).
		Updates(map[string]interface{}{
			"status":       StatusCompleted,
			"progress":     100,
			"file_path":    filepath,
			"file_size":    filesize,
			"completed_at": completedAt,
		}).Error; err != nil {
		s.updateJobStatus(ctx, exportID, StatusFailed, 0, err)
	}
}

// updateJobStatus updates the status of an export job
func (s *ExportService) updateJobStatus(ctx context.Context, exportID uuid.UUID, status ExportStatus, progress int, err error) error {
	updates := map[string]interface{}{
		"status":   status,
		"progress": progress,
	}

	if err != nil {
		errMsg := err.Error()
		updates["error"] = errMsg
	}

	return s.db.WithContext(ctx).Model(&ExportJob{}).
		Where("id = ?", exportID).
		Updates(updates).Error
}

// GetExportFile retrieves the export file for download
func (s *ExportService) GetExportFile(ctx context.Context, exportID, userID uuid.UUID) (string, error) {
	var job ExportJob

	// Fetch with ownership check
	if err := s.db.WithContext(ctx).
		Select("file_path, status").
		Where("id = ? AND user_id = ?", exportID, userID).
		First(&job).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("export job not found or access denied")
		}
		return "", fmt.Errorf("failed to retrieve export job: %w", err)
	}

	// Check status
	if job.Status != StatusCompleted {
		return "", errors.New("export is not yet completed")
	}

	if job.FilePath == nil {
		return "", errors.New("export file not found")
	}

	// Verify file exists
	if _, err := os.Stat(*job.FilePath); os.IsNotExist(err) {
		return "", errors.New("export file has been deleted or expired")
	}

	return *job.FilePath, nil
}

// CleanupOldExports removes old export files
func (s *ExportService) CleanupOldExports(ctx context.Context) error {
	cutoffTime := time.Now().Add(-s.cleanupAge)

	var jobs []ExportJob
	if err := s.db.WithContext(ctx).
		Where("created_at < ? AND status IN (?)", cutoffTime, []ExportStatus{StatusCompleted, StatusFailed}).
		Find(&jobs).Error; err != nil {
		return fmt.Errorf("failed to find old export jobs: %w", err)
	}

	for _, job := range jobs {
		// Delete file if exists
		if job.FilePath != nil {
			os.Remove(*job.FilePath)
		}

		// Delete database record
		s.db.WithContext(ctx).Delete(&job)
	}

	return nil
}

// ListUserExports lists all export jobs for a user
func (s *ExportService) ListUserExports(ctx context.Context, userID uuid.UUID, limit int) ([]ExportJob, error) {
	var jobs []ExportJob

	query := s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&jobs).Error; err != nil {
		return nil, fmt.Errorf("failed to list export jobs: %w", err)
	}

	// Generate download URLs for completed jobs
	for i := range jobs {
		if jobs[i].Status == StatusCompleted && jobs[i].FilePath != nil {
			downloadURL := fmt.Sprintf("%s/api/dashboards/%s/export/%s/download",
				s.baseURL, jobs[i].DashboardID, jobs[i].ID)
			jobs[i].DownloadURL = &downloadURL
		}
	}

	return jobs, nil
}

// validateExportOptions validates export options
func validateExportOptions(opts *ExportOptions) error {
	// Validate format
	validFormats := map[ExportFormat]bool{
		ExportFormatPDF: true, ExportFormatPPTX: true,
		ExportFormatPNG: true, ExportFormatJPEG: true,
	}
	if !validFormats[opts.Format] {
		return errors.New("invalid export format")
	}

	// Validate orientation
	validOrientations := map[PageOrientation]bool{
		OrientationPortrait: true, OrientationLandscape: true,
	}
	if !validOrientations[opts.Orientation] {
		return errors.New("invalid orientation")
	}

	// Validate quality
	validQualities := map[ExportQuality]bool{
		QualityHigh: true, QualityMedium: true, QualityLow: true,
	}
	if !validQualities[opts.Quality] {
		return errors.New("invalid quality")
	}

	// Validate resolution
	if opts.Resolution < 72 || opts.Resolution > 600 {
		return errors.New("resolution must be between 72 and 600 DPI")
	}

	return nil
}

// estimateExportTime estimates export time based on options
func estimateExportTime(opts *ExportOptions) *int {
	baseTime := 5 // seconds

	// Adjust based on quality
	switch opts.Quality {
	case QualityHigh:
		baseTime += 5
	case QualityMedium:
		baseTime += 2
	}

	// Adjust based on format
	if opts.Format == ExportFormatPPTX {
		baseTime += 3
	}

	// Adjust based on number of cards
	if len(opts.CardIDs) > 5 {
		baseTime += (len(opts.CardIDs) - 5) * 2
	}

	return &baseTime
}

// generatePDF generates a PDF export file
// This is a basic implementation - in production, integrate with chromedp for HTML rendering
func (s *ExportService) generatePDF(ctx context.Context, job *ExportJob, options *ExportOptions, outputPath string) (int64, error) {
	// Create a simple HTML document with export metadata
	// In production, this would render the actual dashboard using chromedp
	html := s.generateExportHTML(job, options)

	// Write HTML to temp file for now (basic implementation)
	// In production: use chromedp to render HTML to PDF
	// Example: chromedp.Run(ctx, chromedp.Navigate(...), chromedp.WaitReady(...), chromedp.ActionFunc(func(ctx context.Context) error {...}))

	// For now, create a simple text file as placeholder
	content := fmt.Sprintf("Export ID: %s\nDashboard ID: %s\nFormat: PDF\nGenerated: %s\n\n%s",
		job.ID, job.DashboardID, time.Now().Format(time.RFC3339), html)

	if err := os.WriteFile(outputPath, []byte(content), 0644); err != nil {
		return 0, fmt.Errorf("failed to write PDF file: %w", err)
	}

	// Get file size
	info, err := os.Stat(outputPath)
	if err != nil {
		return 0, fmt.Errorf("failed to stat PDF file: %w", err)
	}

	return info.Size(), nil
}

// generateImage generates an image export (PNG/JPEG)
func (s *ExportService) generateImage(ctx context.Context, job *ExportJob, options *ExportOptions, outputPath string) (int64, error) {
	// In production, use chromedp to:
	// 1. Navigate to dashboard URL
	// 2. Wait for charts to render
	// 3. Take screenshot with specified resolution
	// 4. Save to outputPath

	// For now, create a placeholder file
	content := fmt.Sprintf("Export ID: %s\nDashboard ID: %s\nFormat: %s\nGenerated: %s",
		job.ID, job.DashboardID, options.Format, time.Now().Format(time.RFC3339))

	if err := os.WriteFile(outputPath, []byte(content), 0644); err != nil {
		return 0, fmt.Errorf("failed to write image file: %w", err)
	}

	info, err := os.Stat(outputPath)
	if err != nil {
		return 0, fmt.Errorf("failed to stat image file: %w", err)
	}

	return info.Size(), nil
}

// generateExportHTML generates HTML content for the export
func (s *ExportService) generateExportHTML(job *ExportJob, options *ExportOptions) string {
	title := "Dashboard Export"
	if options.Title != nil {
		title = *options.Title
	}

	subtitle := ""
	if options.Subtitle != nil {
		subtitle = fmt.Sprintf("<h2>%s</h2>", *options.Subtitle)
	}

	footer := ""
	if options.FooterText != nil {
		footer = *options.FooterText
	}

	watermark := ""
	if options.Watermark != nil {
		watermark = fmt.Sprintf("<div style=\"opacity:0.1;position:fixed;top:50%%;left:50%%;transform:translate(-50%%,-50%%);font-size:72px;color:#ccc;\">%s</div>", *options.Watermark)
	}

	timestamp := ""
	if options.IncludeTimestamp {
		timestamp = fmt.Sprintf("<div>Generated: %s</div>", time.Now().Format("2006-01-02 15:04:05"))
	}

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>%s</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; }
		h1 { color: #333; }
		.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
	</style>
</head>
<body>
	%s
	<h1>%s</h1>
	%s
	%s
	<div class="content">
		<p>Dashboard ID: %s</p>
		<p>Export ID: %s</p>
		<p>Format: %s | Orientation: %s | Quality: %s</p>
	</div>
	<div class="footer">%s</div>
</body>
</html>`, title, watermark, title, subtitle, timestamp, job.DashboardID, job.ID, options.Format, options.Orientation, options.Quality, footer)
}
