package services

import (
	"fmt"
	"strings"

	"insight-engine-backend/models"

	"gorm.io/gorm"
)

type SemanticLayerService struct {
	db *gorm.DB
}

func NewSemanticLayerService(db *gorm.DB) *SemanticLayerService {
	return &SemanticLayerService{db: db}
}

// GetModelByID retrieves a semantic model with its dimensions and metrics
func (s *SemanticLayerService) GetModelByID(modelID string) (*models.SemanticModel, error) {
	var model models.SemanticModel
	err := s.db.Preload("Dimensions").Preload("Metrics").First(&model, "id = ?", modelID).Error
	if err != nil {
		return nil, err
	}
	return &model, nil
}

// TranslateSemanticQuery translates a semantic query to SQL
func (s *SemanticLayerService) TranslateSemanticQuery(
	model *models.SemanticModel,
	dimensions []string,
	metrics []string,
	filters map[string]interface{},
	limit int,
) (string, []interface{}, error) {
	// Build dimension mapping
	dimMap := make(map[string]string)
	for _, dim := range model.Dimensions {
		dimMap[dim.Name] = dim.ColumnName
	}

	// Build metric mapping
	metricMap := make(map[string]string)
	for _, metric := range model.Metrics {
		metricMap[metric.Name] = metric.Formula
	}

	// Build SELECT clause
	var selectParts []string

	// Add dimensions
	for _, dimName := range dimensions {
		colName, ok := dimMap[dimName]
		if !ok {
			return "", nil, fmt.Errorf("dimension not found: %s", dimName)
		}
		selectParts = append(selectParts, fmt.Sprintf("%s AS \"%s\"", colName, dimName))
	}

	// Add metrics
	for _, metricName := range metrics {
		formula, ok := metricMap[metricName]
		if !ok {
			return "", nil, fmt.Errorf("metric not found: %s", metricName)
		}
		selectParts = append(selectParts, fmt.Sprintf("%s AS \"%s\"", formula, metricName))
	}

	if len(selectParts) == 0 {
		return "", nil, fmt.Errorf("no dimensions or metrics specified")
	}

	// Build query
	query := fmt.Sprintf("SELECT %s FROM %s", strings.Join(selectParts, ", "), model.Table)

	// Build WHERE clause
	var whereParts []string
	var args []interface{}
	for dimName, value := range filters {
		colName, ok := dimMap[dimName]
		if !ok {
			return "", nil, fmt.Errorf("filter dimension not found: %s", dimName)
		}
		whereParts = append(whereParts, fmt.Sprintf("%s = ?", colName))
		args = append(args, value)
	}

	if len(whereParts) > 0 {
		query += " WHERE " + strings.Join(whereParts, " AND ")
	}

	// Add GROUP BY if we have dimensions and metrics
	if len(dimensions) > 0 && len(metrics) > 0 {
		var groupByParts []string
		for _, dimName := range dimensions {
			colName := dimMap[dimName]
			groupByParts = append(groupByParts, colName)
		}
		query += " GROUP BY " + strings.Join(groupByParts, ", ")
	}

	// Add LIMIT
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	return query, args, nil
}

// ValidateMetricFormula validates a metric formula
func (s *SemanticLayerService) ValidateMetricFormula(formula string) error {
	// Basic validation: check for allowed aggregation functions
	allowedFunctions := []string{"SUM", "AVG", "COUNT", "MIN", "MAX", "COUNT(DISTINCT"}

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

	// Check for dangerous SQL keywords
	dangerousKeywords := []string{"DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE", "EXEC", "EXECUTE"}
	for _, keyword := range dangerousKeywords {
		if strings.Contains(upperFormula, keyword) {
			return fmt.Errorf("formula contains forbidden keyword: %s", keyword)
		}
	}

	return nil
}

// ListModelsByWorkspace retrieves all models for a workspace
func (s *SemanticLayerService) ListModelsByWorkspace(workspaceID string) ([]models.SemanticModel, error) {
	var models []models.SemanticModel
	err := s.db.Preload("Dimensions").Preload("Metrics").
		Where("workspace_id = ?", workspaceID).
		Find(&models).Error
	return models, err
}

// CreateModel creates a new semantic model
func (s *SemanticLayerService) CreateModel(model *models.SemanticModel) error {
	// Validate metric formulas
	for _, metric := range model.Metrics {
		if err := s.ValidateMetricFormula(metric.Formula); err != nil {
			return fmt.Errorf("invalid metric '%s': %w", metric.Name, err)
		}
	}

	return s.db.Create(model).Error
}

// ListMetricsByModel retrieves all metrics for a model
func (s *SemanticLayerService) ListMetricsByModel(modelID string) ([]models.SemanticMetric, error) {
	var metrics []models.SemanticMetric
	err := s.db.Where("model_id = ?", modelID).Find(&metrics).Error
	return metrics, err
}

// ListAllMetrics retrieves all metrics across all models in a workspace
func (s *SemanticLayerService) ListAllMetrics(workspaceID string) ([]models.SemanticMetric, error) {
	var metrics []models.SemanticMetric
	err := s.db.Joins("JOIN semantic_models ON semantic_metrics.model_id = semantic_models.id").
		Where("semantic_models.workspace_id = ?", workspaceID).
		Find(&metrics).Error
	return metrics, err
}
