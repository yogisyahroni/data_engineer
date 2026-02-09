package services

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
)

// setupTestRedis creates a test Redis server
func setupTestRedis(t *testing.T) (*RedisCache, *miniredis.Miniredis) {
	// Create miniredis server
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to start miniredis: %v", err)
	}

	// Create Redis cache
	cache, err := NewRedisCache(RedisCacheConfig{
		Host:       mr.Addr(),
		Password:   "",
		DB:         0,
		MaxRetries: 3,
		PoolSize:   10,
	})
	if err != nil {
		mr.Close()
		t.Fatalf("Failed to create Redis cache: %v", err)
	}

	return cache, mr
}

// TestNewRedisCache tests Redis connection initialization
func TestNewRedisCache(t *testing.T) {
	t.Run("Success", func(t *testing.T) {
		cache, mr := setupTestRedis(t)
		defer mr.Close()
		defer cache.Close()

		// Test ping
		ctx := context.Background()
		err := cache.Ping(ctx)
		if err != nil {
			t.Errorf("Ping failed: %v", err)
		}
	})

	t.Run("ConnectionFailure", func(t *testing.T) {
		// Try to connect to non-existent Redis
		_, err := NewRedisCache(RedisCacheConfig{
			Host:       "localhost:9999",
			Password:   "",
			DB:         0,
			MaxRetries: 1,
			PoolSize:   1,
		})

		if err == nil {
			t.Error("Expected connection error, got nil")
		}
	})
}

// TestRedisCache_SetGet tests basic Set and Get operations
func TestRedisCache_SetGet(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	t.Run("SetAndGet", func(t *testing.T) {
		key := "test:key"
		value := []byte("test value")
		ttl := 5 * time.Minute

		// Set value
		err := cache.Set(ctx, key, value, ttl)
		if err != nil {
			t.Fatalf("Set failed: %v", err)
		}

		// Get value
		retrieved, err := cache.Get(ctx, key)
		if err != nil {
			t.Fatalf("Get failed: %v", err)
		}

		if string(retrieved) != string(value) {
			t.Errorf("Expected %s, got %s", value, retrieved)
		}
	})

	t.Run("GetNonExistent", func(t *testing.T) {
		// Get non-existent key
		retrieved, err := cache.Get(ctx, "non:existent")
		if err != nil {
			t.Fatalf("Get failed: %v", err)
		}

		if retrieved != nil {
			t.Errorf("Expected nil for non-existent key, got %v", retrieved)
		}
	})

	t.Run("SetWithTTL", func(t *testing.T) {
		key := "test:ttl"
		value := []byte("ttl test")
		ttl := 1 * time.Second

		// Set value with short TTL
		err := cache.Set(ctx, key, value, ttl)
		if err != nil {
			t.Fatalf("Set failed: %v", err)
		}

		// Fast-forward time in miniredis
		mr.FastForward(2 * time.Second)

		// Get value (should be expired)
		retrieved, err := cache.Get(ctx, key)
		if err != nil {
			t.Fatalf("Get failed: %v", err)
		}

		if retrieved != nil {
			t.Errorf("Expected nil for expired key, got %v", retrieved)
		}
	})
}

// TestRedisCache_Delete tests deletion
func TestRedisCache_Delete(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	t.Run("DeleteExisting", func(t *testing.T) {
		key := "test:delete"
		value := []byte("to delete")

		// Set value
		err := cache.Set(ctx, key, value, 5*time.Minute)
		if err != nil {
			t.Fatalf("Set failed: %v", err)
		}

		// Delete
		err = cache.Delete(ctx, key)
		if err != nil {
			t.Fatalf("Delete failed: %v", err)
		}

		// Verify deleted
		retrieved, err := cache.Get(ctx, key)
		if err != nil {
			t.Fatalf("Get failed: %v", err)
		}

		if retrieved != nil {
			t.Errorf("Expected nil after delete, got %v", retrieved)
		}
	})

	t.Run("DeleteNonExistent", func(t *testing.T) {
		// Delete non-existent key (should not error)
		err := cache.Delete(ctx, "non:existent")
		if err != nil {
			t.Errorf("Delete non-existent key failed: %v", err)
		}
	})
}

// TestRedisCache_DeleteByPattern tests pattern-based deletion
func TestRedisCache_DeleteByPattern(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	// Set multiple keys
	keys := []string{
		"user:1:profile",
		"user:2:profile",
		"user:3:profile",
		"product:1:details",
	}

	for _, key := range keys {
		err := cache.Set(ctx, key, []byte("data"), 5*time.Minute)
		if err != nil {
			t.Fatalf("Set failed for %s: %v", key, err)
		}
	}

	// Delete user:* pattern
	err := cache.DeleteByPattern(ctx, "user:*")
	if err != nil {
		t.Fatalf("DeleteByPattern failed: %v", err)
	}

	// Verify user keys are deleted
	for _, key := range keys[:3] {
		retrieved, err := cache.Get(ctx, key)
		if err != nil {
			t.Fatalf("Get failed for %s: %v", key, err)
		}
		if retrieved != nil {
			t.Errorf("Expected %s to be deleted, but got %v", key, retrieved)
		}
	}

	// Verify product key still exists
	retrieved, err := cache.Get(ctx, keys[3])
	if err != nil {
		t.Fatalf("Get failed for %s: %v", keys[3], err)
	}
	if retrieved == nil {
		t.Errorf("Expected %s to still exist", keys[3])
	}
}

