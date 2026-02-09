package services

import (
	"context"
	"testing"
	"time"

	"insight-engine-backend/models"
)

// TestGenerateCacheKey tests cache key generation
func TestGenerateCacheKey(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)

	config := &models.VisualQueryConfig{
		Tables: []models.TableSelection{
			{Name: "users", Alias: "u"},
		},
		Columns: []models.ColumnSelection{
			{Table: "u", Column: "id"},
		},
	}

	conn := &models.Connection{
		ID:   "conn-123",
		Name: "Test Connection",
	}

	userId := "user-456"

	key := qc.GenerateCacheKey(config, conn, userId)

	// Verify key format
	if len(key) == 0 {
		t.Error("Expected non-empty cache key")
	}

	if key[:9] != "cache:vq:" {
		t.Errorf("Expected key to start with 'cache:vq:', got %s", key)
	}
}

// TestGenerateCacheKey_Deterministic tests that same input produces same key
func TestGenerateCacheKey_Deterministic(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)

	config := &models.VisualQueryConfig{
		Tables: []models.TableSelection{
			{Name: "users", Alias: "u"},
		},
	}

	conn := &models.Connection{ID: "conn-123"}
	userId := "user-456"

	key1 := qc.GenerateCacheKey(config, conn, userId)
	key2 := qc.GenerateCacheKey(config, conn, userId)

	if key1 != key2 {
		t.Errorf("Expected deterministic keys, got %s and %s", key1, key2)
	}
}

// TestGenerateCacheKey_DifferentInputs tests that different inputs produce different keys
func TestGenerateCacheKey_DifferentInputs(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)

	config1 := &models.VisualQueryConfig{
		Tables: []models.TableSelection{{Name: "users"}},
	}

	config2 := &models.VisualQueryConfig{
		Tables: []models.TableSelection{{Name: "orders"}},
	}

	conn := &models.Connection{ID: "conn-123"}
	userId := "user-456"

	key1 := qc.GenerateCacheKey(config1, conn, userId)
	key2 := qc.GenerateCacheKey(config2, conn, userId)

	if key1 == key2 {
		t.Error("Expected different keys for different configs")
	}
}

// TestGetCachedResult_Hit tests cache hit
func TestGetCachedResult_Hit(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	// Create test result
	result := &models.QueryResult{
		Columns: []string{"id", "name"},
		Rows: [][]interface{}{
			{1, "Alice"},
			{2, "Bob"},
		},
		RowCount:      2,
		ExecutionTime: 100,
	}

	// Set cache
	key := "cache:vq:test123"
	err := qc.SetCachedResult(ctx, key, result, nil)
	if err != nil {
		t.Fatalf("SetCachedResult failed: %v", err)
	}

	// Get from cache
	cached, err := qc.GetCachedResult(ctx, key)
	if err != nil {
		t.Fatalf("GetCachedResult failed: %v", err)
	}

	if cached == nil {
		t.Fatal("Expected cache hit, got nil")
	}

	if cached.RowCount != result.RowCount {
		t.Errorf("Expected %d rows, got %d", result.RowCount, cached.RowCount)
	}

	if len(cached.Columns) != len(result.Columns) {
		t.Errorf("Expected %d columns, got %d", len(result.Columns), len(cached.Columns))
	}
}

// TestGetCachedResult_Miss tests cache miss
func TestGetCachedResult_Miss(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	// Get non-existent key
	cached, err := qc.GetCachedResult(ctx, "cache:vq:nonexistent")
	if err != nil {
		t.Fatalf("GetCachedResult failed: %v", err)
	}

	if cached != nil {
		t.Error("Expected cache miss, got result")
	}
}

// TestSetCachedResult tests storing results
func TestSetCachedResult(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	result := &models.QueryResult{
		Columns:       []string{"id"},
		Rows:          [][]interface{}{{1}},
		RowCount:      1,
		ExecutionTime: 50,
	}

	key := "cache:vq:test456"
	err := qc.SetCachedResult(ctx, key, result, nil)
	if err != nil {
		t.Fatalf("SetCachedResult failed: %v", err)
	}

	// Verify it was stored
	exists, err := cache.Exists(ctx, key)
	if err != nil {
		t.Fatalf("Exists check failed: %v", err)
	}

	if !exists {
		t.Error("Expected key to exist after SetCachedResult")
	}
}

// TestSetCachedResult_TTL tests TTL expiration
func TestSetCachedResult_TTL(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 1*time.Second)
	ctx := context.Background()

	result := &models.QueryResult{
		Columns:  []string{"id"},
		RowCount: 1,
	}

	key := "cache:vq:ttl-test"
	err := qc.SetCachedResult(ctx, key, result, nil)
	if err != nil {
		t.Fatalf("SetCachedResult failed: %v", err)
	}

	// Fast-forward time
	mr.FastForward(2 * time.Second)

	// Should be expired
	cached, err := qc.GetCachedResult(ctx, key)
	if err != nil {
		t.Fatalf("GetCachedResult failed: %v", err)
	}

	if cached != nil {
		t.Error("Expected cache miss after TTL expiration")
	}
}

// TestInvalidateQuery tests query invalidation
func TestInvalidateQuery(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	result := &models.QueryResult{
		Columns:  []string{"id"},
		RowCount: 1,
	}

	visualQueryId := "vq-789"
	tags := qc.GenerateTags(visualQueryId, "conn-123", "user-456")

	key := "cache:vq:test789"
	err := qc.SetCachedResult(ctx, key, result, tags)
	if err != nil {
		t.Fatalf("SetCachedResult failed: %v", err)
	}

	// Invalidate by query
	err = qc.InvalidateQuery(ctx, visualQueryId)
	if err != nil {
		t.Fatalf("InvalidateQuery failed: %v", err)
	}

	// Verify cache is cleared
	cached, err := qc.GetCachedResult(ctx, key)
	if err != nil {
		t.Fatalf("GetCachedResult failed: %v", err)
	}

	if cached != nil {
		t.Error("Expected cache to be invalidated")
	}
}

