package handlers

import (
	"insight-engine-backend/database"
	"insight-engine-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// ==================== PERMISSION HELPERS ====================

// getUserRole returns the role of a user in a workspace
func getUserRole(workspaceID, userID string) (string, error) {
	var member models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).First(&member).Error; err != nil {
		return "", err
	}
	return member.Role, nil
}

// hasRole checks if user has one of the allowed roles in workspace
func hasRole(workspaceID, userID string, allowedRoles []string) bool {
	role, err := getUserRole(workspaceID, userID)
	if err != nil {
		return false
	}
	for _, allowed := range allowedRoles {
		if role == allowed {
			return true
		}
	}
	return false
}

// isMember checks if user is a member of workspace
func isMember(workspaceID, userID string) bool {
	var count int64
	database.DB.Model(&models.WorkspaceMember{}).Where("workspace_id = ? AND user_id = ?", workspaceID, userID).Count(&count)
	return count > 0
}

// ==================== WORKSPACE HANDLERS ====================

// GetWorkspaces returns all workspaces where user is a member
func GetWorkspaces(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	// Get all workspace IDs where user is a member
	var members []models.WorkspaceMember
	if err := database.DB.Where("user_id = ?", userID).Find(&members).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Extract workspace IDs
	workspaceIDs := make([]string, len(members))
	for i, member := range members {
		workspaceIDs[i] = member.WorkspaceID
	}

	// Get workspaces
	var workspaces []models.Workspace
	if len(workspaceIDs) > 0 {
		if err := database.DB.Where("id IN ?", workspaceIDs).Order("created_at DESC").Find(&workspaces).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
	}

	return c.JSON(workspaces)
}

// CreateWorkspace creates a new workspace (user becomes OWNER)
func CreateWorkspace(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if input.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}

	// Create workspace
	workspace := models.Workspace{
		ID:          uuid.New().String(),
		Name:        input.Name,
		Description: input.Description,
		OwnerID:     userID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := database.DB.Create(&workspace).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Add creator as OWNER member
	now := time.Now()
	member := models.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: workspace.ID,
		UserID:      userID,
		Role:        models.RoleOwner,
		InvitedAt:   now,
		JoinedAt:    &now,
	}

	if err := database.DB.Create(&member).Error; err != nil {
		// Rollback workspace creation
		database.DB.Delete(&workspace)
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(workspace)
}

// GetWorkspace returns a single workspace by ID
func GetWorkspace(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	// Verify membership
	if !isMember(id, userID) {
		return c.Status(404).JSON(fiber.Map{"error": "Workspace not found"})
	}

	var workspace models.Workspace
	if err := database.DB.First(&workspace, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Workspace not found"})
	}

	return c.JSON(workspace)
}

// UpdateWorkspace updates a workspace (OWNER or ADMIN only)
func UpdateWorkspace(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	// Verify permission (OWNER or ADMIN)
	if !hasRole(id, userID, []string{models.RoleOwner, models.RoleAdmin}) {
		return c.Status(403).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	var workspace models.Workspace
	if err := database.DB.First(&workspace, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Workspace not found"})
	}

	var input struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Explicit field mapping
	if input.Name != nil {
		workspace.Name = *input.Name
	}
	if input.Description != nil {
		workspace.Description = input.Description
	}

	workspace.UpdatedAt = time.Now()

	if err := database.DB.Save(&workspace).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(workspace)
}

// DeleteWorkspace deletes a workspace (OWNER only, cascade delete members)
func DeleteWorkspace(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	// Verify permission (OWNER only)
	if !hasRole(id, userID, []string{models.RoleOwner}) {
		return c.Status(403).JSON(fiber.Map{"error": "Only workspace owner can delete workspace"})
	}

	var workspace models.Workspace
	if err := database.DB.First(&workspace, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Workspace not found"})
	}

	// Delete all members (cascade)
	database.DB.Where("workspace_id = ?", id).Delete(&models.WorkspaceMember{})

	// Set workspaceId to NULL for all resources (preserve resources)
	database.DB.Model(&models.Collection{}).Where("workspace_id = ?", id).Update("workspace_id", nil)
	database.DB.Model(&models.App{}).Where("workspace_id = ?", id).Update("workspace_id", nil)

	// Delete workspace
	if err := database.DB.Delete(&workspace).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Workspace deleted successfully"})
}

// ==================== MEMBER HANDLERS ====================

// GetMembers returns all members of a workspace
func GetMembers(c *fiber.Ctx) error {
	workspaceID := c.Query("workspaceId")
	userID := c.Locals("userID").(string)

	if workspaceID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "workspaceId is required"})
	}

	// Verify membership
	if !isMember(workspaceID, userID) {
		return c.Status(404).JSON(fiber.Map{"error": "Workspace not found"})
	}

	var members []models.WorkspaceMember
	if err := database.DB.Where("workspace_id = ?", workspaceID).Order("invited_at ASC").Find(&members).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(members)
}

