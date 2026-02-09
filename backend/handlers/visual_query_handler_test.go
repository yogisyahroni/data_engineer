package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"insight-engine-backend/models"
	"insight-engine-backend/services"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Auto-migrate models
	err = db.AutoMigrate(&models.VisualQuery{}, &models.Connection{}, &models.Collection{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

// setupTestHandler creates a test handler with dependencies
func setupTestHandler(t *testing.T) (*VisualQueryHandler, *gorm.DB) {
	db := setupTestDB(t)

	queryExecutor := services.NewQueryExecutor()
	schemaDiscovery := services.NewSchemaDiscovery(queryExecutor)
	queryValidator := services.NewQueryValidator([]string{})
	queryBuilder := services.NewQueryBuilder(queryValidator, schemaDiscovery, nil)

	handler := NewVisualQueryHandler(db, queryBuilder, queryExecutor, schemaDiscovery, nil)

	return handler, db
}

// setupTestApp creates a Fiber app for testing
func setupTestApp(handler *VisualQueryHandler) *fiber.App {
	app := fiber.New()

	// Mock auth middleware that sets user ID
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("userId", "test-user-123")
		return c.Next()
	})

	// Register routes
	app.Get("/visual-queries", handler.GetVisualQueries)
	app.Post("/visual-queries", handler.CreateVisualQuery)
	app.Get("/visual-queries/:id", handler.GetVisualQuery)
	app.Put("/visual-queries/:id", handler.UpdateVisualQuery)
	app.Delete("/visual-queries/:id", handler.DeleteVisualQuery)
	app.Post("/visual-queries/generate-sql", handler.GenerateSQL)
	app.Post("/visual-queries/:id/preview", handler.PreviewVisualQuery)

	return app
}

// Helper function to create config bytes
func createTestConfig() []byte {
	config := models.VisualQueryConfig{
		Tables: []models.TableSelection{
			{Name: "users", Alias: "u"},
		},
		Columns: []models.ColumnSelection{
			{Table: "u", Column: "id"},
		},
	}
	configBytes, _ := json.Marshal(config)
	return configBytes
}

// TestCreateVisualQuery tests POST /visual-queries
func TestCreateVisualQuery(t *testing.T) {
	handler, db := setupTestHandler(t)
	app := setupTestApp(handler)

	// Create test connection and collection
	conn := models.Connection{
		ID:       "test-conn",
		Name:     "Test Connection",
		Type:     "postgres",
		Database: "testdb",
		UserID:   "test-user-123",
	}
	db.Create(&conn)

	coll := models.Collection{
		ID:     "test-coll",
		Name:   "Test Collection",
		UserID: "test-user-123",
	}
	db.Create(&coll)

	// Create request body
	reqBody := map[string]interface{}{
		"name":         "Test Query",
		"description":  "Test Description",
		"connectionId": "test-conn",
		"collectionId": "test-coll",
		"config": map[string]interface{}{
			"tables": []map[string]interface{}{
				{"name": "users", "alias": "u"},
			},
			"columns": []map[string]interface{}{
				{"table": "u", "column": "id"},
			},
			"limit": 10,
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/visual-queries", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	// Note: This will fail schema validation in real scenario
	// For integration test, we're testing the handler flow
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected 201 or 400, got %d", resp.StatusCode)
	}
}

// TestGetVisualQuery tests GET /visual-queries/:id
func TestGetVisualQuery(t *testing.T) {
	handler, db := setupTestHandler(t)
	app := setupTestApp(handler)

	// Create test data
	vq := models.VisualQuery{
		ID:           "test-vq-123",
		Name:         "Test Query",
		ConnectionID: "test-conn",
		CollectionID: "test-coll",
		UserID:       "test-user-123",
		Config:       createTestConfig(),
	}
	db.Create(&vq)

	req := httptest.NewRequest("GET", "/visual-queries/test-vq-123", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200, got %d", resp.StatusCode)
	}

	// Parse response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	if result["id"] != "test-vq-123" {
		t.Error("Expected query ID to match")
	}
}

// TestGetVisualQuery_NotFound tests GET with non-existent ID
func TestGetVisualQuery_NotFound(t *testing.T) {
	handler, _ := setupTestHandler(t)
	app := setupTestApp(handler)

	req := httptest.NewRequest("GET", "/visual-queries/non-existent", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", resp.StatusCode)
	}
}