// TestInvalidateConnection tests connection invalidation
func TestInvalidateConnection(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	result := &models.QueryResult{
		Columns:  []string{"id"},
		RowCount: 1,
	}

	connectionId := "conn-999"
	tags := qc.GenerateTags("vq-123", connectionId, "user-456")

	key := "cache:vq:conn-test"
	err := qc.SetCachedResult(ctx, key, result, tags)
	if err != nil {
		t.Fatalf("SetCachedResult failed: %v", err)
	}

	// Invalidate by connection
	err = qc.InvalidateConnection(ctx, connectionId)
	if err != nil {
		t.Fatalf("InvalidateConnection failed: %v", err)
	}

	// Verify cache is cleared
	cached, err := qc.GetCachedResult(ctx, key)
	if err != nil {
		t.Fatalf("GetCachedResult failed: %v", err)
	}

	if cached != nil {
		t.Error("Expected cache to be invalidated")
	}
}

// TestInvalidateUser tests user invalidation
func TestInvalidateUser(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	result := &models.QueryResult{
		Columns:  []string{"id"},
		RowCount: 1,
	}

	userId := "user-888"
	tags := qc.GenerateTags("vq-123", "conn-456", userId)

	key := "cache:vq:user-test"
	err := qc.SetCachedResult(ctx, key, result, tags)
	if err != nil {
		t.Fatalf("SetCachedResult failed: %v", err)
	}

	// Invalidate by user
	err = qc.InvalidateUser(ctx, userId)
	if err != nil {
		t.Fatalf("InvalidateUser failed: %v", err)
	}

	// Verify cache is cleared
	cached, err := qc.GetCachedResult(ctx, key)
	if err != nil {
		t.Fatalf("GetCachedResult failed: %v", err)
	}

	if cached != nil {
		t.Error("Expected cache to be invalidated")
	}
}

// TestCacheStats tests statistics tracking
func TestCacheStats(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	// Set some cached results
	for i := 0; i < 3; i++ {
		result := &models.QueryResult{
			Columns:  []string{"id"},
			RowCount: 1,
		}
		key := "cache:vq:stats-" + string(rune('a'+i))
		err := qc.SetCachedResult(ctx, key, result, nil)
		if err != nil {
			t.Fatalf("SetCachedResult failed: %v", err)
		}
	}

	// Get stats
	stats, err := qc.GetStats(ctx)
	if err != nil {
		t.Fatalf("GetStats failed: %v", err)
	}

	if stats.TotalKeys != 3 {
		t.Errorf("Expected 3 keys, got %d", stats.TotalKeys)
	}
}

// TestGenerateTags tests tag generation
func TestGenerateTags(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)

	tags := qc.GenerateTags("vq-123", "conn-456", "user-789")

	if len(tags) != 3 {
		t.Errorf("Expected 3 tags, got %d", len(tags))
	}

	expectedTags := []string{
		"query:vq-123",
		"conn:conn-456",
		"user:user-789",
	}

	for i, expected := range expectedTags {
		if tags[i] != expected {
			t.Errorf("Expected tag %s, got %s", expected, tags[i])
		}
	}
}

// TestCachedResultWithMetadata tests metadata storage
func TestCachedResultWithMetadata(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	result := &models.QueryResult{
		Columns:  []string{"id"},
		RowCount: 1,
	}

	key := "cache:vq:metadata-test"
	err := qc.SetCachedResultWithMetadata(ctx, key, result, nil)
	if err != nil {
		t.Fatalf("SetCachedResultWithMetadata failed: %v", err)
	}

	// Get with metadata
	metadata, err := qc.GetCachedResultWithMetadata(ctx, key)
	if err != nil {
		t.Fatalf("GetCachedResultWithMetadata failed: %v", err)
	}

	if metadata == nil {
		t.Fatal("Expected metadata, got nil")
	}

	if metadata.Result.RowCount != result.RowCount {
		t.Errorf("Expected %d rows, got %d", result.RowCount, metadata.Result.RowCount)
	}

	if metadata.CachedAt.IsZero() {
		t.Error("Expected non-zero CachedAt time")
	}

	if metadata.ExpiresAt.IsZero() {
		t.Error("Expected non-zero ExpiresAt time")
	}
}

// TestClearAll tests clearing all cache
func TestClearAll(t *testing.T) {
	cache, mr := setupTestRedis(t)
	defer mr.Close()
	defer cache.Close()

	qc := NewQueryCache(cache, 5*time.Minute)
	ctx := context.Background()

	// Set multiple cached results
	for i := 0; i < 5; i++ {
		result := &models.QueryResult{
			Columns:  []string{"id"},
			RowCount: 1,
		}
		key := "cache:vq:clear-" + string(rune('a'+i))
		err := qc.SetCachedResult(ctx, key, result, nil)
		if err != nil {
			t.Fatalf("SetCachedResult failed: %v", err)
		}
	}

	// Clear all
	err := qc.ClearAll(ctx)
	if err != nil {
		t.Fatalf("ClearAll failed: %v", err)
	}

	// Verify all are cleared
	for i := 0; i < 5; i++ {
		key := "cache:vq:clear-" + string(rune('a'+i))
		cached, err := qc.GetCachedResult(ctx, key)
		if err != nil {
			t.Fatalf("GetCachedResult failed: %v", err)
		}
		if cached != nil {
			t.Errorf("Expected key %s to be cleared", key)
		}
	}
}
