package services

import (
	"errors"
	"fmt"
	"insight-engine-backend/models"
	"strings"

	"gorm.io/gorm"
)

// PermissionService handles permission-related operations
type PermissionService struct {
	db *gorm.DB
}

// NewPermissionService creates a new permission service
func NewPermissionService(db *gorm.DB) *PermissionService {
	return &PermissionService{db: db}
}

// GetAllPermissions retrieves all permissions
func (s *PermissionService) GetAllPermissions() ([]models.Permission, error) {
	var permissions []models.Permission
	if err := s.db.Order("resource, action").Find(&permissions).Error; err != nil {
		LogError("permission_fetch_all_error", "Failed to fetch all permissions", map[string]interface{}{
			"error": err.Error(),
		})
		return nil, err
	}

	LogInfo("permission_fetch_all", "Fetched all permissions", map[string]interface{}{
		"count": len(permissions),
	})

	return permissions, nil
}

// GetPermissionsByResource retrieves all permissions for a specific resource
func (s *PermissionService) GetPermissionsByResource(resource string) ([]models.Permission, error) {
	var permissions []models.Permission
	if err := s.db.Where("resource = ?", resource).Order("action").Find(&permissions).Error; err != nil {
		LogError("permission_fetch_by_resource_error", "Failed to fetch permissions by resource", map[string]interface{}{
			"resource": resource,
			"error":    err.Error(),
		})
		return nil, err
	}

	return permissions, nil
}

// CheckPermission checks if a user has a specific permission
func (s *PermissionService) CheckPermission(userID uint, permissionName string) (bool, error) {
	// Get user roles
	var userRoles []models.UserRole
	if err := s.db.Where("user_id = ?", userID).Find(&userRoles).Error; err != nil {
		LogError("permission_check_fetch_roles_error", "Failed to fetch user roles", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return false, err
	}

	if len(userRoles) == 0 {
		LogWarn("permission_check_no_roles", "User has no assigned roles", map[string]interface{}{
			"user_id": userID,
		})
		return false, nil
	}

	// Extract role IDs
	roleIDs := make([]uint, len(userRoles))
	for i, ur := range userRoles {
		roleIDs[i] = ur.RoleID
	}

	// Check if any role has the required permission
	var count int64
	err := s.db.Table("role_permissions").
		Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id IN ? AND permissions.name = ?", roleIDs, permissionName).
		Count(&count).Error

	if err != nil {
		LogError("permission_check_query_error", "Failed to check permission", map[string]interface{}{
			"user_id":         userID,
			"permission_name": permissionName,
			"error":           err.Error(),
		})
		return false, err
	}

	hasPermission := count > 0

	LogDebug("permission_check", "Permission check completed", map[string]interface{}{
		"user_id":         userID,
		"permission_name": permissionName,
		"has_permission":  hasPermission,
	})

	return hasPermission, nil
}

// CheckResourcePermission checks if a user has permission for a specific resource and action
func (s *PermissionService) CheckResourcePermission(userID uint, resource, action string) (bool, error) {
	permissionName := fmt.Sprintf("%s:%s", resource, action)
	return s.CheckPermission(userID, permissionName)
}

// GetUserPermissions retrieves all permissions for a user (across all roles)
func (s *PermissionService) GetUserPermissions(userID uint) ([]models.Permission, error) {
	var permissions []models.Permission

	err := s.db.Table("permissions").
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Joins("JOIN user_roles ON user_roles.role_id = role_permissions.role_id").
		Where("user_roles.user_id = ?", userID).
		Distinct().
		Order("permissions.resource, permissions.action").
		Find(&permissions).Error

	if err != nil {
		LogError("user_permissions_fetch_error", "Failed to fetch user permissions", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return nil, err
	}

	LogInfo("user_permissions_fetch", "Fetched user permissions", map[string]interface{}{
		"user_id": userID,
		"count":   len(permissions),
	})

	return permissions, nil
}

// CreateRole creates a new custom role
func (s *PermissionService) CreateRole(name, description string, permissionIDs []uint) (*models.Role, error) {
	// Validation
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("role name cannot be empty")
	}

	// Check for duplicates
	var existing models.Role
	if err := s.db.Where("name = ?", name).First(&existing).Error; err == nil {
		return nil, errors.New("role with this name already exists")
	}

	// Create role
	role := models.Role{
		Name:         name,
		Description:  description,
		IsSystemRole: false, // Custom roles are not system roles
	}

	if err := s.db.Create(&role).Error; err != nil {
		LogError("role_create_error", "Failed to create role", map[string]interface{}{
			"name":  name,
			"error": err.Error(),
		})
		return nil, err
	}

	// Assign permissions if provided
	if len(permissionIDs) > 0 {
		if err := s.AssignPermissionsToRole(role.ID, permissionIDs); err != nil {
			LogError("role_assign_permissions_error", "Failed to assign permissions to new role", map[string]interface{}{
				"role_id": role.ID,
				"error":   err.Error(),
			})
			// Rollback role creation
			s.db.Delete(&role)
			return nil, err
		}
	}

	LogInfo("role_created", "Created new custom role", map[string]interface{}{
		"role_id":          role.ID,
		"name":             name,
		"permission_count": len(permissionIDs),
	})

	return &role, nil
}

// UpdateRole updates an existing role
func (s *PermissionService) UpdateRole(roleID uint, name, description string) error {
	var role models.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("role not found")
		}
		return err
	}

	// Prevent editing system roles
	if role.IsSystemRole {
		return errors.New("cannot edit system roles")
	}

	// Update fields
	if strings.TrimSpace(name) != "" {
		role.Name = name
	}
	role.Description = description

	if err := s.db.Save(&role).Error; err != nil {
		LogError("role_update_error", "Failed to update role", map[string]interface{}{
			"role_id": roleID,
			"error":   err.Error(),
		})
		return err
	}

	LogInfo("role_updated", "Updated role", map[string]interface{}{
		"role_id": roleID,
		"name":    name,
	})

	return nil
}

