package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"insight-engine-backend/models"
)

// QueryCache manages caching for visual query results
type QueryCache struct {
	redis *RedisCache
	ttl   time.Duration
}

// NewQueryCache creates a new query cache instance
func NewQueryCache(redis *RedisCache, ttl time.Duration) *QueryCache {
	return &QueryCache{
		redis: redis,
		ttl:   ttl,
	}
}

// GenerateCacheKey creates a deterministic cache key from query config
func (qc *QueryCache) GenerateCacheKey(config *models.VisualQueryConfig, conn *models.Connection, userId string) string {
	// Create a struct with all relevant data for hashing
	keyData := struct {
		ConnectionID string                    `json:"connectionId"`
		UserID       string                    `json:"userId"`
		Config       *models.VisualQueryConfig `json:"config"`
	}{
		ConnectionID: conn.ID,
		UserID:       userId,
		Config:       config,
	}

	// Marshal to JSON for consistent hashing
	jsonData, err := json.Marshal(keyData)
	if err != nil {
		// Fallback to simple key if marshaling fails
		return fmt.Sprintf("cache:vq:error:%s", userId)
	}

	// Generate SHA-256 hash
	hash := sha256.Sum256(jsonData)
	hashStr := hex.EncodeToString(hash[:])

	// Return cache key with prefix
	return fmt.Sprintf("cache:vq:%s", hashStr)
}

// GetCachedResult retrieves a cached query result
func (qc *QueryCache) GetCachedResult(ctx context.Context, key string) (*models.QueryResult, error) {
	// Get from Redis
	data, err := qc.redis.Get(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get cached result: %w", err)
	}

	if data == nil {
		return nil, nil // Cache miss
	}

	// Unmarshal result
	var result models.QueryResult
	if err := json.Unmarshal(data, &result); err != nil {
		// Invalid cached data, delete it
		_ = qc.redis.Delete(ctx, key)
		return nil, fmt.Errorf("failed to unmarshal cached result: %w", err)
	}

	return &result, nil
}

// SetCachedResult stores a query result in cache
func (qc *QueryCache) SetCachedResult(ctx context.Context, key string, result *models.QueryResult, tags []string) error {
	// Marshal result
	data, err := json.Marshal(result)
	if err != nil {
		return fmt.Errorf("failed to marshal result: %w", err)
	}

	// Store with tags for invalidation
	if len(tags) > 0 {
		err = qc.redis.SetWithTags(ctx, key, data, qc.ttl, tags)
	} else {
		err = qc.redis.Set(ctx, key, data, qc.ttl)
	}

	if err != nil {
		return fmt.Errorf("failed to set cached result: %w", err)
	}

	return nil
}

// InvalidateQuery invalidates all cached results for a visual query
func (qc *QueryCache) InvalidateQuery(ctx context.Context, visualQueryId string) error {
	tag := fmt.Sprintf("query:%s", visualQueryId)
	return qc.redis.InvalidateByTag(ctx, tag)
}

// InvalidateConnection invalidates all cached results for a connection
func (qc *QueryCache) InvalidateConnection(ctx context.Context, connectionId string) error {
	tag := fmt.Sprintf("conn:%s", connectionId)
	return qc.redis.InvalidateByTag(ctx, tag)
}

// InvalidateUser invalidates all cached results for a user
func (qc *QueryCache) InvalidateUser(ctx context.Context, userId string) error {
	tag := fmt.Sprintf("user:%s", userId)
	return qc.redis.InvalidateByTag(ctx, tag)
}

// GetStats retrieves cache statistics
func (qc *QueryCache) GetStats(ctx context.Context) (*CacheStats, error) {
	return qc.redis.GetStats(ctx)
}

// GenerateTags creates tags for a visual query cache entry
func (qc *QueryCache) GenerateTags(visualQueryId, connectionId, userId string) []string {
	tags := []string{
		fmt.Sprintf("query:%s", visualQueryId),
		fmt.Sprintf("conn:%s", connectionId),
		fmt.Sprintf("user:%s", userId),
	}
	return tags
}

// ClearAll clears all cached query results (use with caution!)
func (qc *QueryCache) ClearAll(ctx context.Context) error {
	return qc.redis.DeleteByPattern(ctx, "cache:vq:*")
}

// GetCachedResultWithMetadata retrieves cached result with metadata
type CachedResultWithMetadata struct {
	Result    *models.QueryResult `json:"result"`
	CachedAt  time.Time           `json:"cachedAt"`
	ExpiresAt time.Time           `json:"expiresAt"`
}

// SetCachedResultWithMetadata stores result with metadata
func (qc *QueryCache) SetCachedResultWithMetadata(ctx context.Context, key string, result *models.QueryResult, tags []string) error {
	now := time.Now()
	metadata := CachedResultWithMetadata{
		Result:    result,
		CachedAt:  now,
		ExpiresAt: now.Add(qc.ttl),
	}

	// Marshal with metadata
	data, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal result with metadata: %w", err)
	}

	// Store with tags
	if len(tags) > 0 {
		err = qc.redis.SetWithTags(ctx, key, data, qc.ttl, tags)
	} else {
		err = qc.redis.Set(ctx, key, data, qc.ttl)
	}

	if err != nil {
		return fmt.Errorf("failed to set cached result: %w", err)
	}

	return nil
}

// GetCachedResultWithMetadata retrieves result with metadata
func (qc *QueryCache) GetCachedResultWithMetadata(ctx context.Context, key string) (*CachedResultWithMetadata, error) {
	// Get from Redis
	data, err := qc.redis.Get(ctx, key)
	if err != nil {
		return nil, fmt.Errorf("failed to get cached result: %w", err)
	}

	if data == nil {
		return nil, nil // Cache miss
	}

	// Unmarshal with metadata
	var metadata CachedResultWithMetadata
	if err := json.Unmarshal(data, &metadata); err != nil {
		// Try to unmarshal as plain result (backward compatibility)
		var result models.QueryResult
		if err2 := json.Unmarshal(data, &result); err2 == nil {
			return &CachedResultWithMetadata{
				Result:    &result,
				CachedAt:  time.Now(),
				ExpiresAt: time.Now().Add(qc.ttl),
			}, nil
		}

		// Invalid cached data, delete it
		_ = qc.redis.Delete(ctx, key)
		return nil, fmt.Errorf("failed to unmarshal cached result: %w", err)
	}

	return &metadata, nil
}