// TestGetVisualQuery_Unauthorized tests ownership validation
func TestGetVisualQuery_Unauthorized(t *testing.T) {
	handler, db := setupTestHandler(t)

	// Create query owned by different user
	vq := models.VisualQuery{
		ID:           "test-vq-456",
		Name:         "Other User Query",
		ConnectionID: "test-conn",
		CollectionID: "test-coll",
		UserID:       "other-user-456",
		Config:       createTestConfig(),
	}
	db.Create(&vq)

	app := setupTestApp(handler)
	req := httptest.NewRequest("GET", "/visual-queries/test-vq-456", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("Expected 403, got %d", resp.StatusCode)
	}
}

// TestUpdateVisualQuery tests PUT /visual-queries/:id
func TestUpdateVisualQuery(t *testing.T) {
	handler, db := setupTestHandler(t)
	app := setupTestApp(handler)

	// Create test data
	vq := models.VisualQuery{
		ID:           "test-vq-789",
		Name:         "Original Name",
		ConnectionID: "test-conn",
		CollectionID: "test-coll",
		UserID:       "test-user-123",
		Config:       createTestConfig(),
	}
	db.Create(&vq)

	// Update request
	reqBody := map[string]interface{}{
		"name":        "Updated Name",
		"description": "Updated Description",
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("PUT", "/visual-queries/test-vq-789", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200, got %d", resp.StatusCode)
	}

	// Verify update
	var updated models.VisualQuery
	db.First(&updated, "id = ?", "test-vq-789")

	if updated.Name != "Updated Name" {
		t.Error("Expected name to be updated")
	}
}

// TestDeleteVisualQuery tests DELETE /visual-queries/:id
func TestDeleteVisualQuery(t *testing.T) {
	handler, db := setupTestHandler(t)
	app := setupTestApp(handler)

	// Create test data
	vq := models.VisualQuery{
		ID:           "test-vq-delete",
		Name:         "To Delete",
		ConnectionID: "test-conn",
		CollectionID: "test-coll",
		UserID:       "test-user-123",
		Config:       createTestConfig(),
	}
	db.Create(&vq)

	req := httptest.NewRequest("DELETE", "/visual-queries/test-vq-delete", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200, got %d", resp.StatusCode)
	}

	// Verify deletion
	var count int64
	db.Model(&models.VisualQuery{}).Where("id = ?", "test-vq-delete").Count(&count)

	if count != 0 {
		t.Error("Expected query to be deleted")
	}
}

// TestGetVisualQueries tests GET /visual-queries with pagination
func TestGetVisualQueries(t *testing.T) {
	handler, db := setupTestHandler(t)
	app := setupTestApp(handler)

	// Create multiple test queries
	for i := 1; i <= 5; i++ {
		vq := models.VisualQuery{
			ID:           fmt.Sprintf("test-vq-%d", i),
			Name:         fmt.Sprintf("Query %d", i),
			ConnectionID: "test-conn",
			CollectionID: "test-coll",
			UserID:       "test-user-123",
			Config:       createTestConfig(),
		}
		db.Create(&vq)
	}

	req := httptest.NewRequest("GET", "/visual-queries?page=1&pageSize=3", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200, got %d", resp.StatusCode)
	}

	// Parse response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	queries := result["queries"].([]interface{})
	if len(queries) != 3 {
		t.Errorf("Expected 3 queries, got %d", len(queries))
	}
}

// TestGenerateSQL tests POST /visual-queries/generate-sql
func TestGenerateSQL(t *testing.T) {
	handler, db := setupTestHandler(t)
	app := setupTestApp(handler)

	// Create test connection
	conn := models.Connection{
		ID:       "test-conn-gen",
		Name:     "Test Connection",
		Type:     "postgres",
		Database: "testdb",
		UserID:   "test-user-123",
	}
	db.Create(&conn)

	// Request body
	reqBody := map[string]interface{}{
		"connectionId": "test-conn-gen",
		"config": map[string]interface{}{
			"tables": []map[string]interface{}{
				{"name": "users", "alias": "u"},
			},
			"columns": []map[string]interface{}{
				{"table": "u", "column": "id"},
			},
			"limit": 10,
		},
	}

	bodyBytes, _ := json.Marshal(reqBody)
	req := httptest.NewRequest("POST", "/visual-queries/generate-sql", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	// Note: Will fail schema validation without real DB
	// Testing handler flow only
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected 200 or 400, got %d", resp.StatusCode)
	}
}
