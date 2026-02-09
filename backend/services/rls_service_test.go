package services

import (
	"context"
	"insight-engine-backend/models"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func TestRLSService_ApplyRLSToSQL(t *testing.T) {
	// Setup mock DB (not used for this specific function but needed for service init)
	db, _ := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	service := NewRLSService(db, nil)

	tests := []struct {
		name      string
		sql       string
		policies  []models.RLSPolicy
		tableName string
		expected  string
	}{
		{
			name:      "No policies",
			sql:       "SELECT * FROM users",
			policies:  []models.RLSPolicy{},
			tableName: "users",
			expected:  "SELECT * FROM users",
		},
		{
			name: "Single policy for table",
			sql:  "SELECT * FROM users",
			policies: []models.RLSPolicy{
				{TargetTable: "users", Condition: "tenant_id = '123'"},
			},
			tableName: "users",
			expected:  "SELECT * FROM (\nSELECT * FROM users\n) AS _rls_wrapper WHERE (tenant_id = '123')",
		},
		{
			name: "Multiple policies for table",
			sql:  "SELECT * FROM orders",
			policies: []models.RLSPolicy{
				{TargetTable: "orders", Condition: "user_id = 1"},
				{TargetTable: "orders", Condition: "amount < 1000"},
			},
			tableName: "orders",
			expected:  "SELECT * FROM (\nSELECT * FROM orders\n) AS _rls_wrapper WHERE (user_id = 1) AND (amount < 1000)",
		},
		{
			name: "Policy for different table",
			sql:  "SELECT * FROM products",
			policies: []models.RLSPolicy{
				{TargetTable: "users", Condition: "tenant_id = '123'"},
			},
			tableName: "products",
			expected:  "SELECT * FROM products",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.ApplyRLSToSQL(tt.sql, tt.policies, tt.tableName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestRLSService_DetectTableName(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open("file::memory:"), &gorm.Config{})
	service := NewRLSService(db, nil)

	tests := []struct {
		name     string
		sql      string
		expected string
	}{
		{
			name:     "Simple Select",
			sql:      "SELECT * FROM users",
			expected: "users",
		},
		{
			name:     "Select with Schema",
			sql:      "SELECT * FROM public.orders",
			expected: "public.orders",
		},
		{
			name:     "Case Insensitive",
			sql:      "select id from Products",
			expected: "Products",
		},
		{
			name:     "With Where Clause",
			sql:      "SELECT * FROM users WHERE id = 1",
			expected: "users",
		},
		{
			name:     "Complex Query",
			sql:      "SELECT * FROM (SELECT * FROM a) AS b",
			expected: "a", // Regex finds 'a' in subquery
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.DetectTableName(tt.sql)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestRLSService_GetPoliciesForUser(t *testing.T) {
	// Setup in-memory SQLite DB
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open DB: %v", err)
	}
	if db == nil {
		t.Fatal("DB is nil")
	}
	// AutoMigrate
	db.AutoMigrate(&models.RLSPolicy{})

	// Seed data
	workspaceID := "ws1"
	connID := "conn1"
	userID := "user1"
	role := "admin"

	policies := []models.RLSPolicy{
		{
			ID: "p1", WorkspaceID: workspaceID, ConnectionID: connID,
			TargetTable: "users", UserID: &userID, Condition: "id = 1", IsActive: true,
		},
		{
			ID: "p2", WorkspaceID: workspaceID, ConnectionID: connID,
			TargetTable: "orders", Role: &role, Condition: "amount > 0", IsActive: true,
		},
		{
			ID: "p3", WorkspaceID: "other_ws", ConnectionID: connID,
			TargetTable: "logs", UserID: &userID, Condition: "1=1", IsActive: true,
		},
		{
			ID: "p4", WorkspaceID: workspaceID, ConnectionID: connID,
			TargetTable: "archived", UserID: &userID, Condition: "1=1", IsActive: false,
		},
	}
	db.Create(&policies)
	// Explicitly set p4 to inactive because GORM might ignore false (zero value) when default tag is present
	db.Model(&models.RLSPolicy{}).Where("id = ?", "p4").Update("is_active", false)

	service := NewRLSService(db, nil)

	t.Run("Fetch policies by userID", func(t *testing.T) {
		ctx := context.Background()
		result, err := service.GetPoliciesForUser(ctx, workspaceID, connID, userID, nil)
		assert.NoError(t, err)
		assert.Len(t, result, 1) // Only p1 matches user+ws+conn+active
		assert.Equal(t, "p1", result[0].ID)
	})

	t.Run("Fetch policies by role", func(t *testing.T) {
		ctx := context.Background()
		// Different user but matching role
		otherUser := "user2"
		result, err := service.GetPoliciesForUser(ctx, workspaceID, connID, otherUser, &role)
		assert.NoError(t, err)
		assert.Len(t, result, 1) // Only p2 matches role+ws+conn+active
		assert.Equal(t, "p2", result[0].ID)
	})

	t.Run("Fetch policies mixed", func(t *testing.T) {
		ctx := context.Background()
		result, err := service.GetPoliciesForUser(ctx, workspaceID, connID, userID, &role)
		assert.NoError(t, err)
		t.Logf("Found %d policies", len(result))
		for i, p := range result {
			t.Logf("Policy %d: ID=%s, TargetTable=%s", i, p.ID, p.TargetTable)
		}
		assert.Len(t, result, 2) // p1 (user) and p2 (role) match
	})
}
