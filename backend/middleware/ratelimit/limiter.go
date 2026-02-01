package ratelimit

import (
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// RateLimiter defines the interface for rate limiting
type RateLimiter interface {
	// Allow checks if the request is allowed for the given key
	Allow(key string, limit rate.Limit, burst int) bool
}

// MemoryRateLimiter implements RateLimiter using in-memory token buckets
type MemoryRateLimiter struct {
	visitors sync.Map // Map of key -> *rate.Limiter
	mu       sync.Mutex
}

// NewMemoryRateLimiter creates a new in-memory rate limiter
func NewMemoryRateLimiter() *MemoryRateLimiter {
	return &MemoryRateLimiter{}
}

// getLimiter returns the rate limiter for a specific key, creating it if needed
func (m *MemoryRateLimiter) getLimiter(key string, r rate.Limit, b int) *rate.Limiter {
	limiter, exists := m.visitors.Load(key)
	if !exists {
		// Use Mutex to ensure atomic creation for this key if needed
		// But sync.Map LoadOrStore is better
		limiter = rate.NewLimiter(r, b)
		actual, loaded := m.visitors.LoadOrStore(key, limiter)
		if loaded {
			return actual.(*rate.Limiter)
		}
		return limiter.(*rate.Limiter)
	}

	// Update limit/burst if changed?
	// For simplicity, we assume the config per key type (user/provider) is constant.
	// Dynamic updates would require SetLimit.
	l := limiter.(*rate.Limiter)
	if l.Limit() != r {
		l.SetLimit(r)
	}
	if l.Burst() != b {
		l.SetBurst(b)
	}

	return l
}

// Allow checks if the request is allowed
func (m *MemoryRateLimiter) Allow(key string, limit rate.Limit, burst int) bool {
	limiter := m.getLimiter(key, limit, burst)
	return limiter.Allow()
}

// Cleanup removes old entries to prevent memory leaks (optional, run periodically)
func (m *MemoryRateLimiter) Cleanup(ttl time.Duration) {
	// detailed implementation would need to track last access time
	// for now, we leave it simple
}
