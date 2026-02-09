package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RLSHandler handles RLS policy management
type RLSHandler struct {
	rlsService *services.RLSService
}

// NewRLSHandler creates a new RLS handler
func NewRLSHandler(rlsService *services.RLSService) *RLSHandler {
	return &RLSHandler{
		rlsService: rlsService,
	}
}

// CreatePolicyRequest represents the request body for creating a policy
type CreatePolicyRequest struct {
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	ConnectionID string    `json:"connectionId"`
	TableName    string    `json:"tableName"`
	Condition    string    `json:"condition"`
	RoleIDs      *[]string `json:"roleIds"`
	Enabled      bool      `json:"enabled"`
	Priority     int       `json:"priority"`
	Mode         string    `json:"mode"`
}

// TestPolicyRequest represents the request body for testing a policy
type TestPolicyRequest struct {
	UserContext models.UserContext `json:"userContext"`
	SampleQuery string             `json:"sampleQuery"`
}

// TestPolicyResponse represents the response for policy testing
type TestPolicyResponse struct {
	OriginalQuery      string `json:"originalQuery"`
	ModifiedQuery      string `json:"modifiedQuery"`
	EvaluatedCondition string `json:"evaluatedCondition"`
}

// CreatePolicy creates a new RLS policy
func (h *RLSHandler) CreatePolicy(c *fiber.Ctx) error {
	// Get user ID from context (set by auth middleware)
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Parse request body
	var req CreatePolicyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Name == "" || req.ConnectionID == "" || req.TableName == "" || req.Condition == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Missing required fields: name, connectionId, tableName, condition",
		})
	}

	// Set default mode if not specified
	if req.Mode == "" {
		req.Mode = "AND"
	}

	// Create policy model
	policy := &models.RLSPolicy{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Description:  req.Description,
		ConnectionID: req.ConnectionID,
		Table:        req.TableName, // Map TableName from request to Table field
		Condition:    req.Condition,
		RoleIDs:      req.RoleIDs,
		Enabled:      req.Enabled,
		Priority:     req.Priority,
		Mode:         req.Mode,
		UserID:       userID.(string),
	}

	// Create policy
	if err := h.rlsService.CreatePolicy(policy); err != nil {
		services.LogError("rls_policy_create", "Failed to create RLS policy", map[string]interface{}{"policy_name": req.Name, "error": err})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	services.LogInfo("rls_policy_create", "RLS policy created successfully", map[string]interface{}{"policy_name": policy.Name, "policy_id": policy.ID})

	// Return created policy
	return c.Status(fiber.StatusCreated).JSON(policy.ToDTO())
}

// ListPolicies retrieves all policies for the current user
func (h *RLSHandler) ListPolicies(c *fiber.Ctx) error {
	// Get user ID from context
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get policies
	policies, err := h.rlsService.ListPolicies(userID.(string))
	if err != nil {
		services.LogError("rls_policy_list", "Failed to list RLS policies", map[string]interface{}{"error": err})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve policies",
		})
	}

	// Convert to DTOs
	dtos := make([]models.RLSPolicyDTO, len(policies))
	for i, policy := range policies {
		dtos[i] = policy.ToDTO()
	}

	// Return policies
	return c.JSON(dtos)
}

// GetPolicy retrieves a single policy by ID
func (h *RLSHandler) GetPolicy(c *fiber.Ctx) error {
	// Get policy ID from URL
	policyID := c.Params("id")
	if policyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Policy ID is required",
		})
	}

	// Get user ID from context
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get policy
	policy, err := h.rlsService.GetPolicy(policyID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Policy not found",
		})
	}

	// Verify ownership
	if policy.UserID != userID.(string) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You don't own this policy",
		})
	}

	// Return policy
	return c.JSON(policy.ToDTO())
}

// UpdatePolicy updates an existing policy
func (h *RLSHandler) UpdatePolicy(c *fiber.Ctx) error {
	// Get policy ID from URL
	policyID := c.Params("id")
	if policyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Policy ID is required",
		})
	}

	// Get user ID from context
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get existing policy
	existingPolicy, err := h.rlsService.GetPolicy(policyID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Policy not found",
		})
	}

	// Verify ownership
	if existingPolicy.UserID != userID.(string) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You don't own this policy",
		})
	}

	// Parse request body
	var req CreatePolicyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update policy fields
	existingPolicy.Name = req.Name
	existingPolicy.Description = req.Description
	existingPolicy.ConnectionID = req.ConnectionID
	existingPolicy.Table = req.TableName // Map TableName from request to Table field
	existingPolicy.Condition = req.Condition
	existingPolicy.RoleIDs = req.RoleIDs
	existingPolicy.Enabled = req.Enabled
	existingPolicy.Priority = req.Priority
	existingPolicy.Mode = req.Mode

	// Update policy
	if err := h.rlsService.UpdatePolicy(existingPolicy); err != nil {
		services.LogError("rls_policy_update", "Failed to update RLS policy", map[string]interface{}{"policy_id": policyID, "error": err})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	services.LogInfo("rls_policy_update", "RLS policy updated successfully", map[string]interface{}{"policy_name": existingPolicy.Name, "policy_id": existingPolicy.ID})

	// Return updated policy
	return c.JSON(existingPolicy.ToDTO())
}

// DeletePolicy deletes a policy
func (h *RLSHandler) DeletePolicy(c *fiber.Ctx) error {
	// Get policy ID from URL
	policyID := c.Params("id")
	if policyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Policy ID is required",
		})
	}

	// Get user ID from context
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get existing policy
	existingPolicy, err := h.rlsService.GetPolicy(policyID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Policy not found",
		})
	}

	// Verify ownership
	if existingPolicy.UserID != userID.(string) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You don't own this policy",
		})
	}

	// Delete policy
	if err := h.rlsService.DeletePolicy(policyID); err != nil {
		services.LogError("rls_policy_delete", "Failed to delete RLS policy", map[string]interface{}{"policy_id": policyID, "error": err})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete policy",
		})
	}

	services.LogInfo("rls_policy_delete", "RLS policy deleted successfully", map[string]interface{}{"policy_name": existingPolicy.Name, "policy_id": existingPolicy.ID})

	// Return success
	return c.SendStatus(fiber.StatusNoContent)
}

// TestPolicy tests a policy with sample user context and query
func (h *RLSHandler) TestPolicy(c *fiber.Ctx) error {
	// Get policy ID from URL
	policyID := c.Params("id")
	if policyID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Policy ID is required",
		})
	}

	// Get user ID from context
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get existing policy
	existingPolicy, err := h.rlsService.GetPolicy(policyID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Policy not found",
		})
	}

	// Verify ownership
	if existingPolicy.UserID != userID.(string) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Forbidden: You don't own this policy",
		})
	}

	// Parse request body
	var req TestPolicyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Test policy
	modifiedQuery, err := h.rlsService.TestPolicy(policyID, req.UserContext, req.SampleQuery)
	if err != nil {
		services.LogError("rls_policy_test", "Failed to test RLS policy", map[string]interface{}{"policy_id": policyID, "error": err})
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Return test result
	response := TestPolicyResponse{
		OriginalQuery:      req.SampleQuery,
		ModifiedQuery:      modifiedQuery,
		EvaluatedCondition: existingPolicy.Condition,
	}

	return c.JSON(response)
}
