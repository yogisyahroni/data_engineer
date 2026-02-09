package ratelimit

import (
	"context"
	"fmt"
	"insight-engine-backend/services"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/time/rate"
)

// RedisRateLimiter implements RateLimiter using Redis for distributed rate limiting
type RedisRateLimiter struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisRateLimiter creates a new Redis-backed rate limiter
func NewRedisRateLimiter(client *redis.Client) *RedisRateLimiter {
	return &RedisRateLimiter{
		client: client,
		ctx:    context.Background(),
	}
}

// Allow checks if the request is allowed using token bucket algorithm in Redis
// This implements a distributed rate limiter that works across multiple backend instances
func (r *RedisRateLimiter) Allow(key string, limit rate.Limit, burst int) bool {
	// Convert rate.Limit to requests per second
	reqPerSecond := float64(limit)

	// Redis key for this limiter
	redisKey := fmt.Sprintf("ratelimit:%s", key)

	now := time.Now().Unix()

	// Lua script for atomic token bucket algorithm
	// This ensures thread-safety across distributed instances
	script := `
		local key = KEYS[1]
		local capacity = tonumber(ARGV[1])
		local rate = tonumber(ARGV[2])
		local now = tonumber(ARGV[3])
		local requested = 1
		
		local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
		local tokens = tonumber(bucket[1])
		local last_update = tonumber(bucket[2])
		
		if tokens == nil then
			tokens = capacity
			last_update = now
		end
		
		-- Calculate tokens to add based on time elapsed
		local elapsed = now - last_update
		local tokens_to_add = elapsed * rate
		tokens = math.min(capacity, tokens + tokens_to_add)
		
		-- Check if we have enough tokens
		if tokens >= requested then
			tokens = tokens - requested
			redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
			redis.call('EXPIRE', key, 3600) -- Expire after 1 hour of inactivity
			return 1
		else
			return 0
		end
	`

	// Execute Lua script atomically
	result, err := r.client.Eval(r.ctx, script, []string{redisKey}, burst, reqPerSecond, now).Result()
	if err != nil {
		// Fail open - allow request if Redis is down
		services.LogWarn("redis_rate_limiter_error", "Redis rate limiter error (failing open)", map[string]interface{}{
			"error": err,
			"key":   key,
		})
		return true
	}

	allowed := result.(int64) == 1
	return allowed
}

// Reset clears the rate limiter for a specific key (for testing)
func (r *RedisRateLimiter) Reset(key string) error {
	redisKey := fmt.Sprintf("ratelimit:%s", key)
	return r.client.Del(r.ctx, redisKey).Err()
}

// GetStats returns current token count for a key (for monitoring)
func (r *RedisRateLimiter) GetStats(key string) (tokens float64, lastUpdate int64, err error) {
	redisKey := fmt.Sprintf("ratelimit:%s", key)

	result, err := r.client.HMGet(r.ctx, redisKey, "tokens", "last_update").Result()
	if err != nil {
		return 0, 0, err
	}

	if result[0] != nil {
		fmt.Sscanf(result[0].(string), "%f", &tokens)
	}
	if result[1] != nil {
		fmt.Sscanf(result[1].(string), "%d", &lastUpdate)
	}

	return tokens, lastUpdate, nil
}