// InviteMember adds a member to workspace (OWNER or ADMIN only)
func InviteMember(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var input struct {
		WorkspaceID string `json:"workspaceId"`
		UserID      string `json:"userId"`
		Role        string `json:"role"` // 'ADMIN', 'EDITOR', 'VIEWER' (not OWNER)
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Verify permission (OWNER or ADMIN)
	if !hasRole(input.WorkspaceID, userID, []string{models.RoleOwner, models.RoleAdmin}) {
		return c.Status(403).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	// Prevent setting OWNER role (only one owner allowed)
	if input.Role == models.RoleOwner {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot assign OWNER role"})
	}

	// Check if user is already a member
	if isMember(input.WorkspaceID, input.UserID) {
		return c.Status(409).JSON(fiber.Map{"error": "User is already a member"})
	}

	now := time.Now()
	member := models.WorkspaceMember{
		ID:          uuid.New().String(),
		WorkspaceID: input.WorkspaceID,
		UserID:      input.UserID,
		Role:        input.Role,
		InvitedAt:   now,
		JoinedAt:    &now,
	}

	if err := database.DB.Create(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(member)
}

// UpdateMemberRole changes a member's role (OWNER only)
func UpdateMemberRole(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var member models.WorkspaceMember
	if err := database.DB.First(&member, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	// Verify permission (OWNER only)
	if !hasRole(member.WorkspaceID, userID, []string{models.RoleOwner}) {
		return c.Status(403).JSON(fiber.Map{"error": "Only workspace owner can change roles"})
	}

	var input struct {
		Role *string `json:"role"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Prevent changing OWNER role
	if member.Role == models.RoleOwner || (input.Role != nil && *input.Role == models.RoleOwner) {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot change OWNER role"})
	}

	// Explicit field mapping
	if input.Role != nil {
		member.Role = *input.Role
	}

	if err := database.DB.Save(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(member)
}

// RemoveMember removes a member from workspace (OWNER or ADMIN, or self-remove)
func RemoveMember(c *fiber.Ctx) error {
	id := c.Params("id")
	userID := c.Locals("userID").(string)

	var member models.WorkspaceMember
	if err := database.DB.First(&member, "id = ?", id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Member not found"})
	}

	// Prevent removing OWNER
	if member.Role == models.RoleOwner {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot remove workspace owner"})
	}

	// Check permission: OWNER/ADMIN can remove anyone, or user can remove themselves
	isSelfRemove := member.UserID == userID
	hasPermission := hasRole(member.WorkspaceID, userID, []string{models.RoleOwner, models.RoleAdmin})

	if !isSelfRemove && !hasPermission {
		return c.Status(403).JSON(fiber.Map{"error": "Insufficient permissions"})
	}

	if err := database.DB.Delete(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Member removed successfully"})
}
