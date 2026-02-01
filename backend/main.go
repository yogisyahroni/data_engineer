package main

import (
	"insight-engine-backend/database"
	"insight-engine-backend/handlers"
	"insight-engine-backend/middleware"
	"insight-engine-backend/middleware/ratelimit"
	"insight-engine-backend/services"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	"golang.org/x/time/rate"
)

func main() {
	// 1. Load Environment Variables
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ .env file not found, using system env")
	}

	// 2. Connect to Database
	database.Connect()

	// 2.5. Initialize Encryption Service (Required for AI providers)
	encryptionService, err := services.NewEncryptionService()
	if err != nil {
		log.Fatalf("❌ Failed to initialize encryption service: %v\nPlease set ENCRYPTION_KEY environment variable (32 bytes).\nGenerate with: openssl rand -base64 32", err)
	}
	log.Println("✅ Encryption service initialized")

	// 2.6. Initialize AI Handlers
	handlers.InitAIHandlers(encryptionService)
	log.Println("✅ AI handlers initialized")

	// 2.7. Initialize Semantic Handlers
	aiService := services.NewAIService(encryptionService)
	handlers.InitSemanticHandlers(aiService)
	log.Println("✅ Semantic handlers initialized")

	// 2.8. Initialize Semantic Layer Service and Handler
	semanticLayerService := services.NewSemanticLayerService(database.DB)
	semanticLayerHandler := handlers.NewSemanticLayerHandler(semanticLayerService)
	log.Println("✅ Semantic layer handler initialized")

	// 2.9. Initialize Modeling Service and Handler
	modelingService := services.NewModelingService(database.DB)
	modelingHandler := handlers.NewModelingHandler(modelingService)
	log.Println("✅ Modeling handler initialized")

	// 2.9. Initialize Rate Limiter and Usage Tracker (Database-driven)
	rateLimiterService := services.NewRateLimiter(database.DB)
	usageTrackerService := services.NewUsageTracker(database.DB)
	log.Println("✅ Rate limiter and usage tracker initialized")

	// 2.10. Initialize Cron Service for scheduled tasks
	cronService := services.NewCronService(database.DB)
	cronService.Start()
	log.Println("✅ Cron jobs started (budget reset, view refresh)")

	// 3. Initialize Job Queue (5 workers)
	services.InitJobQueue(5)
	log.Println("✅ Job queue initialized with 5 workers")

	// Setup graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		log.Println("🛑 Shutting down gracefully...")
		cronService.Stop()
		services.ShutdownJobQueue()
		os.Exit(0)
	}()

	// 4. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "InsightEngine Backend (Go)",
	})

	// 4. Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000", // Allow Next.js Frontend
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true, // Allow cookies
	}))

	// 5. Routes
	api := app.Group("/api")

	// Health Check (Public)
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "OK",
			"service": "Go Backend",
			"uptime":  "running",
		})
	})

	// Alert Routes
	api.Get("/alerts", handlers.GetAlerts)                               // Public for now
	api.Post("/alerts", middleware.AuthMiddleware, handlers.CreateAlert) // Protected

	// Query Routes (Protected)
	api.Get("/queries", middleware.AuthMiddleware, handlers.GetQueries)
	api.Post("/queries", middleware.AuthMiddleware, handlers.CreateQuery)
	api.Get("/queries/:id", middleware.AuthMiddleware, handlers.GetQuery)
	api.Put("/queries/:id", middleware.AuthMiddleware, handlers.UpdateQuery)
	api.Delete("/queries/:id", middleware.AuthMiddleware, handlers.DeleteQuery)
	api.Post("/queries/:id/run", middleware.AuthMiddleware, handlers.RunQuery)
	api.Post("/queries/execute", middleware.AuthMiddleware, handlers.ExecuteAdHocQuery)

	// Connection Routes (Protected)
	api.Get("/connections", middleware.AuthMiddleware, handlers.GetConnections)
	api.Post("/connections", middleware.AuthMiddleware, handlers.CreateConnection)
	api.Get("/connections/:id", middleware.AuthMiddleware, handlers.GetConnection)
	api.Put("/connections/:id", middleware.AuthMiddleware, handlers.UpdateConnection)
	api.Delete("/connections/:id", middleware.AuthMiddleware, handlers.DeleteConnection)
	api.Post("/connections/:id/test", middleware.AuthMiddleware, handlers.TestConnection)
	api.Get("/connections/:id/schema", middleware.AuthMiddleware, handlers.GetConnectionSchema)

	// Engine Routes (Protected) - Advanced Analytics
	api.Post("/engine/aggregate", middleware.AuthMiddleware, handlers.Aggregate)
	api.Post("/engine/forecast", middleware.AuthMiddleware, handlers.Forecast)
	api.Post("/engine/anomaly", middleware.AuthMiddleware, handlers.DetectAnomalies)
	api.Post("/engine/clustering", middleware.AuthMiddleware, handlers.PerformClustering)

	// Dashboard Routes (Protected)
	api.Get("/dashboards", middleware.AuthMiddleware, handlers.GetDashboards)
	api.Post("/dashboards", middleware.AuthMiddleware, handlers.CreateDashboard)
	api.Get("/dashboards/:id", middleware.AuthMiddleware, handlers.GetDashboard)
	api.Put("/dashboards/:id", middleware.AuthMiddleware, handlers.UpdateDashboard)
	api.Delete("/dashboards/:id", middleware.AuthMiddleware, handlers.DeleteDashboard)

	// Dashboard Card Routes (Protected)
	api.Get("/dashboards/:id/cards", middleware.AuthMiddleware, handlers.GetDashboardCards)
	api.Post("/dashboards/:id/cards", middleware.AuthMiddleware, handlers.AddCard)
	api.Put("/dashboards/:id/cards", middleware.AuthMiddleware, handlers.UpdateCardPositions)
	api.Delete("/dashboards/:id/cards", middleware.AuthMiddleware, handlers.RemoveCard)

	// Dashboard Schedule Routes (Protected)
	api.Post("/dashboards/:id/schedule", middleware.AuthMiddleware, handlers.CreateSchedule)

	// Pipeline Routes (Protected) - Batch 2
	api.Get("/pipelines", middleware.AuthMiddleware, handlers.GetPipelines)
	api.Post("/pipelines", middleware.AuthMiddleware, handlers.CreatePipeline)
	api.Get("/pipelines/stats", middleware.AuthMiddleware, handlers.GetPipelineStats)
	api.Get("/pipelines/:id", middleware.AuthMiddleware, handlers.GetPipeline)
	api.Put("/pipelines/:id", middleware.AuthMiddleware, handlers.UpdatePipeline)
	api.Delete("/pipelines/:id", middleware.AuthMiddleware, handlers.DeletePipeline)
	api.Post("/pipelines/:id/run", middleware.AuthMiddleware, handlers.RunPipeline)

	// Dataflow Routes (Protected) - Batch 2
	api.Get("/dataflows", middleware.AuthMiddleware, handlers.GetDataflows)
	api.Post("/dataflows", middleware.AuthMiddleware, handlers.CreateDataflow)
	api.Put("/dataflows/:id", middleware.AuthMiddleware, handlers.UpdateDataflow)
	api.Delete("/dataflows/:id", middleware.AuthMiddleware, handlers.DeleteDataflow)
	api.Post("/dataflows/:id/run", middleware.AuthMiddleware, handlers.RunDataflow)

	// Ingestion Routes (Protected) - Batch 2
	api.Post("/ingest", middleware.AuthMiddleware, handlers.IngestData)
	api.Post("/ingest/preview", middleware.AuthMiddleware, handlers.PreviewIngest)

	// Collection Routes (Protected) - Batch 3
	api.Get("/collections", middleware.AuthMiddleware, handlers.GetCollections)
	api.Post("/collections", middleware.AuthMiddleware, handlers.CreateCollection)
	api.Get("/collections/:id", middleware.AuthMiddleware, handlers.GetCollection)
	api.Put("/collections/:id", middleware.AuthMiddleware, handlers.UpdateCollection)
	api.Delete("/collections/:id", middleware.AuthMiddleware, handlers.DeleteCollection)
	api.Post("/collections/:id/items", middleware.AuthMiddleware, handlers.AddCollectionItem)
	api.Delete("/collections/:id/items/:itemId", middleware.AuthMiddleware, handlers.RemoveCollectionItem)

	// Comment Routes (Protected) - Batch 3
	api.Get("/comments", middleware.AuthMiddleware, handlers.GetComments)
	api.Post("/comments", middleware.AuthMiddleware, handlers.CreateComment)
	api.Put("/comments/:id", middleware.AuthMiddleware, handlers.UpdateComment)
	api.Delete("/comments/:id", middleware.AuthMiddleware, handlers.DeleteComment)

	// App Routes (Protected) - Batch 3
	api.Get("/apps", middleware.AuthMiddleware, handlers.GetApps)
	api.Post("/apps", middleware.AuthMiddleware, handlers.CreateApp)
	api.Get("/apps/:id", middleware.AuthMiddleware, handlers.GetApp)
	api.Put("/apps/:id", middleware.AuthMiddleware, handlers.UpdateApp)
	api.Delete("/apps/:id", middleware.AuthMiddleware, handlers.DeleteApp)

	// Canvas Routes (Protected) - Batch 3
	api.Get("/canvases", middleware.AuthMiddleware, handlers.GetCanvases)
	api.Post("/canvases", middleware.AuthMiddleware, handlers.CreateCanvas)
	api.Get("/canvases/:id", middleware.AuthMiddleware, handlers.GetCanvas)
	api.Put("/canvases/:id", middleware.AuthMiddleware, handlers.UpdateCanvas)
	api.Delete("/canvases/:id", middleware.AuthMiddleware, handlers.DeleteCanvas)

	// Widget Routes (Protected) - Batch 3
	api.Get("/widgets", middleware.AuthMiddleware, handlers.GetWidgets)
	api.Post("/widgets", middleware.AuthMiddleware, handlers.CreateWidget)
	api.Put("/widgets/:id", middleware.AuthMiddleware, handlers.UpdateWidget)
	api.Delete("/widgets/:id", middleware.AuthMiddleware, handlers.DeleteWidget)

	// Workspace Routes (Protected) - Batch 3
	api.Get("/workspaces", middleware.AuthMiddleware, handlers.GetWorkspaces)
	api.Post("/workspaces", middleware.AuthMiddleware, handlers.CreateWorkspace)
	api.Get("/workspaces/:id", middleware.AuthMiddleware, handlers.GetWorkspace)
	api.Put("/workspaces/:id", middleware.AuthMiddleware, handlers.UpdateWorkspace)
	api.Delete("/workspaces/:id", middleware.AuthMiddleware, handlers.DeleteWorkspace)

	// Workspace Member Routes (Protected) - Batch 3
	api.Get("/workspace-members", middleware.AuthMiddleware, handlers.GetMembers)
	api.Post("/workspace-members", middleware.AuthMiddleware, handlers.InviteMember)
	api.Put("/workspace-members/:id", middleware.AuthMiddleware, handlers.UpdateMemberRole)
	api.Delete("/workspace-members/:id", middleware.AuthMiddleware, handlers.RemoveMember)

	// AI Provider Routes (Protected) - Batch 4
	api.Get("/ai-providers", middleware.AuthMiddleware, handlers.GetAIProviders)
	api.Post("/ai-providers", middleware.AuthMiddleware, handlers.CreateAIProvider)
	api.Get("/ai-providers/:id", middleware.AuthMiddleware, handlers.GetAIProvider)
	api.Put("/ai-providers/:id", middleware.AuthMiddleware, handlers.UpdateAIProvider)
	api.Delete("/ai-providers/:id", middleware.AuthMiddleware, handlers.DeleteAIProvider)
	api.Post("/ai-providers/:id/test", middleware.AuthMiddleware, handlers.TestAIProvider)

	// AI Generation Routes (Protected) - Batch 4
	api.Post("/ai/generate", middleware.AuthMiddleware, handlers.GenerateAI)
	api.Get("/ai/requests", middleware.AuthMiddleware, handlers.GetAIRequests)
	api.Get("/ai/requests/:id", middleware.AuthMiddleware, handlers.GetAIRequest)
	api.Get("/ai/stats", middleware.AuthMiddleware, handlers.GetAIStats)

	// Rate Limit Configuration Routes (Protected) - Phase 5
	rateLimitHandler := handlers.NewRateLimitHandler(rateLimiterService)
	api.Get("/rate-limits", middleware.AuthMiddleware, rateLimitHandler.GetConfigs)
	api.Get("/rate-limits/:id", middleware.AuthMiddleware, rateLimitHandler.GetConfig)
	api.Post("/rate-limits", middleware.AuthMiddleware, rateLimitHandler.CreateConfig)
	api.Put("/rate-limits/:id", middleware.AuthMiddleware, rateLimitHandler.UpdateConfig)
	api.Delete("/rate-limits/:id", middleware.AuthMiddleware, rateLimitHandler.DeleteConfig)
	api.Get("/rate-limits/violations", middleware.AuthMiddleware, rateLimitHandler.GetViolations)

	// AI Usage & Analytics Routes (Protected) - Phase 5
	aiUsageHandler := handlers.NewAIUsageHandler(usageTrackerService)
	api.Get("/ai/usage", middleware.AuthMiddleware, aiUsageHandler.GetUsageStats)
	api.Get("/ai/request-history", middleware.AuthMiddleware, aiUsageHandler.GetRequestHistory)
	api.Get("/ai/budgets", middleware.AuthMiddleware, aiUsageHandler.GetBudgets)
	api.Post("/ai/budgets", middleware.AuthMiddleware, aiUsageHandler.CreateBudget)
	api.Put("/ai/budgets/:id", middleware.AuthMiddleware, aiUsageHandler.UpdateBudget)
	api.Delete("/ai/budgets/:id", middleware.AuthMiddleware, aiUsageHandler.DeleteBudget)
	api.Get("/ai/alerts", middleware.AuthMiddleware, aiUsageHandler.GetAlerts)
	api.Post("/ai/alerts/:id/acknowledge", middleware.AuthMiddleware, aiUsageHandler.AcknowledgeAlert)

	// 2.8. Initialize Rate Limiter
	limiter := ratelimit.NewMemoryRateLimiter()
	rateLimitMiddleware := middleware.RateLimitMiddleware(middleware.RateLimitConfig{
		Limiter:   limiter,
		UserLimit: rate.Limit(1.0), // 60 RPM
		UserBurst: 5,
	})
	log.Println("✅ Rate limiter initialized")

	// ---------------------------------------------------------
	// 3. API Routes Setup
	// ---------------------------------------------------------

	api = app.Group("/api/v1")

	// ... existing routes ...

	// Semantic Layer Routes (Protected & Rate Limited) - Batch 4
	api.Post("/semantic/explain", middleware.AuthMiddleware, rateLimitMiddleware, handlers.SemanticExplainData)
	api.Post("/semantic/generate-query", middleware.AuthMiddleware, rateLimitMiddleware, handlers.SemanticGenerateQuery)
	api.Post("/semantic/generate-formula", middleware.AuthMiddleware, rateLimitMiddleware, handlers.SemanticGenerateFormula)
	api.Post("/semantic/chat", middleware.AuthMiddleware, rateLimitMiddleware, handlers.SemanticChat)
	// Add new Stream endpoint
	api.Post("/semantic/chat/stream", middleware.AuthMiddleware, rateLimitMiddleware, handlers.SemanticChatStream)
	// Cost estimation endpoint (no rate limit - it's just calculation)
	api.Post("/semantic/estimate-cost", middleware.AuthMiddleware, handlers.SemanticEstimateCost)
	// Query optimization endpoint (no rate limit - it's just analysis)
	api.Post("/semantic/analyze-query", middleware.AuthMiddleware, handlers.SemanticAnalyzeQuery)
	// Formula autocomplete endpoint (no rate limit - it's just suggestion)
	api.Post("/semantic/formula-autocomplete", middleware.AuthMiddleware, handlers.SemanticFormulaAutocomplete)

	api.Get("/semantic/requests", middleware.AuthMiddleware, handlers.SemanticGetRequests)
	api.Get("/semantic/requests/:id", middleware.AuthMiddleware, handlers.SemanticGetRequest)

	// Semantic Layer Routes (Protected) - Business-friendly data layer
	api.Get("/semantic/models", middleware.AuthMiddleware, semanticLayerHandler.ListSemanticModels)
	api.Post("/semantic/models", middleware.AuthMiddleware, semanticLayerHandler.CreateSemanticModel)
	api.Get("/semantic/metrics", middleware.AuthMiddleware, semanticLayerHandler.ListSemanticMetrics)
	api.Post("/semantic/query", middleware.AuthMiddleware, semanticLayerHandler.ExecuteSemanticQuery)

	// Modeling API Routes (Protected) - Metric definitions for governance
	api.Get("/modeling/definitions", middleware.AuthMiddleware, modelingHandler.ListModelDefinitions)
	api.Post("/modeling/definitions", middleware.AuthMiddleware, modelingHandler.CreateModelDefinition)
	api.Get("/modeling/definitions/:id", middleware.AuthMiddleware, modelingHandler.GetModelDefinition)
	api.Put("/modeling/definitions/:id", middleware.AuthMiddleware, modelingHandler.UpdateModelDefinition)
	api.Delete("/modeling/definitions/:id", middleware.AuthMiddleware, modelingHandler.DeleteModelDefinition)
	api.Get("/modeling/metrics", middleware.AuthMiddleware, modelingHandler.ListMetricDefinitions)
	api.Post("/modeling/metrics", middleware.AuthMiddleware, modelingHandler.CreateMetricDefinition)
	api.Get("/modeling/metrics/:id", middleware.AuthMiddleware, modelingHandler.GetMetricDefinition)
	api.Put("/modeling/metrics/:id", middleware.AuthMiddleware, modelingHandler.UpdateMetricDefinition)
	api.Delete("/modeling/metrics/:id", middleware.AuthMiddleware, modelingHandler.DeleteMetricDefinition)

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on port %s", port)
	log.Fatal(app.Listen(":" + port))
}
