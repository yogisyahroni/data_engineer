package handlers

import (
	"insight-engine-backend/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// PermissionHandler handles permission and role management requests
type PermissionHandler struct {
	db                *gorm.DB
	permissionService *services.PermissionService
}

// NewPermissionHandler creates a new permission handler
func NewPermissionHandler(db *gorm.DB) *PermissionHandler {
	return &PermissionHandler{
		db:                db,
		permissionService: services.NewPermissionService(db),
	}
}

// ============================
// PERMISSION ENDPOINTS
// ============================

// GetAllPermissions handles GET /api/permissions
func (h *PermissionHandler) GetAllPermissions(c *fiber.Ctx) error {
	permissions, err := h.permissionService.GetAllPermissions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch permissions",
		})
	}

	return c.JSON(fiber.Map{
		"permissions": permissions,
		"total":       len(permissions),
	})
}

// GetPermissionsByResource handles GET /api/permissions/resource/:resource
func (h *PermissionHandler) GetPermissionsByResource(c *fiber.Ctx) error {
	resource := c.Params("resource")

	permissions, err := h.permissionService.GetPermissionsByResource(resource)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch permissions",
		})
	}

	return c.JSON(fiber.Map{
		"resource":    resource,
		"permissions": permissions,
		"total":       len(permissions),
	})
}

// CheckUserPermission handles POST /api/permissions/check
type CheckPermissionRequest struct {
	UserID         uint   `json:"user_id" validate:"required"`
	PermissionName string `json:"permission_name" validate:"required"`
}

func (h *PermissionHandler) CheckUserPermission(c *fiber.Ctx) error {
	var req CheckPermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	hasPermission, err := h.permissionService.CheckPermission(req.UserID, req.PermissionName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check permission",
		})
	}

	return c.JSON(fiber.Map{
		"user_id":         req.UserID,
		"permission_name": req.PermissionName,
		"has_permission":  hasPermission,
	})
}

// GetUserPermissions handles GET /api/users/:id/permissions
func (h *PermissionHandler) GetUserPermissions(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	permissions, err := h.permissionService.GetUserPermissions(uint(userID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user permissions",
		})
	}

	return c.JSON(fiber.Map{
		"user_id":     userID,
		"permissions": permissions,
		"total":       len(permissions),
	})
}

// ============================
// ROLE ENDPOINTS
// ============================

// GetAllRoles handles GET /api/roles
func (h *PermissionHandler) GetAllRoles(c *fiber.Ctx) error {
	roles, err := h.permissionService.GetAllRoles()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch roles",
		})
	}

	return c.JSON(fiber.Map{
		"roles": roles,
		"total": len(roles),
	})
}

// GetRoleByID handles GET /api/roles/:id
func (h *PermissionHandler) GetRoleByID(c *fiber.Ctx) error {
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	role, err := h.permissionService.GetRoleByID(uint(roleID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(role)
}

// CreateRoleRequest represents the request body for creating a role
type CreateRoleRequest struct {
	Name          string `json:"name" validate:"required,min=3,max=100"`
	Description   string `json:"description"`
	PermissionIDs []uint `json:"permission_ids"`
}

// CreateRole handles POST /api/roles
func (h *PermissionHandler) CreateRole(c *fiber.Ctx) error {
	var req CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validation
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Role name is required",
		})
	}

	role, err := h.permissionService.CreateRole(req.Name, req.Description, req.PermissionIDs)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(role)
}

// UpdateRoleRequest represents the request body for updating a role
type UpdateRoleRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// UpdateRole handles PUT /api/roles/:id
func (h *PermissionHandler) UpdateRole(c *fiber.Ctx) error {
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	var req UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := h.permissionService.UpdateRole(uint(roleID), req.Name, req.Description); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Role updated successfully",
	})
}

// DeleteRole handles DELETE /api/roles/:id
func (h *PermissionHandler) DeleteRole(c *fiber.Ctx) error {
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	if err := h.permissionService.DeleteRole(uint(roleID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Role deleted successfully",
	})
}

// AssignPermissionsRequest represents the request body for assigning permissions to a role
type AssignPermissionsRequest struct {
	PermissionIDs []uint `json:"permission_ids" validate:"required"`
}

// AssignPermissionsToRole handles PUT /api/roles/:id/permissions
func (h *PermissionHandler) AssignPermissionsToRole(c *fiber.Ctx) error {
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	var req AssignPermissionsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(req.PermissionIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Permission IDs are required",
		})
	}

	if err := h.permissionService.AssignPermissionsToRole(uint(roleID), req.PermissionIDs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Permissions assigned successfully",
	})
}

// ============================
// USER-ROLE ENDPOINTS
// ============================

// GetUserRoles handles GET /api/users/:id/roles
func (h *PermissionHandler) GetUserRoles(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	roles, err := h.permissionService.GetUserRoles(uint(userID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user roles",
		})
	}

	return c.JSON(fiber.Map{
		"user_id": userID,
		"roles":   roles,
		"total":   len(roles),
	})
}

// AssignRoleRequest represents the request body for assigning a role to a user
type AssignRoleRequest struct {
	RoleID uint `json:"role_id" validate:"required"`
}

// AssignRoleToUser handles POST /api/users/:id/roles
func (h *PermissionHandler) AssignRoleToUser(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req AssignRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get current user ID from context (who is assigning the role)
	assignedByUserID := c.Locals("userID").(uint)

	if err := h.permissionService.AssignRoleToUser(uint(userID), req.RoleID, assignedByUserID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Role assigned successfully",
	})
}

// RemoveRoleFromUser handles DELETE /api/users/:id/roles/:roleId
func (h *PermissionHandler) RemoveRoleFromUser(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	roleID, err := strconv.ParseUint(c.Params("roleId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid role ID",
		})
	}

	if err := h.permissionService.RemoveRoleFromUser(uint(userID), uint(roleID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Role removed successfully",
	})
}
