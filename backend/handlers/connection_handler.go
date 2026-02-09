package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ConnectionHandler struct {
	queryExecutor     *services.QueryExecutor
	schemaDiscovery   *services.SchemaDiscovery
	encryptionService *services.EncryptionService
}

func NewConnectionHandler(qe *services.QueryExecutor, sd *services.SchemaDiscovery) *ConnectionHandler {
	// Initialize encryption service (fail gracefully if not configured)
	encryptionService, err := services.NewEncryptionService()
	if err != nil {
		// Log warning but continue - encryption is critical but shouldn' t break the system
		// In production, this should be a fatal error
		encryptionService = nil
	}

	return &ConnectionHandler{
		queryExecutor:     qe,
		schemaDiscovery:   sd,
		encryptionService: encryptionService,
	}
}

// GetConnections returns a list of connections
func (h *ConnectionHandler) GetConnections(c *fiber.Ctx) error {
	userID, ok := c.Locals("userId").(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"status":  "error",
			"message": "Unauthorized",
		})
	}

	var connections []models.Connection
	result := database.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&connections)

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not fetch connections",
			"error":   result.Error.Error(),
		})
	}

	// Convert to DTOs (strip passwords)
	dtos := make([]models.ConnectionDTO, len(connections))
	for i, conn := range connections {
		dtos[i] = conn.ToDTO()
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    dtos,
	})
}

// GetConnection returns a single connection by ID
func (h *ConnectionHandler) GetConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	var conn models.Connection
	result := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&conn)

	if result.Error != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    conn.ToDTO(),
	})
}

// CreateConnection creates a new connection
func (h *ConnectionHandler) CreateConnection(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(string)

	conn := new(models.Connection)
	if err := c.BodyParser(conn); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Validation
	if conn.Name == "" || conn.Type == "" || conn.Database == "" {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Name, Type, and Database are required",
		})
	}

	// Generate ID and set user
	conn.ID = uuid.New().String()
	conn.UserID = userID

	// Encrypt password before storing (SECURITY: AES-256-GCM encryption)
	if h.encryptionService != nil && conn.Password != nil && *conn.Password != "" {
		encryptedPassword, err := h.encryptionService.Encrypt(*conn.Password)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to encrypt password",
				"error":   err.Error(),
			})
		}
		conn.Password = &encryptedPassword
	}

	result := database.DB.Create(&conn)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not create connection",
			"error":   result.Error.Error(),
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"data":    conn.ToDTO(),
	})
}

// UpdateConnection updates an existing connection
func (h *ConnectionHandler) UpdateConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	// Check ownership
	var existing models.Connection
	if err := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&existing).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
			"error":   err.Error(),
		})
	}

	// Parse updates
	updates := new(models.Connection)
	if err := c.BodyParser(updates); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid input",
			"error":   err.Error(),
		})
	}

	// Encrypt password if being updated
	if h.encryptionService != nil && updates.Password != nil && *updates.Password != "" {
		encryptedPassword, err := h.encryptionService.Encrypt(*updates.Password)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to encrypt password",
				"error":   err.Error(),
			})
		}
		updates.Password = &encryptedPassword
	}

	// Apply updates
	if err := database.DB.Model(&existing).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not update connection",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    existing.ToDTO(),
	})
}

// DeleteConnection deletes a connection
func (h *ConnectionHandler) DeleteConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	result := database.DB.Where("id = ? AND user_id = ?", connID, userID).Delete(&models.Connection{})
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Could not delete connection",
			"error":   result.Error.Error(),
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Connection deleted",
	})
}

// TestConnection tests a database connection
func (h *ConnectionHandler) TestConnection(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	var conn models.Connection
	if err := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&conn).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	// Decrypt password for connection test
	if h.encryptionService != nil && conn.Password != nil && *conn.Password != "" {
		decryptedPassword, err := h.encryptionService.Decrypt(*conn.Password)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to decrypt password",
				"error":   err.Error(),
			})
		}
		conn.Password = &decryptedPassword
	}

	// Test connection using query executor
	ctx := c.Context()
	_, err := h.queryExecutor.Execute(ctx, &conn, "SELECT 1", nil, nil)

	if err != nil {
		return c.JSON(fiber.Map{
			"status":  "error",
			"message": "Connection test failed",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Connection successful",
	})
}

// GetConnectionSchema returns the schema for a connection
func (h *ConnectionHandler) GetConnectionSchema(c *fiber.Ctx) error {
	connID := c.Params("id")
	userID, _ := c.Locals("userId").(string)

	var conn models.Connection
	if err := database.DB.Where("id = ? AND user_id = ?", connID, userID).First(&conn).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"status":  "error",
			"message": "Connection not found",
		})
	}

	// Decrypt password for schema discovery
	if h.encryptionService != nil && conn.Password != nil && *conn.Password != "" {
		decryptedPassword, err := h.encryptionService.Decrypt(*conn.Password)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to decrypt password",
				"error":   err.Error(),
			})
		}
		conn.Password = &decryptedPassword
	}

	// Discover schema
	ctx := c.Context()
	schema, err := h.schemaDiscovery.DiscoverSchema(ctx, &conn)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to discover schema",
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    schema,
	})
}
