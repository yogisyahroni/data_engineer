package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"insight-engine-backend/models"
)

// UsageTracker tracks AI usage and enforces budgets
type UsageTracker struct {
	db *gorm.DB
}

// NewUsageTracker creates a new usage tracker
func NewUsageTracker(db *gorm.DB) *UsageTracker {
	return &UsageTracker{
		db: db,
	}
}

// TrackRequest logs an AI request to the database
func (u *UsageTracker) TrackRequest(req *models.AIUsageRequest) error {
	if err := u.db.Create(req).Error; err != nil {
		return fmt.Errorf("failed to track AI request: %w", err)
	}

	return nil
}

// CheckBudget checks if user/workspace is within budget limits
func (u *UsageTracker) CheckBudget(userID, workspaceID *uuid.UUID) error {
	var budgets []models.AIBudget

	// Build query
	query := u.db.Where("enabled = ?", true)

	if userID != nil {
		query = query.Where("(user_id = ? OR user_id IS NULL)", userID)
	}

	if workspaceID != nil {
		query = query.Where("(workspace_id = ? OR workspace_id IS NULL)", workspaceID)
	}

	// Find active budgets
	if err := query.Find(&budgets).Error; err != nil {
		return fmt.Errorf("failed to check budgets: %w", err)
	}

	// Check each budget
	for _, budget := range budgets {
		// Check if budget needs reset
		if budget.ResetAt != nil && budget.ResetAt.Before(time.Now()) {
			// Reset budget
			if err := u.resetBudget(budget.ID); err != nil {
				return err
			}
			continue
		}

		// Check token limit
		if budget.MaxTokens != nil && budget.CurrentTokens >= *budget.MaxTokens {
			return fmt.Errorf("token budget exceeded for %s: %d/%d tokens used", budget.Name, budget.CurrentTokens, *budget.MaxTokens)
		}

		// Check cost limit
		if budget.MaxCost != nil && budget.CurrentCost >= *budget.MaxCost {
			return fmt.Errorf("cost budget exceeded for %s: $%.2f/$%.2f used", budget.Name, budget.CurrentCost, *budget.MaxCost)
		}

		// Check request limit
		if budget.MaxRequests != nil && budget.CurrentRequests >= *budget.MaxRequests {
			return fmt.Errorf("request budget exceeded for %s: %d/%d requests used", budget.Name, budget.CurrentRequests, *budget.MaxRequests)
		}
	}

	return nil
}

// UpdateBudget updates budget usage after a request
func (u *UsageTracker) UpdateBudget(userID, workspaceID *uuid.UUID, tokens int, cost float64) error {
	var budgets []models.AIBudget

	// Build query
	query := u.db.Where("enabled = ?", true)

	if userID != nil {
		query = query.Where("(user_id = ? OR user_id IS NULL)", userID)
	}

	if workspaceID != nil {
		query = query.Where("(workspace_id = ? OR workspace_id IS NULL)", workspaceID)
	}

	// Find active budgets
	if err := query.Find(&budgets).Error; err != nil {
		return fmt.Errorf("failed to find budgets: %w", err)
	}

	// Update each budget
	for _, budget := range budgets {
		updates := map[string]interface{}{
			"current_tokens":   gorm.Expr("current_tokens + ?", tokens),
			"current_cost":     gorm.Expr("current_cost + ?", cost),
			"current_requests": gorm.Expr("current_requests + ?", 1),
			"updated_at":       time.Now(),
		}

		if err := u.db.Model(&models.AIBudget{}).Where("id = ?", budget.ID).Updates(updates).Error; err != nil {
			return fmt.Errorf("failed to update budget: %w", err)
		}

		// Check if alert threshold reached
		if err := u.checkAlertThreshold(budget.ID); err != nil {
			// Log error but don't fail the request
			fmt.Printf("Failed to check alert threshold: %v\n", err)
		}
	}

	return nil
}

// checkAlertThreshold checks if budget alert threshold is reached
func (u *UsageTracker) checkAlertThreshold(budgetID uuid.UUID) error {
	var budget models.AIBudget
	if err := u.db.First(&budget, budgetID).Error; err != nil {
		return err
	}

	// Skip if alert already sent
	if budget.AlertSent {
		return nil
	}

	var percentageUsed float64

	// Calculate percentage based on the most restrictive limit
	if budget.MaxCost != nil {
		percentageUsed = (budget.CurrentCost / *budget.MaxCost) * 100
	} else if budget.MaxTokens != nil {
		percentageUsed = (float64(budget.CurrentTokens) / float64(*budget.MaxTokens)) * 100
	} else if budget.MaxRequests != nil {
		percentageUsed = (float64(budget.CurrentRequests) / float64(*budget.MaxRequests)) * 100
	} else {
		return nil // No limits set
	}

	// Check if threshold reached
	if percentageUsed >= budget.AlertThreshold {
		alertType := "threshold"
		if percentageUsed >= 100 {
			alertType = "exceeded"
		}

		// Create alert
		alert := models.BudgetAlert{
			BudgetID:       budget.ID,
			UserID:         *budget.UserID,
			AlertType:      alertType,
			PercentageUsed: percentageUsed,
			Message:        fmt.Sprintf("Budget '%s' has reached %.1f%% usage", budget.Name, percentageUsed),
		}

		if err := u.db.Create(&alert).Error; err != nil {
			return err
		}

		// Mark alert as sent
		if err := u.db.Model(&budget).Update("alert_sent", true).Error; err != nil {
			return err
		}
	}

	return nil
}

