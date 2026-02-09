package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"insight-engine-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GeoJSONService handles GeoJSON file operations
type GeoJSONService struct {
	db *gorm.DB
}

// NewGeoJSONService creates a new GeoJSON service instance
func NewGeoJSONService(db *gorm.DB) *GeoJSONService {
	return &GeoJSONService{db: db}
}

// UploadGeoJSON stores a new GeoJSON file in the database
func (s *GeoJSONService) UploadGeoJSON(userID uuid.UUID, name, filename string, data json.RawMessage) (*models.GeoJSONFile, error) {
	// Validate GeoJSON structure
	fc, err := models.ValidateGeoJSON(data)
	if err != nil {
		return nil, fmt.Errorf("invalid GeoJSON: %w", err)
	}

	// Calculate bounding box
	bbox := fc.CalculateBBox()
	bboxJSON, err := json.Marshal(bbox)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal bbox: %w", err)
	}

	// Create GeoJSON file record
	geoJSONFile := &models.GeoJSONFile{
		UserID:       userID,
		Name:         name,
		Filename:     filename,
		FileSize:     len(data),
		FeatureCount: len(fc.Features),
		BBox:         bboxJSON,
		GeoJSONData:  data,
	}

	// Save to database
	if err := s.db.Create(geoJSONFile).Error; err != nil {
		return nil, fmt.Errorf("failed to save GeoJSON file: %w", err)
	}

	return geoJSONFile, nil
}

// GetGeoJSON retrieves a GeoJSON file by ID
func (s *GeoJSONService) GetGeoJSON(id uuid.UUID, userID uuid.UUID) (*models.GeoJSONFile, error) {
	var geoJSONFile models.GeoJSONFile

	// Fetch with user ownership check
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&geoJSONFile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("GeoJSON file not found or access denied")
		}
		return nil, fmt.Errorf("failed to retrieve GeoJSON file: %w", err)
	}

	return &geoJSONFile, nil
}

// ListGeoJSON retrieves all GeoJSON files for a user
func (s *GeoJSONService) ListGeoJSON(userID uuid.UUID) ([]models.GeoJSONFile, error) {
	var files []models.GeoJSONFile

	// Omit geojson_data for list performance (can be large)
	if err := s.db.Select("id, user_id, name, description, filename, file_size, feature_count, bbox, created_at, updated_at").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&files).Error; err != nil {
		return nil, fmt.Errorf("failed to list GeoJSON files: %w", err)
	}

	return files, nil
}

// UpdateGeoJSON updates a GeoJSON file's metadata
func (s *GeoJSONService) UpdateGeoJSON(id uuid.UUID, userID uuid.UUID, name, description string) (*models.GeoJSONFile, error) {
	var geoJSONFile models.GeoJSONFile

	// Find with ownership check
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&geoJSONFile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("GeoJSON file not found or access denied")
		}
		return nil, fmt.Errorf("failed to find GeoJSON file: %w", err)
	}

	// Update fields
	geoJSONFile.Name = name
	geoJSONFile.Description = description

	if err := s.db.Save(&geoJSONFile).Error; err != nil {
		return nil, fmt.Errorf("failed to update GeoJSON file: %w", err)
	}

	return &geoJSONFile, nil
}

// DeleteGeoJSON removes a GeoJSON file
func (s *GeoJSONService) DeleteGeoJSON(id uuid.UUID, userID uuid.UUID) error {
	// Delete with ownership check
	result := s.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.GeoJSONFile{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete GeoJSON file: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return errors.New("GeoJSON file not found or access denied")
	}

	return nil
}

// GetGeoJSONData retrieves only the GeoJSON data (for rendering)
func (s *GeoJSONService) GetGeoJSONData(id uuid.UUID, userID uuid.UUID) (json.RawMessage, error) {
	var data json.RawMessage

	// Fetch only geojson_data field for performance
	if err := s.db.Model(&models.GeoJSONFile{}).
		Select("geojson_data").
		Where("id = ? AND user_id = ?", id, userID).
		First(&data).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("GeoJSON file not found or access denied")
		}
		return nil, fmt.Errorf("failed to retrieve GeoJSON data: %w", err)
	}

	return data, nil
}

// ValidateUploadSize checks if the upload size is within limits
func (s *GeoJSONService) ValidateUploadSize(dataSize int) error {
	const maxSizeBytes = 10 * 1024 * 1024 // 10 MB

	if dataSize > maxSizeBytes {
		return fmt.Errorf("GeoJSON file too large (max 10MB, got %d bytes)", dataSize)
	}

	return nil
}
