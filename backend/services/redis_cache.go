package services

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache manages Redis connections and cache operations
type RedisCache struct {
	client *redis.Client
}

// RedisCacheConfig holds Redis configuration
type RedisCacheConfig struct {
	Host       string
	Password   string
	DB         int
	MaxRetries int
	PoolSize   int
}

// CacheStats represents cache statistics
type CacheStats struct {
	Hits        int64   `json:"hits"`
	Misses      int64   `json:"misses"`
	HitRate     float64 `json:"hitRate"`
	TotalKeys   int64   `json:"totalKeys"`
	MemoryUsage int64   `json:"memoryUsage"` // bytes
	Uptime      int64   `json:"uptime"`      // seconds
}

// NewRedisCache creates a new Redis cache instance
func NewRedisCache(config RedisCacheConfig) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         config.Host,
		Password:     config.Password,
		DB:           config.DB,
		MaxRetries:   config.MaxRetries,
		PoolSize:     config.PoolSize,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisCache{
		client: client,
	}, nil
}

// Get retrieves a value from cache
func (rc *RedisCache) Get(ctx context.Context, key string) ([]byte, error) {
	val, err := rc.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, nil // Key not found (cache miss)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get key %s: %w", key, err)
	}
	return val, nil
}

// Set stores a value in cache with TTL
func (rc *RedisCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	err := rc.client.Set(ctx, key, value, ttl).Err()
	if err != nil {
		return fmt.Errorf("failed to set key %s: %w", key, err)
	}
	return nil
}

// Delete removes a key from cache
func (rc *RedisCache) Delete(ctx context.Context, key string) error {
	err := rc.client.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete key %s: %w", key, err)
	}
	return nil
}

// DeleteByPattern removes all keys matching a pattern
func (rc *RedisCache) DeleteByPattern(ctx context.Context, pattern string) error {
	// Use SCAN to find matching keys (safer than KEYS for production)
	var cursor uint64
	var deletedCount int64

	for {
		var keys []string
		var err error

		keys, cursor, err = rc.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return fmt.Errorf("failed to scan keys with pattern %s: %w", pattern, err)
		}

		if len(keys) > 0 {
			deleted, err := rc.client.Del(ctx, keys...).Result()
			if err != nil {
				return fmt.Errorf("failed to delete keys: %w", err)
			}
			deletedCount += deleted
		}

		// Cursor 0 means we've completed the full iteration
		if cursor == 0 {
			break
		}
	}

	return nil
}

// GetStats retrieves cache statistics
func (rc *RedisCache) GetStats(ctx context.Context) (*CacheStats, error) {
	// Get total keys count
	dbSize, err := rc.client.DBSize(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get DB size: %w", err)
	}

	// Basic stats
	stats := &CacheStats{
		TotalKeys: dbSize,
	}

	// Note: In production, you can parse INFO stats for detailed metrics:
	// - keyspace_hits, keyspace_misses from INFO stats
	// - used_memory from INFO memory
	// - uptime_in_seconds from INFO server

	return stats, nil
}

// Exists checks if a key exists in cache
func (rc *RedisCache) Exists(ctx context.Context, key string) (bool, error) {
	count, err := rc.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check key existence %s: %w", key, err)
	}
	return count > 0, nil
}

// SetWithTags stores a value with associated tags for invalidation
func (rc *RedisCache) SetWithTags(ctx context.Context, key string, value []byte, ttl time.Duration, tags []string) error {
	// Use pipeline for atomic operations
	pipe := rc.client.Pipeline()

	// Set the main key
	pipe.Set(ctx, key, value, ttl)

	// Add key to each tag set
	for _, tag := range tags {
		tagKey := fmt.Sprintf("tag:%s", tag)
		pipe.SAdd(ctx, tagKey, key)
		// Set TTL on tag set (slightly longer than data TTL)
		pipe.Expire(ctx, tagKey, ttl+1*time.Minute)
	}

	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to set key with tags: %w", err)
	}

	return nil
}

// InvalidateByTag removes all keys associated with a tag
func (rc *RedisCache) InvalidateByTag(ctx context.Context, tag string) error {
	tagKey := fmt.Sprintf("tag:%s", tag)

	// Get all keys in the tag set
	keys, err := rc.client.SMembers(ctx, tagKey).Result()
	if err != nil {
		return fmt.Errorf("failed to get tag members: %w", err)
	}

	if len(keys) == 0 {
		return nil // No keys to delete
	}

	// Delete all keys
	pipe := rc.client.Pipeline()
	for _, key := range keys {
		pipe.Del(ctx, key)
	}
	// Delete the tag set itself
	pipe.Del(ctx, tagKey)

	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to invalidate by tag: %w", err)
	}

	return nil
}

// Close closes the Redis connection
func (rc *RedisCache) Close() error {
	return rc.client.Close()
}

// Ping checks if Redis is reachable
func (rc *RedisCache) Ping(ctx context.Context) error {
	return rc.client.Ping(ctx).Err()
}

// FlushDB clears all keys in the current database (use with caution!)
func (rc *RedisCache) FlushDB(ctx context.Context) error {
	return rc.client.FlushDB(ctx).Err()
}
