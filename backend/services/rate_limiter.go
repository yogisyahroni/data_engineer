package services

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/time/rate"
	"gorm.io/gorm"

	"insight-engine-backend/models"
)

// RateLimiter manages rate limiting with database-driven configuration
type RateLimiter struct {
	db            *gorm.DB
	limiters      map[string]*rate.Limiter // key: "provider:userID" or "user:userID"
	configs       map[string]*models.RateLimitConfig
	configCache   time.Time
	cacheDuration time.Duration
	mu            sync.RWMutex
}

// NewRateLimiter creates a new database-driven rate limiter
func NewRateLimiter(db *gorm.DB) *RateLimiter {
	rl := &RateLimiter{
		db:            db,
		limiters:      make(map[string]*rate.Limiter),
		configs:       make(map[string]*models.RateLimitConfig),
		cacheDuration: 5 * time.Minute, // Refresh config every 5 minutes
	}

	// Load initial configuration
	rl.refreshConfig()

	// Start background config refresh
	go rl.startConfigRefresh()

	return rl
}

// refreshConfig loads rate limit configurations from database
func (r *RateLimiter) refreshConfig() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	var configs []models.RateLimitConfig
	if err := r.db.Where("enabled = ?", true).Find(&configs).Error; err != nil {
		return fmt.Errorf("failed to load rate limit configs: %w", err)
	}

	// Update config cache
	newConfigs := make(map[string]*models.RateLimitConfig)
	for i := range configs {
		config := &configs[i]
		newConfigs[config.Name] = config
	}

	r.configs = newConfigs
	r.configCache = time.Now()

	return nil
}

// startConfigRefresh periodically refreshes configuration from database
func (r *RateLimiter) startConfigRefresh() {
	ticker := time.NewTicker(r.cacheDuration)
	defer ticker.Stop()

	for range ticker.C {
		r.refreshConfig()
	}
}

// getOrCreateLimiter gets or creates a rate limiter for a specific key
func (r *RateLimiter) getOrCreateLimiter(key string, requestsPerMinute int) *rate.Limiter {
	r.mu.Lock()
	defer r.mu.Unlock()

	limiter, exists := r.limiters[key]
	if !exists {
		// Create new limiter with burst = 2x the rate
		limiter = rate.NewLimiter(rate.Limit(requestsPerMinute)/60, requestsPerMinute*2)
		r.limiters[key] = limiter
	}

	return limiter
}

// CheckProviderLimit checks if user can make request to provider
func (r *RateLimiter) CheckProviderLimit(userID uuid.UUID, provider string) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Find provider config
	configName := provider + "_provider"
	config, exists := r.configs[configName]
	if !exists {
		// No config found, allow request (fail-open)
		return nil
	}

	if !config.Enabled {
		return nil
	}

	// Create limiter key
	key := fmt.Sprintf("provider:%s:%s", provider, userID.String())
	limiter := r.getOrCreateLimiter(key, config.RequestsPerMinute)

	// Check if request is allowed
	if !limiter.Allow() {
		// Log violation
		go r.logViolation(userID, config.ID, &provider, config.RequestsPerMinute, "minute")

		return fmt.Errorf("rate limit exceeded for provider %s: %d requests per minute", provider, config.RequestsPerMinute)
	}

	return nil
}

// CheckUserLimit checks global user rate limit
func (r *RateLimiter) CheckUserLimit(userID uuid.UUID) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Find global user config
	config, exists := r.configs["global_user"]
	if !exists {
		// No config found, allow request (fail-open)
		return nil
	}

	if !config.Enabled {
		return nil
	}

	// Create limiter key
	key := fmt.Sprintf("user:%s", userID.String())
	limiter := r.getOrCreateLimiter(key, config.RequestsPerMinute)

	// Check if request is allowed
	if !limiter.Allow() {
		// Log violation
		go r.logViolation(userID, config.ID, nil, config.RequestsPerMinute, "minute")

		return fmt.Errorf("global rate limit exceeded: %d requests per minute", config.RequestsPerMinute)
	}

	return nil
}

// logViolation logs a rate limit violation to database
func (r *RateLimiter) logViolation(userID, configID uuid.UUID, provider *string, limitValue int, windowType string) {
	violation := models.RateLimitViolation{
		UserID:       userID,
		ConfigID:     configID,
		Provider:     provider,
		RequestsMade: limitValue + 1, // Exceeded by 1
		LimitValue:   limitValue,
		WindowType:   windowType,
	}

	if err := r.db.Create(&violation).Error; err != nil {
		// Log error but don't fail the request
		LogWarn("rate_limit_violation_log_failed", "Failed to log rate limit violation", map[string]interface{}{
			"user_id":   userID,
			"config_id": configID,
			"error":     err,
		})
	}
}

// GetConfig returns current rate limit configuration
func (r *RateLimiter) GetConfig(name string) (*models.RateLimitConfig, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	config, exists := r.configs[name]
	if !exists {
		return nil, fmt.Errorf("rate limit config not found: %s", name)
	}

	return config, nil
}

// GetAllConfigs returns all rate limit configurations
func (r *RateLimiter) GetAllConfigs() []*models.RateLimitConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()

	configs := make([]*models.RateLimitConfig, 0, len(r.configs))
	for _, config := range r.configs {
		configs = append(configs, config)
	}

	return configs
}