// resetBudget resets a budget's usage counters
func (u *UsageTracker) resetBudget(budgetID uuid.UUID) error {
	var budget models.AIBudget
	if err := u.db.First(&budget, budgetID).Error; err != nil {
		return err
	}

	// Calculate next reset time
	var nextReset time.Time
	switch budget.Period {
	case "hourly":
		nextReset = time.Now().Add(1 * time.Hour)
	case "daily":
		nextReset = time.Now().Add(24 * time.Hour)
	case "monthly":
		nextReset = time.Now().AddDate(0, 1, 0)
	default:
		nextReset = time.Now().AddDate(10, 0, 0) // Far future for "total"
	}

	// Reset budget
	updates := map[string]interface{}{
		"current_tokens":   0,
		"current_cost":     0,
		"current_requests": 0,
		"alert_sent":       false,
		"reset_at":         nextReset,
		"updated_at":       time.Now(),
	}

	return u.db.Model(&budget).Where("id = ?", budgetID).Updates(updates).Error
}

// GetUsageStats returns usage statistics for a user
func (u *UsageTracker) GetUsageStats(userID uuid.UUID, period string) (*models.UsageStats, error) {
	var startDate time.Time

	switch period {
	case "daily":
		startDate = time.Now().AddDate(0, 0, -1)
	case "weekly":
		startDate = time.Now().AddDate(0, 0, -7)
	case "monthly":
		startDate = time.Now().AddDate(0, -1, 0)
	default:
		startDate = time.Time{} // All time
	}

	// Get total stats
	var totalRequests int64
	var totalTokens, totalCost float64

	query := u.db.Model(&models.AIUsageRequest{}).Where("user_id = ?", userID)
	if !startDate.IsZero() {
		query = query.Where("created_at >= ?", startDate)
	}

	query.Count(&totalRequests)
	query.Select("COALESCE(SUM(total_tokens), 0)").Scan(&totalTokens)
	query.Select("COALESCE(SUM(estimated_cost), 0)").Scan(&totalCost)

	// Get stats by provider
	byProvider := make(map[string]models.ProviderStats)
	var providerResults []struct {
		Provider      string
		Requests      int64
		Tokens        int64
		Cost          float64
		AvgDurationMs float64
		SuccessCount  int64
	}

	providerQuery := u.db.Model(&models.AIUsageRequest{}).
		Select("provider, COUNT(*) as requests, SUM(total_tokens) as tokens, SUM(estimated_cost) as cost, AVG(duration_ms) as avg_duration_ms, COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count").
		Where("user_id = ?", userID)

	if !startDate.IsZero() {
		providerQuery = providerQuery.Where("created_at >= ?", startDate)
	}

	providerQuery.Group("provider").Scan(&providerResults)

	for _, result := range providerResults {
		successRate := float64(0)
		if result.Requests > 0 {
			successRate = (float64(result.SuccessCount) / float64(result.Requests)) * 100
		}

		byProvider[result.Provider] = models.ProviderStats{
			Provider:      result.Provider,
			Requests:      int(result.Requests),
			Tokens:        int(result.Tokens),
			Cost:          result.Cost,
			AvgDurationMs: result.AvgDurationMs,
			SuccessRate:   successRate,
		}
	}

	// Get stats by request type
	byRequestType := make(map[string]models.TypeStats)
	var typeResults []struct {
		RequestType string
		Requests    int64
		Tokens      int64
		Cost        float64
	}

	typeQuery := u.db.Model(&models.AIUsageRequest{}).
		Select("request_type, COUNT(*) as requests, SUM(total_tokens) as tokens, SUM(estimated_cost) as cost").
		Where("user_id = ?", userID)

	if !startDate.IsZero() {
		typeQuery = typeQuery.Where("created_at >= ?", startDate)
	}

	typeQuery.Group("request_type").Scan(&typeResults)

	for _, result := range typeResults {
		byRequestType[result.RequestType] = models.TypeStats{
			RequestType: result.RequestType,
			Requests:    int(result.Requests),
			Tokens:      int(result.Tokens),
			Cost:        result.Cost,
		}
	}

	// Get top models
	var topModels []models.ModelStats
	modelQuery := u.db.Model(&models.AIUsageRequest{}).
		Select("provider, model, COUNT(*) as requests, SUM(total_tokens) as tokens, SUM(estimated_cost) as cost").
		Where("user_id = ?", userID)

	if !startDate.IsZero() {
		modelQuery = modelQuery.Where("created_at >= ?", startDate)
	}

	modelQuery.Group("provider, model").Order("requests DESC").Limit(10).Scan(&topModels)

	// Get daily usage
	var dailyUsage []models.DailyStats
	dailyQuery := u.db.Model(&models.AIUsageRequest{}).
		Select("DATE(created_at) as date, COUNT(*) as requests, SUM(total_tokens) as tokens, SUM(estimated_cost) as cost").
		Where("user_id = ?", userID)

	if !startDate.IsZero() {
		dailyQuery = dailyQuery.Where("created_at >= ?", startDate)
	}

	dailyQuery.Group("DATE(created_at)").Order("date DESC").Limit(30).Scan(&dailyUsage)

	return &models.UsageStats{
		TotalRequests: int(totalRequests),
		TotalTokens:   int(totalTokens),
		TotalCost:     totalCost,
		ByProvider:    byProvider,
		ByRequestType: byRequestType,
		TopModels:     topModels,
		DailyUsage:    dailyUsage,
	}, nil
}