// DeleteRole deletes a custom role
func (s *PermissionService) DeleteRole(roleID uint) error {
	var role models.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("role not found")
		}
		return err
	}

	// Prevent deleting system roles
	if role.IsSystemRole {
		return errors.New("cannot delete system roles")
	}

	// Delete role (CASCADE will handle role_permissions and user_roles)
	if err := s.db.Delete(&role).Error; err != nil {
		LogError("role_delete_error", "Failed to delete role", map[string]interface{}{
			"role_id": roleID,
			"error":   err.Error(),
		})
		return err
	}

	LogInfo("role_deleted", "Deleted custom role", map[string]interface{}{
		"role_id": roleID,
		"name":    role.Name,
	})

	return nil
}

// GetAllRoles retrieves all roles
func (s *PermissionService) GetAllRoles() ([]models.Role, error) {
	var roles []models.Role
	if err := s.db.Preload("Permissions").Order("is_system_role DESC, name").Find(&roles).Error; err != nil {
		LogError("roles_fetch_all_error", "Failed to fetch all roles", map[string]interface{}{
			"error": err.Error(),
		})
		return nil, err
	}

	return roles, nil
}

// GetRoleByID retrieves a role by ID with permissions
func (s *PermissionService) GetRoleByID(roleID uint) (*models.Role, error) {
	var role models.Role
	if err := s.db.Preload("Permissions").First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role not found")
		}
		LogError("role_fetch_error", "Failed to fetch role", map[string]interface{}{
			"role_id": roleID,
			"error":   err.Error(),
		})
		return nil, err
	}

	return &role, nil
}

// AssignPermissionsToRole assigns permissions to a role (replaces existing)
func (s *PermissionService) AssignPermissionsToRole(roleID uint, permissionIDs []uint) error {
	// Verify role exists and is not a system role
	var role models.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("role not found")
		}
		return err
	}

	if role.IsSystemRole {
		return errors.New("cannot modify permissions of system roles")
	}

	// Delete existing permissions
	if err := s.db.Where("role_id = ?", roleID).Delete(&models.RolePermission{}).Error; err != nil {
		LogError("role_permissions_delete_error", "Failed to delete existing role permissions", map[string]interface{}{
			"role_id": roleID,
			"error":   err.Error(),
		})
		return err
	}

	// Assign new permissions
	for _, permID := range permissionIDs {
		rolePermission := models.RolePermission{
			RoleID:       roleID,
			PermissionID: permID,
		}
		if err := s.db.Create(&rolePermission).Error; err != nil {
			LogError("role_permission_assign_error", "Failed to assign permission to role", map[string]interface{}{
				"role_id":       roleID,
				"permission_id": permID,
				"error":         err.Error(),
			})
			return err
		}
	}

	LogInfo("role_permissions_assigned", "Assigned permissions to role", map[string]interface{}{
		"role_id":          roleID,
		"permission_count": len(permissionIDs),
	})

	return nil
}

// AssignRoleToUser assigns a role to a user
func (s *PermissionService) AssignRoleToUser(userID, roleID, assignedByUserID uint) error {
	// Check if role exists
	var role models.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("role not found")
		}
		return err
	}

	// Check if user exists
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user not found")
		}
		return err
	}

	// Check if already assigned
	var existing models.UserRole
	err := s.db.Where("user_id = ? AND role_id = ?", userID, roleID).First(&existing).Error
	if err == nil {
		return errors.New("role already assigned to user")
	}

	// Assign role
	userRole := models.UserRole{
		UserID:     userID,
		RoleID:     roleID,
		AssignedBy: &assignedByUserID,
	}

	if err := s.db.Create(&userRole).Error; err != nil {
		LogError("user_role_assign_error", "Failed to assign role to user", map[string]interface{}{
			"user_id": userID,
			"role_id": roleID,
			"error":   err.Error(),
		})
		return err
	}

	LogInfo("user_role_assigned", "Assigned role to user", map[string]interface{}{
		"user_id":     userID,
		"role_id":     roleID,
		"role_name":   role.Name,
		"assigned_by": assignedByUserID,
	})

	return nil
}

// RemoveRoleFromUser removes a role from a user
func (s *PermissionService) RemoveRoleFromUser(userID, roleID uint) error {
	result := s.db.Where("user_id = ? AND role_id = ?", userID, roleID).Delete(&models.UserRole{})
	if result.Error != nil {
		LogError("user_role_remove_error", "Failed to remove role from user", map[string]interface{}{
			"user_id": userID,
			"role_id": roleID,
			"error":   result.Error.Error(),
		})
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("user does not have this role")
	}

	LogInfo("user_role_removed", "Removed role from user", map[string]interface{}{
		"user_id": userID,
		"role_id": roleID,
	})

	return nil
}

// GetUserRoles retrieves all roles assigned to a user
func (s *PermissionService) GetUserRoles(userID uint) ([]models.Role, error) {
	var roles []models.Role

	err := s.db.Table("roles").
		Joins("JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Preload("Permissions").
		Order("roles.name").
		Find(&roles).Error

	if err != nil {
		LogError("user_roles_fetch_error", "Failed to fetch user roles", map[string]interface{}{
			"user_id": userID,
			"error":   err.Error(),
		})
		return nil, err
	}

	return roles, nil
}