// UpdateConfig updates a rate limit configuration
func (r *RateLimiter) UpdateConfig(id uuid.UUID, updates map[string]interface{}) error {
	// Update in database
	if err := r.db.Model(&models.RateLimitConfig{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update rate limit config: %w", err)
	}

	// Refresh config cache immediately
	return r.refreshConfig()
}

// CreateConfig creates a new rate limit configuration
func (r *RateLimiter) CreateConfig(config *models.RateLimitConfig) error {
	// Create in database
	if err := r.db.Create(config).Error; err != nil {
		return fmt.Errorf("failed to create rate limit config: %w", err)
	}

	// Refresh config cache immediately
	return r.refreshConfig()
}

// DeleteConfig deletes a rate limit configuration
func (r *RateLimiter) DeleteConfig(id uuid.UUID) error {
	// Delete from database
	if err := r.db.Delete(&models.RateLimitConfig{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete rate limit config: %w", err)
	}

	// Refresh config cache immediately
	return r.refreshConfig()
}

// GetViolations returns recent rate limit violations for a user
func (r *RateLimiter) GetViolations(userID uuid.UUID, limit int) ([]models.RateLimitViolation, error) {
	var violations []models.RateLimitViolation
	err := r.db.Where("user_id = ?", userID).
		Order("violated_at DESC").
		Limit(limit).
		Find(&violations).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get violations: %w", err)
	}

	return violations, nil
}

// ResetLimiter resets the rate limiter for a specific key (for testing)
func (r *RateLimiter) ResetLimiter(key string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.limiters, key)
}

// ResetAllLimiters resets all rate limiters (for testing)
func (r *RateLimiter) ResetAllLimiters() {
	r.mu.Lock()
	defer r.mu.Unlock()

}

// CheckIPLimit checks rate limit based on IP address
func (r *RateLimiter) CheckIPLimit(ip string) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Find IP-based config
	config, exists := r.configs["global_ip_limit"]
	if !exists || !config.Enabled {
		// No config found, allow request (fail-open)
		return nil
	}

	// Create limiter key
	key := fmt.Sprintf("ip:%s", ip)
	limiter := r.getOrCreateLimiter(key, config.RequestsPerMinute)

	// Check if request is allowed
	if !limiter.Allow() {
		// Log violation (use anonymous UUID for unauthenticated requests)
		anonymousUser := uuid.MustParse("00000000-0000-0000-0000-000000000000")
		go r.logViolationWithIP(anonymousUser, config.ID, nil, nil, &ip, config.RequestsPerMinute, "minute")

		return fmt.Errorf("IP rate limit exceeded: %d requests per minute", config.RequestsPerMinute)
	}

	return nil
}

// CheckEndpointLimit checks rate limit for specific endpoint
func (r *RateLimiter) CheckEndpointLimit(userID uuid.UUID, endpoint, ip string) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Find matching endpoint configs
	for _, config := range r.configs {
		if !config.Enabled || config.LimitType != "endpoint" {
			continue
		}

		// Check if endpoint matches pattern
		if config.EndpointPattern != nil && matchEndpointPattern(*config.EndpointPattern, endpoint) {
			// Create limiter key based on scope
			var key string
			switch config.Scope {
			case "ip":
				key = fmt.Sprintf("endpoint:%s:ip:%s", endpoint, ip)
			case "user+ip":
				key = fmt.Sprintf("endpoint:%s:user:%s:ip:%s", endpoint, userID.String(), ip)
			default: // "user"
				key = fmt.Sprintf("endpoint:%s:user:%s", endpoint, userID.String())
			}

			limiter := r.getOrCreateLimiter(key, config.RequestsPerMinute)

			// Check if request is allowed
			if !limiter.Allow() {
				// Log violation
				go r.logViolationWithIP(userID, config.ID, nil, &endpoint, &ip, config.RequestsPerMinute, "minute")

				return fmt.Errorf("endpoint rate limit exceeded for %s: %d requests per minute", endpoint, config.RequestsPerMinute)
			}
		}
	}

	return nil
}

// matchEndpointPattern checks if endpoint matches the pattern
// Supports simple wildcard matching (e.g., "/api/auth/*" matches "/api/auth/login")
func matchEndpointPattern(pattern, endpoint string) bool {
	if pattern == endpoint {
		return true
	}

	// Simple wildcard matching
	if len(pattern) > 0 && pattern[len(pattern)-1] == '*' {
		prefix := pattern[:len(pattern)-1]
		if len(endpoint) >= len(prefix) && endpoint[:len(prefix)] == prefix {
			return true
		}
	}

	return false
}

// logViolationWithIP logs a rate limit violation with IP and endpoint info
func (r *RateLimiter) logViolationWithIP(userID, configID uuid.UUID, provider *string, endpoint *string, sourceIP *string, limitValue int, windowType string) {
	violation := models.RateLimitViolation{
		UserID:       userID,
		ConfigID:     configID,
		Provider:     provider,
		Endpoint:     endpoint,
		SourceIP:     sourceIP,
		RequestsMade: limitValue + 1, // Exceeded by 1
		LimitValue:   limitValue,
		WindowType:   windowType,
	}

	if err := r.db.Create(&violation).Error; err != nil {
		// Log error but don't fail the request
		LogWarn("rate_limit_violation_log_failed", "Failed to log rate limit violation", map[string]interface{}{
			"user_id":   userID,
			"config_id": configID,
			"error":     err,
		})
	}
}