// GetRequestHistory returns paginated request history
func (u *UsageTracker) GetRequestHistory(userID uuid.UUID, limit, offset int, filters map[string]interface{}) ([]models.AIUsageRequest, int64, error) {
	var requests []models.AIUsageRequest
	var total int64

	query := u.db.Model(&models.AIUsageRequest{}).Where("user_id = ?", userID)

	// Apply filters
	if provider, ok := filters["provider"].(string); ok && provider != "" {
		query = query.Where("provider = ?", provider)
	}

	if status, ok := filters["status"].(string); ok && status != "" {
		query = query.Where("status = ?", status)
	}

	if requestType, ok := filters["requestType"].(string); ok && requestType != "" {
		query = query.Where("request_type = ?", requestType)
	}

	// Get total count
	query.Count(&total)

	// Get paginated results
	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&requests).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get request history: %w", err)
	}

	return requests, total, nil
}

// GetBudgets returns all budgets for a user
func (u *UsageTracker) GetBudgets(userID uuid.UUID) ([]models.AIBudget, error) {
	var budgets []models.AIBudget
	err := u.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&budgets).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get budgets: %w", err)
	}

	return budgets, nil
}

// CreateBudget creates a new budget
func (u *UsageTracker) CreateBudget(budget *models.AIBudget) error {
	// Set initial reset time
	var resetAt time.Time
	switch budget.Period {
	case "hourly":
		resetAt = time.Now().Add(1 * time.Hour)
	case "daily":
		resetAt = time.Now().Add(24 * time.Hour)
	case "monthly":
		resetAt = time.Now().AddDate(0, 1, 0)
	default:
		resetAt = time.Now().AddDate(10, 0, 0) // Far future for "total"
	}
	budget.ResetAt = &resetAt

	if err := u.db.Create(budget).Error; err != nil {
		return fmt.Errorf("failed to create budget: %w", err)
	}

	return nil
}

// UpdateBudgetConfig updates a budget configuration
func (u *UsageTracker) UpdateBudgetConfig(id uuid.UUID, updates map[string]interface{}) error {
	if err := u.db.Model(&models.AIBudget{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update budget: %w", err)
	}

	return nil
}

// DeleteBudget deletes a budget
func (u *UsageTracker) DeleteBudget(id uuid.UUID) error {
	if err := u.db.Delete(&models.AIBudget{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete budget: %w", err)
	}

	return nil
}

// GetAlerts returns recent budget alerts for a user
func (u *UsageTracker) GetAlerts(userID uuid.UUID, limit int) ([]models.BudgetAlert, error) {
	var alerts []models.BudgetAlert
	err := u.db.Where("user_id = ?", userID).
		Order("sent_at DESC").
		Limit(limit).
		Find(&alerts).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get alerts: %w", err)
	}

	return alerts, nil
}

// AcknowledgeAlert marks an alert as acknowledged
func (u *UsageTracker) AcknowledgeAlert(id uuid.UUID) error {
	if err := u.db.Model(&models.BudgetAlert{}).Where("id = ?", id).Update("acknowledged", true).Error; err != nil {
		return fmt.Errorf("failed to acknowledge alert: %w", err)
	}

	return nil
}
