package middleware

import (
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// PermissionMiddleware creates a middleware that checks if the user has a specific permission
func PermissionMiddleware(db *gorm.DB, requiredPermission string) fiber.Handler {
	permissionService := services.NewPermissionService(db)

	return func(c *fiber.Ctx) error {
		// Get user ID from context (set by auth middleware)
		userIDValue := c.Locals("userID")
		if userIDValue == nil {
			services.LogWarn("permission_middleware_no_user", "No user ID found in context", map[string]interface{}{
				"path":       c.Path(),
				"permission": requiredPermission,
			})
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized: No user session found",
			})
		}

		userID, ok := userIDValue.(uint)
		if !ok {
			services.LogError("permission_middleware_invalid_user_id", "Invalid user ID type in context", map[string]interface{}{
				"path":       c.Path(),
				"permission": requiredPermission,
				"user_id":    userIDValue,
			})
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Internal server error: Invalid user session",
			})
		}

		// Check if user has the required permission
		hasPermission, err := permissionService.CheckPermission(userID, requiredPermission)
		if err != nil {
			services.LogError("permission_middleware_check_error", "Failed to check permission", map[string]interface{}{
				"user_id":    userID,
				"permission": requiredPermission,
				"path":       c.Path(),
				"error":      err.Error(),
			})
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to verify permissions",
			})
		}

		if !hasPermission {
			services.LogWarn("permission_middleware_denied", "User lacks required permission", map[string]interface{}{
				"user_id":    userID,
				"permission": requiredPermission,
				"path":       c.Path(),
				"method":     c.Method(),
			})
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":      "Forbidden: You do not have permission to perform this action",
				"permission": requiredPermission,
			})
		}

		services.LogDebug("permission_middleware_granted", "Permission check passed", map[string]interface{}{
			"user_id":    userID,
			"permission": requiredPermission,
			"path":       c.Path(),
		})

		return c.Next()
	}
}

// RequirePermission is a helper function to create permission middleware
// Usage: router.Get("/api/queries", middleware.RequirePermission(db, "query:read"), handler.GetQueries)
func RequirePermission(db *gorm.DB, permission string) fiber.Handler {
	return PermissionMiddleware(db, permission)
}

// RequireAnyPermission creates a middleware that checks if the user has ANY of the specified permissions
func RequireAnyPermission(db *gorm.DB, permissions ...string) fiber.Handler {
	permissionService := services.NewPermissionService(db)

	return func(c *fiber.Ctx) error {
		userIDValue := c.Locals("userID")
		if userIDValue == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized: No user session found",
			})
		}

		userID := userIDValue.(uint)

		// Check each permission
		for _, permission := range permissions {
			hasPermission, err := permissionService.CheckPermission(userID, permission)
			if err != nil {
				services.LogError("permission_middleware_any_check_error", "Failed to check permission", map[string]interface{}{
					"user_id":    userID,
					"permission": permission,
					"error":      err.Error(),
				})
				continue
			}

			if hasPermission {
				services.LogDebug("permission_middleware_any_granted", "User has one of the required permissions", map[string]interface{}{
					"user_id":    userID,
					"permission": permission,
					"path":       c.Path(),
				})
				return c.Next()
			}
		}

		services.LogWarn("permission_middleware_any_denied", "User lacks all required permissions", map[string]interface{}{
			"user_id":     userID,
			"permissions": permissions,
			"path":        c.Path(),
		})

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":       "Forbidden: You do not have any of the required permissions",
			"permissions": permissions,
		})
	}
}

// RequireAllPermissions creates a middleware that checks if the user has ALL of the specified permissions
func RequireAllPermissions(db *gorm.DB, permissions ...string) fiber.Handler {
	permissionService := services.NewPermissionService(db)

	return func(c *fiber.Ctx) error {
		userIDValue := c.Locals("userID")
		if userIDValue == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized: No user session found",
			})
		}

		userID := userIDValue.(uint)

		// Check all permissions
		for _, permission := range permissions {
			hasPermission, err := permissionService.CheckPermission(userID, permission)
			if err != nil {
				services.LogError("permission_middleware_all_check_error", "Failed to check permission", map[string]interface{}{
					"user_id":    userID,
					"permission": permission,
					"error":      err.Error(),
				})
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to verify permissions",
				})
			}

			if !hasPermission {
				services.LogWarn("permission_middleware_all_denied", "User lacks one of the required permissions", map[string]interface{}{
					"user_id":     userID,
					"permission":  permission,
					"permissions": permissions,
					"path":        c.Path(),
				})

				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"error":       "Forbidden: You do not have all required permissions",
					"missing":     permission,
					"permissions": permissions,
				})
			}
		}

		services.LogDebug("permission_middleware_all_granted", "User has all required permissions", map[string]interface{}{
			"user_id":     userID,
			"permissions": permissions,
			"path":        c.Path(),
		})

		return c.Next()
	}
}