// TestRedisCache_GetStats tests statistics retrieval
func TestRedisCache_GetStats(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	// Set some keys
	for i := 0; i < 5; i++ {
		key := "test:stats:" + string(rune('a'+i))
		err := cache.Set(ctx, key, []byte("data"), 5*time.Minute)
		if err != nil {
			t.Fatalf("Set failed: %v", err)
		}
	}

	// Get stats
	stats, err := cache.GetStats(ctx)
	if err != nil {
		t.Fatalf("GetStats failed: %v", err)
	}

	if stats.TotalKeys != 5 {
		t.Errorf("Expected 5 keys, got %d", stats.TotalKeys)
	}
}

// TestRedisCache_Exists tests key existence check
func TestRedisCache_Exists(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	t.Run("ExistingKey", func(t *testing.T) {
		key := "test:exists"
		err := cache.Set(ctx, key, []byte("data"), 5*time.Minute)
		if err != nil {
			t.Fatalf("Set failed: %v", err)
		}

		exists, err := cache.Exists(ctx, key)
		if err != nil {
			t.Fatalf("Exists failed: %v", err)
		}

		if !exists {
			t.Error("Expected key to exist")
		}
	})

	t.Run("NonExistentKey", func(t *testing.T) {
		exists, err := cache.Exists(ctx, "non:existent")
		if err != nil {
			t.Fatalf("Exists failed: %v", err)
		}

		if exists {
			t.Error("Expected key to not exist")
		}
	})
}

// TestRedisCache_SetWithTags tests tag-based caching
func TestRedisCache_SetWithTags(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	key := "user:123:profile"
	value := []byte("user data")
	tags := []string{"user:123", "profile"}

	// Set with tags
	err := cache.SetWithTags(ctx, key, value, 5*time.Minute, tags)
	if err != nil {
		t.Fatalf("SetWithTags failed: %v", err)
	}

	// Verify value is set
	retrieved, err := cache.Get(ctx, key)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}

	if string(retrieved) != string(value) {
		t.Errorf("Expected %s, got %s", value, retrieved)
	}

	// Verify tags are created
	for _, tag := range tags {
		tagKey := "tag:" + tag
		exists, err := cache.Exists(ctx, tagKey)
		if err != nil {
			t.Fatalf("Exists failed for tag %s: %v", tag, err)
		}
		if !exists {
			t.Errorf("Expected tag %s to exist", tag)
		}
	}
}

// TestRedisCache_InvalidateByTag tests tag-based invalidation
func TestRedisCache_InvalidateByTag(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	// Set multiple keys with same tag
	keys := []string{
		"user:123:profile",
		"user:123:settings",
		"user:123:preferences",
	}
	tag := "user:123"

	for _, key := range keys {
		err := cache.SetWithTags(ctx, key, []byte("data"), 5*time.Minute, []string{tag})
		if err != nil {
			t.Fatalf("SetWithTags failed for %s: %v", key, err)
		}
	}

	// Invalidate by tag
	err := cache.InvalidateByTag(ctx, tag)
	if err != nil {
		t.Fatalf("InvalidateByTag failed: %v", err)
	}

	// Verify all keys are deleted
	for _, key := range keys {
		retrieved, err := cache.Get(ctx, key)
		if err != nil {
			t.Fatalf("Get failed for %s: %v", key, err)
		}
		if retrieved != nil {
			t.Errorf("Expected %s to be invalidated, but got %v", key, retrieved)
		}
	}

	// Verify tag set is deleted
	tagKey := "tag:" + tag
	exists, err := cache.Exists(ctx, tagKey)
	if err != nil {
		t.Fatalf("Exists failed for tag: %v", err)
	}
	if exists {
		t.Error("Expected tag set to be deleted")
	}
}

// TestRedisCache_FlushDB tests database flush
func TestRedisCache_FlushDB(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	ctx := context.Background()

	// Set some keys
	for i := 0; i < 3; i++ {
		key := "test:flush:" + string(rune('a'+i))
		err := cache.Set(ctx, key, []byte("data"), 5*time.Minute)
		if err != nil {
			t.Fatalf("Set failed: %v", err)
		}
	}

	// Flush DB
	err := cache.FlushDB(ctx)
	if err != nil {
		t.Fatalf("FlushDB failed: %v", err)
	}

	// Verify all keys are deleted
	stats, err := cache.GetStats(ctx)
	if err != nil {
		t.Fatalf("GetStats failed: %v", err)
	}

	if stats.TotalKeys != 0 {
		t.Errorf("Expected 0 keys after flush, got %d", stats.TotalKeys)
	}
}
