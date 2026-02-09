package main

import (
	"insight-engine-backend/database"
	"insight-engine-backend/handlers"
	"insight-engine-backend/middleware"
	"insight-engine-backend/services"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/websocket/v2"
	"github.com/joho/godotenv"
)

func main() {
	// 0. Initialize Structured Logger (MUST BE FIRST)
	services.InitLogger("insight-engine-backend")

	// 1. Load Environment Variables
	if err := godotenv.Load(); err != nil {
		services.LogWarn("env_load", ".env file not found, using system environment variables", nil)
	}

	// 2. Connect to Database
	database.Connect()

	// 2.5. Initialize Encryption Service (Required for AI providers)
	encryptionService, err := services.NewEncryptionService()
	if err != nil {
		services.LogFatal("encryption_init", "Failed to initialize encryption service. Set ENCRYPTION_KEY environment variable (32 bytes). Generate with: openssl rand -base64 32", map[string]interface{}{"error": err})
	}
	services.LogInfo("encryption_init", "Encryption service initialized successfully", nil)

	// 2.6. Initialize AI Handlers
	handlers.InitAIHandlers(encryptionService)
	services.LogInfo("ai_handlers_init", "AI handlers initialized successfully", nil)

	// 2.7. Initialize Semantic Handlers
	aiService := services.NewAIService(encryptionService)
	handlers.InitSemanticHandlers(aiService)
	services.LogInfo("semantic_handlers_init", "Semantic handlers initialized successfully", nil)

	// 2.8. Initialize Semantic Layer Service and Handler
	semanticLayerService := services.NewSemanticLayerService(database.DB)
	semanticLayerHandler := handlers.NewSemanticLayerHandler(semanticLayerService)
	services.LogInfo("semantic_layer_init", "Semantic layer handler initialized successfully", nil)

	// 2.9. Initialize Modeling Service and Handler
	modelingService := services.NewModelingService(database.DB)
	modelingHandler := handlers.NewModelingHandler(modelingService)
	services.LogInfo("modeling_init", "Modeling handler initialized successfully", nil)

	// 2.9. Initialize Rate Limiter and Usage Tracker (Database-driven)
	rateLimiterService := services.NewRateLimiter(database.DB)
	usageTrackerService := services.NewUsageTracker(database.DB)
	services.LogInfo("rate_limiter_init", "Rate limiter and usage tracker initialized successfully", nil)

	// 2.10. Initialize Cron Service for scheduled tasks
	cronService := services.NewCronService(database.DB)
	cronService.Start()
	services.LogInfo("cron_init", "Cron service started (budget reset, view refresh)", nil)

	// 2.11. Initialize WebSocket Hub for real-time updates
	wsHub := services.NewWebSocketHub()
	go wsHub.Run()
	services.LogInfo("websocket_init", "WebSocket hub started for real-time updates", nil)

	// 2.12. Initialize Notification Service
	notificationService := services.NewNotificationService(database.DB, wsHub)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	services.LogInfo("notification_init", "Notification service initialized successfully", nil)

	// 2.13. Initialize Activity Service
	activityService := services.NewActivityService(database.DB, wsHub)
	activityHandler := handlers.NewActivityHandler(activityService)
	services.LogInfo("activity_init", "Activity service initialized successfully", nil)

	// 2.14. Initialize Scheduler Service (UI-configurable)
	schedulerService := services.NewSchedulerService(database.DB)
	schedulerService.Start()
	schedulerHandler := handlers.NewSchedulerHandler(schedulerService)
	services.LogInfo("scheduler_init", "Scheduler service initialized successfully", nil)

	// 2.15. Initialize WebSocket Handler
	wsHandler := handlers.NewWebSocketHandler(wsHub)
	services.LogInfo("ws_handler_init", "WebSocket handler initialized successfully", nil)

	// 2.16. Initialize Audit Service (Comprehensive logging for compliance)
	auditService := services.NewAuditService(database.DB)
	auditHandler := handlers.NewAuditHandler(auditService)
	services.LogInfo("audit_init", "Audit service initialized (async logging with 5 workers)", nil)

	// 3. Initialize Job Queue (5 workers)
	services.InitJobQueue(5)
	services.LogInfo("job_queue_init", "Job queue initialized with 5 workers", nil)

	// Setup graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		services.LogInfo("graceful_shutdown", "Shutting down gracefully", nil)
		cronService.Stop()
		schedulerService.Stop()
		auditService.Stop() // Flush pending audit logs
		services.ShutdownJobQueue()
		os.Exit(0)
	}()

	// 4. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: "InsightEngine Backend (Go)",
	})

	// 4. Middleware
	app.Use(logger.New())

	// Hardened CORS Middleware (whitelist-based, environment-driven)
	corsConfig := middleware.LoadCORSConfigFromEnv()
	app.Use(middleware.HardenedCORS(corsConfig))
	services.LogInfo("cors_init", "Hardened CORS initialized", map[string]interface{}{"allowed_origins": corsConfig.AllowedOrigins})

	// 5. Initialize Rate Limiting BEFORE Routes
	// Comprehensive Rate Limiting Middleware
	// Uses database-driven configuration with multi-layer protection:
	// - IP-based limiting (DDoS protection)
	// - Endpoint-specific limiting (auth brute-force protection)
	// - Per-user limiting (API usage quotas)
	comprehensiveRateLimit := middleware.ComprehensiveRateLimit(middleware.ComprehensiveRateLimitConfig{
		RateLimiterService: rateLimiterService,
		SkipPaths: map[string]bool{
			"/api/health":       true, // Health checks should not be rate limited
			"/api/health/ready": true,
			"/api/health/live":  true,
			"/api/metrics":      true, // Metrics endpoint
		},
	})
	services.LogInfo("rate_limiter_init", "Comprehensive rate limiter initialized", map[string]interface{}{"features": []string{"IP-based", "endpoint-specific", "per-user"}})

	// 6. Routes with Rate Limiting
	api := app.Group("/api", comprehensiveRateLimit)

	// Authentication
	// Initialize EmailService for sending verification emails
	emailService := services.NewEmailService()
	services.LogInfo("email_service_init", "Email service initialized", map[string]interface{}{"provider": emailService.GetProvider()})

	// Initialize AuthService with EmailService for dependency injection
	authService := services.NewAuthService(database.DB, emailService)
	authHandler := handlers.NewAuthHandler(authService)
	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)
	api.Get("/auth/verify-email", authHandler.VerifyEmail)
	api.Post("/auth/resend-verification", authHandler.ResendVerification)
	api.Post("/auth/forgot-password", authHandler.ForgotPassword)
	api.Post("/auth/reset-password", authHandler.ResetPassword)
	api.Get("/auth/validate-reset-token", authHandler.ValidateResetToken)

	// Protected routes (require authentication)
	api.Post("/auth/change-password", middleware.AuthMiddleware, authHandler.ChangePassword)

	// ---------------------------------------------------------
	// Initialize Services & Handlers (Dependency Injection)
	// ---------------------------------------------------------

	// 1. Core Services
	queryExecutor := services.NewQueryExecutor()
	schemaDiscovery := services.NewSchemaDiscovery(queryExecutor)
	queryValidator := services.NewQueryValidator([]string{})

	// 2. Redis Cache
	redisConfig := services.RedisCacheConfig{
		Host:       os.Getenv("REDIS_HOST"),
		Password:   os.Getenv("REDIS_PASSWORD"),
		DB:         0,
		MaxRetries: 3,
		PoolSize:   10,
	}
	if redisConfig.Host == "" {
		redisConfig.Host = "localhost:6379"
	}
	redisCache, err := services.NewRedisCache(redisConfig)
	if err != nil {
		services.LogWarn("redis_init_failed", "Redis cache initialization failed, query caching disabled", map[string]interface{}{"error": err})
		redisCache = nil
	}
	var queryCache *services.QueryCache
	if redisCache != nil {
		queryCache = services.NewQueryCache(redisCache, 5*time.Minute)
		services.LogInfo("query_builder_init", "Visual Query Builder initialized with Redis caching", nil)
	} else {
		queryCache = nil
		services.LogInfo("query_builder_init", "Visual Query Builder initialized", map[string]interface{}{"caching": "disabled"})
	}

	// 3. Dependent Services
	rlsService := services.NewRLSService(database.DB)
	engineService := services.NewEngineService(queryExecutor)
	queryBuilder := services.NewQueryBuilder(queryValidator, schemaDiscovery, queryCache, rlsService)
	geoJSONService := services.NewGeoJSONService(database.DB)

	// 4. Initialize Handlers
	visualQueryHandler := handlers.NewVisualQueryHandler(database.DB, queryBuilder, queryExecutor, schemaDiscovery, queryCache)
	connectionHandler := handlers.NewConnectionHandler(queryExecutor, schemaDiscovery)
	queryHandler := handlers.NewQueryHandler(queryExecutor)
	queryAnalyzerHandler := handlers.NewQueryAnalyzerHandler(database.DB, queryExecutor)
	materializedViewService := services.NewMaterializedViewService(database.DB, queryExecutor)
	materializedViewHandler := handlers.NewMaterializedViewHandler(database.DB, materializedViewService)
	engineHandler := handlers.NewEngineHandler(engineService)
	geoJSONHandler := handlers.NewGeoJSONHandler(geoJSONService)

	services.LogInfo("services_init", "Core services initialized", map[string]interface{}{"services": []string{"RLS", "Engine", "Query", "MaterializedViews", "GeoJSON"}})

	// Health Check Endpoints (Public)
	// Basic health check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "InsightEngine Backend",
			"version": "1.0.0",
		})
	})

	// Readiness check (includes database connectivity)
	api.Get("/health/ready", func(c *fiber.Ctx) error {
		// Check database connection
		sqlDB, err := database.DB.DB()
		if err != nil {
			return c.Status(503).JSON(fiber.Map{
				"status":   "not_ready",
				"database": "error",
				"error":    err.Error(),
			})
		}

		if err := sqlDB.Ping(); err != nil {
			return c.Status(503).JSON(fiber.Map{
				"status":   "not_ready",
				"database": "disconnected",
				"error":    err.Error(),
			})
		}

		return c.JSON(fiber.Map{
			"status":   "ready",
			"database": "connected",
			"service":  "InsightEngine Backend",
		})
	})

	// Liveness check (simple check if server is alive)
	api.Get("/health/live", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "alive",
		})
	})

	// Alert Routes
	api.Get("/alerts", handlers.GetAlerts)                               // Public for now
	api.Post("/alerts", middleware.AuthMiddleware, handlers.CreateAlert) // Protected

	// Query Routes (Protected)
	// Query Routes (Protected)
	api.Get("/queries", middleware.AuthMiddleware, queryHandler.GetQueries)
	api.Post("/queries", middleware.AuthMiddleware, queryHandler.CreateQuery)
	api.Get("/queries/:id", middleware.AuthMiddleware, queryHandler.GetQuery)
	api.Put("/queries/:id", middleware.AuthMiddleware, queryHandler.UpdateQuery)
	api.Delete("/queries/:id", middleware.AuthMiddleware, queryHandler.DeleteQuery)
	api.Post("/queries/:id/run", middleware.AuthMiddleware, queryHandler.RunQuery)
	api.Post("/queries/execute", middleware.AuthMiddleware, queryHandler.ExecuteAdHocQuery)

	// Query Analyzer Routes (Protected) - Phase 2.5 Query Optimization (TASK-075)
	api.Post("/query/analyze", middleware.AuthMiddleware, queryAnalyzerHandler.AnalyzeQueryPlan)
	api.Get("/query/complexity", middleware.AuthMiddleware, queryAnalyzerHandler.GetQueryComplexity)
	api.Post("/query/optimize", middleware.AuthMiddleware, queryAnalyzerHandler.GetOptimizationSuggestions)
	services.LogInfo("routes_registered", "Query analyzer routes registered", map[string]interface{}{"endpoints": []string{"/api/query/analyze", "/api/query/complexity", "/api/query/optimize"}})

	// Materialized View Routes (Protected) - Phase 2.5 Caching Enhancements (TASK-077)
	api.Post("/materialized-views", middleware.AuthMiddleware, materializedViewHandler.CreateMaterializedView)
	api.Get("/materialized-views", middleware.AuthMiddleware, materializedViewHandler.ListMaterializedViews)
	api.Get("/materialized-views/:id", middleware.AuthMiddleware, materializedViewHandler.GetMaterializedView)
	api.Delete("/materialized-views/:id", middleware.AuthMiddleware, materializedViewHandler.DropMaterializedView)
	api.Post("/materialized-views/:id/refresh", middleware.AuthMiddleware, materializedViewHandler.RefreshMaterializedView)
	api.Put("/materialized-views/:id/schedule", middleware.AuthMiddleware, materializedViewHandler.UpdateSchedule)
	api.Get("/materialized-views/:id/status", middleware.AuthMiddleware, materializedViewHandler.GetStatus)
	api.Get("/materialized-views/:id/history", middleware.AuthMiddleware, materializedViewHandler.GetRefreshHistory)
	services.LogInfo("routes_registered", "Materialized view routes registered", map[string]interface{}{"endpoint": "/api/materialized-views"})

	// Connection Routes (Protected)
	// Connection Routes (Protected)
	api.Get("/connections", middleware.AuthMiddleware, connectionHandler.GetConnections)
	api.Post("/connections", middleware.AuthMiddleware, connectionHandler.CreateConnection)
	api.Get("/connections/:id", middleware.AuthMiddleware, connectionHandler.GetConnection)
	api.Put("/connections/:id", middleware.AuthMiddleware, connectionHandler.UpdateConnection)
	api.Delete("/connections/:id", middleware.AuthMiddleware, connectionHandler.DeleteConnection)
	api.Post("/connections/:id/test", middleware.AuthMiddleware, connectionHandler.TestConnection)
	api.Get("/connections/:id/schema", middleware.AuthMiddleware, connectionHandler.GetConnectionSchema)

	// Engine Routes (Protected) - Advanced Analytics
	// Engine Routes (Protected) - Advanced Analytics
	api.Post("/engine/aggregate", middleware.AuthMiddleware, engineHandler.Aggregate)
	api.Post("/engine/forecast", middleware.AuthMiddleware, engineHandler.Forecast)
	api.Post("/engine/anomaly", middleware.AuthMiddleware, engineHandler.DetectAnomalies)
	api.Post("/engine/clustering", middleware.AuthMiddleware, engineHandler.PerformClustering)

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

	// Notification Routes (Protected) - Real-time notifications
	api.Get("/notifications", middleware.AuthMiddleware, notificationHandler.GetNotifications)
	api.Get("/notifications/unread", middleware.AuthMiddleware, notificationHandler.GetUnreadNotifications)
	api.Get("/notifications/unread-count", middleware.AuthMiddleware, notificationHandler.GetUnreadCount)
	api.Put("/notifications/:id/read", middleware.AuthMiddleware, notificationHandler.MarkAsRead)
	api.Put("/notifications/read-all", middleware.AuthMiddleware, notificationHandler.MarkAllAsRead)
	api.Delete("/notifications/:id", middleware.AuthMiddleware, notificationHandler.DeleteNotification)
	api.Delete("/notifications/read", middleware.AuthMiddleware, notificationHandler.DeleteReadNotifications)
	// Admin-only notification routes (requires admin role)
	api.Post("/notifications", middleware.AuthMiddleware, middleware.AdminMiddleware, notificationHandler.CreateNotification)
	api.Post("/notifications/broadcast", middleware.AuthMiddleware, middleware.AdminMiddleware, notificationHandler.BroadcastSystemNotification)

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

	// Audit Log Routes (Admin Only) - TASK-015
	api.Get("/admin/audit-logs", middleware.AuthMiddleware, auditHandler.GetAuditLogs)
	api.Get("/admin/audit-logs/recent", middleware.AuthMiddleware, auditHandler.GetRecentActivity)
	api.Get("/admin/audit-logs/summary", middleware.AuthMiddleware, auditHandler.GetAuditSummary)
	api.Get("/admin/audit-logs/user/:id", middleware.AuthMiddleware, auditHandler.GetUserActivity)
	api.Get("/admin/audit-logs/export", middleware.AuthMiddleware, auditHandler.ExportAuditLogs)

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

	// Semantic Layer Routes (Protected) - Batch 4
	// Rate limiting is applied globally via the api group middleware
	api.Post("/semantic/explain", middleware.AuthMiddleware, handlers.SemanticExplainData)
	api.Post("/semantic/generate-query", middleware.AuthMiddleware, handlers.SemanticGenerateQuery)
	api.Post("/semantic/generate-formula", middleware.AuthMiddleware, handlers.SemanticGenerateFormula)
	api.Post("/semantic/chat", middleware.AuthMiddleware, handlers.SemanticChat)
	// Add new Stream endpoint
	api.Post("/semantic/chat/stream", middleware.AuthMiddleware, handlers.SemanticChatStream)
	// Cost estimation endpoint
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

	// Batch 5: Notifications & Real-time Routes (Protected)

	// WebSocket connection (requires auth)
	app.Get("/api/v1/ws", middleware.AuthMiddleware, websocket.New(wsHandler.HandleConnection))

	// Activity feed routes
	api.Get("/activity", middleware.AuthMiddleware, activityHandler.GetUserActivity)
	api.Get("/activity/workspace/:id", middleware.AuthMiddleware, activityHandler.GetWorkspaceActivity)
	// Admin-only activity route
	api.Get("/activity/recent", middleware.AuthMiddleware, middleware.AdminMiddleware, activityHandler.GetRecentActivity)

	// Scheduler routes
	api.Get("/scheduler/jobs", middleware.AuthMiddleware, schedulerHandler.ListJobs)
	api.Get("/scheduler/jobs/:id", middleware.AuthMiddleware, schedulerHandler.GetJob)
	// Admin-only scheduler routes
	api.Post("/scheduler/jobs", middleware.AuthMiddleware, middleware.AdminMiddleware, schedulerHandler.CreateJob)
	api.Put("/scheduler/jobs/:id", middleware.AuthMiddleware, middleware.AdminMiddleware, schedulerHandler.UpdateJob)
	api.Delete("/scheduler/jobs/:id", middleware.AuthMiddleware, middleware.AdminMiddleware, schedulerHandler.DeleteJob)
	api.Post("/scheduler/jobs/:id/pause", middleware.AuthMiddleware, schedulerHandler.PauseJob)
	api.Post("/scheduler/jobs/:id/resume", middleware.AuthMiddleware, schedulerHandler.ResumeJob)
	api.Post("/scheduler/jobs/:id/trigger", middleware.AuthMiddleware, schedulerHandler.TriggerJob)

	// 2.16. Visual Query Builder Services (Moved to top)

	// Visual Query Builder Routes (Protected) - Phase 1.1
	api.Get("/visual-queries", middleware.AuthMiddleware, visualQueryHandler.GetVisualQueries)
	api.Post("/visual-queries", middleware.AuthMiddleware, visualQueryHandler.CreateVisualQuery)
	api.Get("/visual-queries/:id", middleware.AuthMiddleware, visualQueryHandler.GetVisualQuery)
	api.Put("/visual-queries/:id", middleware.AuthMiddleware, visualQueryHandler.UpdateVisualQuery)
	api.Delete("/visual-queries/:id", middleware.AuthMiddleware, visualQueryHandler.DeleteVisualQuery)
	api.Post("/visual-queries/generate-sql", middleware.AuthMiddleware, visualQueryHandler.GenerateSQL)
	api.Post("/visual-queries/:id/preview", middleware.AuthMiddleware, visualQueryHandler.PreviewVisualQuery)
	api.Get("/visual-queries/cache/stats", middleware.AuthMiddleware, visualQueryHandler.GetCacheStats)
	api.Post("/visual-queries/join-suggestions", middleware.AuthMiddleware, visualQueryHandler.GetJoinSuggestions)

	// RLS Policy Routes (Protected) - Phase 1.5 Row-Level Security
	rlsHandler := handlers.NewRLSHandler(rlsService)
	api.Get("/rls/policies", middleware.AuthMiddleware, rlsHandler.ListPolicies)
	api.Post("/rls/policies", middleware.AuthMiddleware, rlsHandler.CreatePolicy)
	api.Get("/rls/policies/:id", middleware.AuthMiddleware, rlsHandler.GetPolicy)
	api.Put("/rls/policies/:id", middleware.AuthMiddleware, rlsHandler.UpdatePolicy)
	api.Delete("/rls/policies/:id", middleware.AuthMiddleware, rlsHandler.DeletePolicy)
	api.Post("/rls/policies/:id/test", middleware.AuthMiddleware, rlsHandler.TestPolicy)
	services.LogInfo("routes_registered", "RLS policy routes registered", map[string]interface{}{"endpoint": "/api/rls/policies", "operations": "CRUD + Test"})

	// GeoJSON Routes (Protected) - Phase 2.1 Map Visualizations (TASK-036 to TASK-039)
	api.Post("/geojson", middleware.AuthMiddleware, geoJSONHandler.UploadGeoJSON)
	api.Get("/geojson", middleware.AuthMiddleware, geoJSONHandler.ListGeoJSON)
	api.Get("/geojson/:id", middleware.AuthMiddleware, geoJSONHandler.GetGeoJSON)
	api.Get("/geojson/:id/data", middleware.AuthMiddleware, geoJSONHandler.GetGeoJSONData)
	api.Put("/geojson/:id", middleware.AuthMiddleware, geoJSONHandler.UpdateGeoJSON)
	api.Delete("/geojson/:id", middleware.AuthMiddleware, geoJSONHandler.DeleteGeoJSON)
	services.LogInfo("routes_registered", "GeoJSON routes registered", map[string]interface{}{"endpoint": "/api/geojson", "operations": "Upload, List, Get, Update, Delete"})

	// WebSocket stats (for monitoring)
	api.Get("/ws/stats", middleware.AuthMiddleware, wsHandler.GetStats)

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	services.LogInfo("server_start", "Server running", map[string]interface{}{"port": port})
	if err := app.Listen(":" + port); err != nil {
		services.LogFatal("server_start_failed", "Failed to start server", map[string]interface{}{"port": port, "error": err})
	}
}
