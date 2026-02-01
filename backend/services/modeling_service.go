package services

import (
	"fmt"
	"insight-engine-backend/models"
	"strings"

	"gorm.io/gorm"
)

type ModelingService struct {
	db *gorm.DB
}

func NewModelingService(db *gorm.DB) *ModelingService {
	return &ModelingService{db: db}
}

// Model Definitions

func (s *ModelingService) ListModelDefinitions(workspaceID string) ([]models.ModelDefinition, error) {
	var definitions []models.ModelDefinition
	err := s.db.Where("workspace_id = ?", workspaceID).
		Preload("Metrics").
		Order("created_at DESC").
		Find(&definitions).Error
	return definitions, err
}

func (s *ModelingService) GetModelDefinition(id string) (*models.ModelDefinition, error) {
	var definition models.ModelDefinition
	err := s.db.Where("id = ?", id).
		Preload("Metrics").
		First(&definition).Error
	if err != nil {
		return nil, err
	}
	return &definition, nil
}

func (s *ModelingService) CreateModelDefinition(model *models.ModelDefinition) error {
	// Validate type
	validTypes := map[string]bool{"table": true, "view": true, "query": true}
	if !validTypes[model.Type] {
		return fmt.Errorf("invalid model type: %s (must be table, view, or query)", model.Type)
	}

	// Validate source
	if model.Type == "table" || model.Type == "view" {
		if model.SourceTable == "" {
			return fmt.Errorf("source_table is required for type %s", model.Type)
		}
	} else if model.Type == "query" {
		if model.SourceQuery == "" {
			return fmt.Errorf("source_query is required for type query")
		}
	}

	return s.db.Create(model).Error
}

func (s *ModelingService) UpdateModelDefinition(model *models.ModelDefinition) error {
	// Validate type
	validTypes := map[string]bool{"table": true, "view": true, "query": true}
	if !validTypes[model.Type] {
		return fmt.Errorf("invalid model type: %s", model.Type)
	}

	return s.db.Save(model).Error
}

func (s *ModelingService) DeleteModelDefinition(id string) error {
	return s.db.Delete(&models.ModelDefinition{}, "id = ?", id).Error
}

// Metric Definitions

func (s *ModelingService) ListMetricDefinitions(workspaceID string, modelID *string) ([]models.MetricDefinition, error) {
	var metrics []models.MetricDefinition
	query := s.db.Where("workspace_id = ?", workspaceID)

	if modelID != nil && *modelID != "" {
		query = query.Where("model_id = ?", *modelID)
	}

	err := query.Order("created_at DESC").Find(&metrics).Error
	return metrics, err
}

func (s *ModelingService) GetMetricDefinition(id string) (*models.MetricDefinition, error) {
	var metric models.MetricDefinition
	err := s.db.Where("id = ?", id).First(&metric).Error
	if err != nil {
		return nil, err
	}
	return &metric, nil
}

func (s *ModelingService) CreateMetricDefinition(metric *models.MetricDefinition) error {
	// Validate data type
	validDataTypes := map[string]bool{
		"number": true, "currency": true, "percentage": true,
		"count": true, "decimal": true,
	}
	if !validDataTypes[metric.DataType] {
		return fmt.Errorf("invalid data type: %s", metric.DataType)
	}

	// Validate aggregation type if provided
	if metric.AggregationType != "" {
		validAggTypes := map[string]bool{
			"sum": true, "avg": true, "count": true,
			"min": true, "max": true, "count_distinct": true,
		}
		if !validAggTypes[metric.AggregationType] {
			return fmt.Errorf("invalid aggregation type: %s", metric.AggregationType)
		}
	}

	// Validate formula
	if err := s.ValidateFormula(metric.Formula); err != nil {
		return err
	}

	// Validate model_id if provided
	if metric.ModelID != nil && *metric.ModelID != "" {
		var model models.ModelDefinition
		if err := s.db.Where("id = ?", *metric.ModelID).First(&model).Error; err != nil {
			return fmt.Errorf("model not found: %s", *metric.ModelID)
		}
	}

	return s.db.Create(metric).Error
}

func (s *ModelingService) UpdateMetricDefinition(metric *models.MetricDefinition) error {
	// Validate data type
	validDataTypes := map[string]bool{
		"number": true, "currency": true, "percentage": true,
		"count": true, "decimal": true,
	}
	if !validDataTypes[metric.DataType] {
		return fmt.Errorf("invalid data type: %s", metric.DataType)
	}

	// Validate formula
	if err := s.ValidateFormula(metric.Formula); err != nil {
		return err
	}

	return s.db.Save(metric).Error
}

func (s *ModelingService) DeleteMetricDefinition(id string) error {
	return s.db.Delete(&models.MetricDefinition{}, "id = ?", id).Error
}

// ValidateFormula validates metric formula for security
func (s *ModelingService) ValidateFormula(formula string) error {
	if formula == "" {
		return fmt.Errorf("formula cannot be empty")
	}

	// Check for allowed aggregation functions
	allowedFunctions := []string{
		"SUM", "AVG", "COUNT", "MIN", "MAX",
		"COUNT(DISTINCT", "ROUND", "CAST", "COALESCE",
	}

	upperFormula := strings.ToUpper(formula)
	hasValidFunction := false
	for _, fn := range allowedFunctions {
		if strings.Contains(upperFormula, fn) {
			hasValidFunction = true
			break
		}
	}

	if !hasValidFunction {
		return fmt.Errorf("formula must contain a valid aggregation function (SUM, AVG, COUNT, MIN, MAX)")
	}

	// Check for dangerous keywords
	dangerousKeywords := []string{
		"DROP", "DELETE", "UPDATE", "INSERT", "ALTER",
		"CREATE", "EXEC", "EXECUTE", "TRUNCATE", "GRANT",
		"REVOKE", "MERGE", "REPLACE",
	}

	for _, keyword := range dangerousKeywords {
		if strings.Contains(upperFormula, keyword) {
			return fmt.Errorf("formula contains forbidden keyword: %s", keyword)
		}
	}

	return nil
}
