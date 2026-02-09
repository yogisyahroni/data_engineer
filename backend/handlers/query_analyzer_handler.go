package handlers

import (
	"insight-engine-backend/models"
	"insight-engine-backend/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// QueryAnalyzerHandler handles query plan analysis requests
type QueryAnalyzerHandler struct {
	db       *gorm.DB
	analyzer *services.QueryAnalyzer
	executor *services.QueryExecutor
}

// NewQueryAnalyzerHandler creates a new query analyzer handler
func NewQueryAnalyzerHandler(db *gorm.DB, executor *services.QueryExecutor) *QueryAnalyzerHandler {
	return &QueryAnalyzerHandler{
		db:       db,
		analyzer: services.NewQueryAnalyzer(executor),
		executor: executor,
	}
}

// AnalyzeQueryRequest represents the request payload for query analysis
type AnalyzeQueryRequest struct {
	ConnectionID string `json:"connectionId"`
	Query        string `json:"query"`
}

// AnalyzeQueryPlan handles POST /api/query/analyze
func (h *QueryAnalyzerHandler) AnalyzeQueryPlan(c *fiber.Ctx) error {
	var req AnalyzeQueryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request",
			"message": err.Error(),
		})
	}

	// Validate required fields
	if req.ConnectionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": "connectionId is required",
		})
	}
	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": "query is required",
		})
	}

	// Get connection from database
	var connection models.Connection
	if err := h.db.Where("id = ?", req.ConnectionID).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Connection not found",
				"message": "The specified connection does not exist",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Database error",
			"message": err.Error(),
		})
	}

	// Perform query plan analysis
	analysis, err := h.analyzer.AnalyzeQuery(c.Context(), &connection, req.Query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Analysis failed",
			"message": err.Error(),
		})
	}

	return c.JSON(analysis)
}

// GetQueryComplexity handles GET /api/query/complexity
func (h *QueryAnalyzerHandler) GetQueryComplexity(c *fiber.Ctx) error {
	query := c.Query("query")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Missing query",
			"message": "Query parameter is required",
		})
	}

	complexity := h.analyzer.GetQueryComplexity(query)

	return c.JSON(fiber.Map{
		"query":      query,
		"complexity": complexity,
	})
}

// GetOptimizationSuggestions handles POST /api/query/optimize
func (h *QueryAnalyzerHandler) GetOptimizationSuggestions(c *fiber.Ctx) error {
	var req AnalyzeQueryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request",
			"message": err.Error(),
		})
	}

	// Validate required fields
	if req.ConnectionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": "connectionId is required",
		})
	}
	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Validation failed",
			"message": "query is required",
		})
	}

	// Get connection
	var connection models.Connection
	if err := h.db.Where("id = ?", req.ConnectionID).First(&connection).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Connection not found",
				"message": "The specified connection does not exist",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Database error",
			"message": err.Error(),
		})
	}

	// Static analysis using QueryOptimizer
	optimizer := services.NewQueryOptimizer()
	staticAnalysis := optimizer.AnalyzeQuery(req.Query)

	// EXPLAIN-based analysis using QueryAnalyzer
	planAnalysis, err := h.analyzer.AnalyzeQuery(c.Context(), &connection, req.Query)
	if err != nil {
		// If EXPLAIN fails, return only static analysis
		return c.JSON(fiber.Map{
			"query":            req.Query,
			"staticAnalysis":   staticAnalysis,
			"planAnalysis":     nil,
			"explainAvailable": false,
			"errorMessage":     err.Error(),
		})
	}

	// Combine both analyses
	return c.JSON(fiber.Map{
		"query":            req.Query,
		"staticAnalysis":   staticAnalysis,
		"planAnalysis":     planAnalysis,
		"explainAvailable": true,
	})
}

// RegisterRoutes registers query analyzer routes
func (h *QueryAnalyzerHandler) RegisterRoutes(router fiber.Router) {
	queryRoutes := router.Group("/query")
	{
		queryRoutes.Post("/analyze", h.AnalyzeQueryPlan)
		queryRoutes.Get("/complexity", h.GetQueryComplexity)
		queryRoutes.Post("/optimize", h.GetOptimizationSuggestions)
	}
}
