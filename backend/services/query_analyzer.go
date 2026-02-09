package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"insight-engine-backend/models"
	"regexp"
	"strings"
	"time"
)

// QueryAnalyzer provides EXPLAIN-based query plan analysis
type QueryAnalyzer struct {
	executor *QueryExecutor
}

// QueryPlanAnalysis represents the complete analysis result
type QueryPlanAnalysis struct {
	Query              string               `json:"query"`
	DatabaseType       string               `json:"databaseType"`
	ExecutionPlan      interface{}          `json:"executionPlan"` // Raw plan (varies by DB)
	PlanText           string               `json:"planText"`      // Text representation
	PerformanceMetrics *PerformanceMetrics  `json:"performanceMetrics"`
	Issues             []PlanIssue          `json:"issues"`
	Recommendations    []PlanRecommendation `json:"recommendations"`
	EstimatedCost      float64              `json:"estimatedCost"`
	EstimatedRows      int64                `json:"estimatedRows"`
	AnalyzedAt         time.Time            `json:"analyzedAt"`
}

// PerformanceMetrics contains query performance data
type PerformanceMetrics struct {
	PlanningTime  float64 `json:"planningTime"`  // ms
	ExecutionTime float64 `json:"executionTime"` // ms
	TotalCost     float64 `json:"totalCost"`
	ActualRows    int64   `json:"actualRows"`
	EstimatedRows int64   `json:"estimatedRows"`
	Accuracy      float64 `json:"accuracy"` // actual/estimated rows ratio
}

// PlanIssue represents a detected performance issue
type PlanIssue struct {
	Type        string `json:"type"`     // "seq_scan", "missing_index", "high_cost", "suboptimal_join"
	Severity    string `json:"severity"` // "critical", "warning", "info"
	Title       string `json:"title"`
	Description string `json:"description"`
	Table       string `json:"table,omitempty"`
	Column      string `json:"column,omitempty"`
	Impact      string `json:"impact"` // Estimated impact
}

// PlanRecommendation represents an optimization suggestion
type PlanRecommendation struct {
	ID          string `json:"id"`
	Type        string `json:"type"`     // "index", "rewrite", "config"
	Priority    string `json:"priority"` // "high", "medium", "low"
	Title       string `json:"title"`
	Description string `json:"description"`
	Action      string `json:"action"` // SQL or config change
	Example     string `json:"example,omitempty"`
	Benefit     string `json:"benefit"` // Expected improvement
}

// PostgreSQLPlanNode represents a node in PostgreSQL's EXPLAIN JSON output
type PostgreSQLPlanNode struct {
	NodeType     string               `json:"Node Type"`
	RelationName string               `json:"Relation Name,omitempty"`
	Alias        string               `json:"Alias,omitempty"`
	StartupCost  float64              `json:"Startup Cost"`
	TotalCost    float64              `json:"Total Cost"`
	PlanRows     int64                `json:"Plan Rows"`
	PlanWidth    int                  `json:"Plan Width"`
	ActualRows   int64                `json:"Actual Rows,omitempty"`
	ActualLoops  int                  `json:"Actual Loops,omitempty"`
	Filter       string               `json:"Filter,omitempty"`
	IndexName    string               `json:"Index Name,omitempty"`
	IndexCond    string               `json:"Index Cond,omitempty"`
	JoinType     string               `json:"Join Type,omitempty"`
	Plans        []PostgreSQLPlanNode `json:"Plans,omitempty"`
}

// NewQueryAnalyzer creates a new query analyzer
func NewQueryAnalyzer(executor *QueryExecutor) *QueryAnalyzer {
	return &QueryAnalyzer{
		executor: executor,
	}
}

// AnalyzeQuery performs EXPLAIN analysis on a query
func (qa *QueryAnalyzer) AnalyzeQuery(ctx context.Context, conn *models.Connection, query string) (*QueryPlanAnalysis, error) {
	// Get database connection
	db, err := qa.executor.getConnection(conn)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	analysis := &QueryPlanAnalysis{
		Query:           query,
		DatabaseType:    conn.Type,
		AnalyzedAt:      time.Now(),
		Issues:          []PlanIssue{},
		Recommendations: []PlanRecommendation{},
	}

	// Execute EXPLAIN based on database type
	switch conn.Type {
	case "postgres":
		return qa.analyzePostgreSQL(ctx, db, query, analysis)
	case "mysql":
		return qa.analyzeMySQL(ctx, db, query, analysis)
	case "sqlite":
		return qa.analyzeSQLite(ctx, db, query, analysis)
	default:
		return nil, fmt.Errorf("EXPLAIN analysis not supported for database type: %s", conn.Type)
	}
}

// analyzePostgreSQL performs EXPLAIN ANALYZE for PostgreSQL
func (qa *QueryAnalyzer) analyzePostgreSQL(ctx context.Context, db *sql.DB, query string, analysis *QueryPlanAnalysis) (*QueryPlanAnalysis, error) {
	// Execute EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS)
	explainQuery := fmt.Sprintf("EXPLAIN (FORMAT JSON, ANALYZE TRUE, BUFFERS TRUE) %s", query)

	var planJSON string
	err := db.QueryRowContext(ctx, explainQuery).Scan(&planJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to execute EXPLAIN: %w", err)
	}

	// Parse JSON output
	var planOutput []map[string]interface{}
	if err := json.Unmarshal([]byte(planJSON), &planOutput); err != nil {
		return nil, fmt.Errorf("failed to parse EXPLAIN JSON: %w", err)
	}

	if len(planOutput) == 0 {
		return nil, fmt.Errorf("empty EXPLAIN output")
	}

	planData := planOutput[0]

	// Extract plan node
	planInterface, ok := planData["Plan"]
	if !ok {
		return nil, fmt.Errorf("no Plan found in EXPLAIN output")
	}

	// Convert to JSON for storage
	planBytes, _ := json.Marshal(planInterface)
	analysis.ExecutionPlan = planInterface
	analysis.PlanText = string(planBytes)

	// Extract performance metrics
	if planningTime, ok := planData["Planning Time"].(float64); ok {
		if analysis.PerformanceMetrics == nil {
			analysis.PerformanceMetrics = &PerformanceMetrics{}
		}
		analysis.PerformanceMetrics.PlanningTime = planningTime
	}
	if executionTime, ok := planData["Execution Time"].(float64); ok {
		if analysis.PerformanceMetrics == nil {
			analysis.PerformanceMetrics = &PerformanceMetrics{}
		}
		analysis.PerformanceMetrics.ExecutionTime = executionTime
	}

	// Parse plan node and detect issues
	qa.analyzePostgreSQLPlan(planInterface.(map[string]interface{}), analysis)

	return analysis, nil
}

// analyzePostgreSQLPlan recursively analyzes PostgreSQL plan nodes
func (qa *QueryAnalyzer) analyzePostgreSQLPlan(planNode map[string]interface{}, analysis *QueryPlanAnalysis) {
	nodeType, _ := planNode["Node Type"].(string)
	relationName, _ := planNode["Relation Name"].(string)
	totalCost, _ := planNode["Total Cost"].(float64)
	planRows, _ := planNode["Plan Rows"].(float64)

	// Update metrics
	if totalCost > analysis.EstimatedCost {
		analysis.EstimatedCost = totalCost
	}
	if int64(planRows) > analysis.EstimatedRows {
		analysis.EstimatedRows = int64(planRows)
	}

	// Detect Sequential Scans (critical issue)
	if nodeType == "Seq Scan" {
		issue := PlanIssue{
			Type:        "seq_scan",
			Severity:    "critical",
			Title:       fmt.Sprintf("Sequential Scan on table: %s", relationName),
			Description: "Full table scan detected. This can be very slow for large tables.",
			Table:       relationName,
			Impact:      "High - scans entire table instead of using index",
		}
		analysis.Issues = append(analysis.Issues, issue)

		// Recommend index
		rec := PlanRecommendation{
			ID:          fmt.Sprintf("index_%s", relationName),
			Type:        "index",
			Priority:    "high",
			Title:       fmt.Sprintf("Add index to table: %s", relationName),
			Description: "Create an index on frequently filtered columns to avoid sequential scans.",
			Action:      fmt.Sprintf("CREATE INDEX idx_%s_column ON %s (column_name);", relationName, relationName),
			Benefit:     "50-90% query time reduction",
		}
		analysis.Recommendations = append(analysis.Recommendations, rec)
	}

	// Detect high-cost operations
	if totalCost > 10000 {
		issue := PlanIssue{
			Type:        "high_cost",
			Severity:    "warning",
			Title:       fmt.Sprintf("High cost operation: %s", nodeType),
			Description: fmt.Sprintf("Operation has estimated cost of %.2f, which is high.", totalCost),
			Table:       relationName,
			Impact:      "Medium - may slow down query execution",
		}
		analysis.Issues = append(analysis.Issues, issue)
	}

	// Detect nested loops with large row counts
	if nodeType == "Nested Loop" && planRows > 1000 {
		issue := PlanIssue{
			Type:        "suboptimal_join",
			Severity:    "warning",
			Title:       "Large Nested Loop detected",
			Description: fmt.Sprintf("Nested loop with %.0f estimated rows. Consider hash join instead.", planRows),
			Impact:      "Medium - inefficient for large datasets",
		}
		analysis.Issues = append(analysis.Issues, issue)

		rec := PlanRecommendation{
			ID:          "join_optimization",
			Type:        "config",
			Priority:    "medium",
			Title:       "Consider Hash Join",
			Description: "Hash joins are more efficient for large datasets.",
			Action:      "SET enable_hashjoin = on; or add appropriate indexes",
			Benefit:     "30-50% improvement for large joins",
		}
		analysis.Recommendations = append(analysis.Recommendations, rec)
	}

	// Recursively analyze child plans
	if plans, ok := planNode["Plans"].([]interface{}); ok {
		for _, childPlan := range plans {
			if childMap, ok := childPlan.(map[string]interface{}); ok {
				qa.analyzePostgreSQLPlan(childMap, analysis)
			}
		}
	}
}

// analyzeMySQL performs EXPLAIN for MySQL
func (qa *QueryAnalyzer) analyzeMySQL(ctx context.Context, db *sql.DB, query string, analysis *QueryPlanAnalysis) (*QueryPlanAnalysis, error) {
	// Execute EXPLAIN FORMAT=JSON
	explainQuery := fmt.Sprintf("EXPLAIN FORMAT=JSON %s", query)

	var planJSON string
	err := db.QueryRowContext(ctx, explainQuery).Scan(&planJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to execute EXPLAIN: %w", err)
	}

	// Parse JSON
	var planData map[string]interface{}
	if err := json.Unmarshal([]byte(planJSON), &planData); err != nil {
		return nil, fmt.Errorf("failed to parse EXPLAIN JSON: %w", err)
	}

	analysis.ExecutionPlan = planData
	analysis.PlanText = planJSON

	// Extract query block
	if queryBlock, ok := planData["query_block"].(map[string]interface{}); ok {
		qa.analyzeMySQLPlan(queryBlock, analysis)
	}

	return analysis, nil
}

// analyzeMySQLPlan analyzes MySQL EXPLAIN output
func (qa *QueryAnalyzer) analyzeMySQLPlan(planNode map[string]interface{}, analysis *QueryPlanAnalysis) {
	// Check for table scan
	if table, ok := planNode["table"].(map[string]interface{}); ok {
		tableName, _ := table["table_name"].(string)
		accessType, _ := table["access_type"].(string)
		rows, _ := table["rows_examined_per_scan"].(float64)

		// Detect ALL scan (table scan)
		if accessType == "ALL" {
			issue := PlanIssue{
				Type:        "seq_scan",
				Severity:    "critical",
				Title:       fmt.Sprintf("Full table scan on: %s", tableName),
				Description: "MySQL is scanning the entire table. Add an index to improve performance.",
				Table:       tableName,
				Impact:      "High - scans all rows in table",
			}
			analysis.Issues = append(analysis.Issues, issue)

			rec := PlanRecommendation{
				ID:          fmt.Sprintf("index_%s", tableName),
				Type:        "index",
				Priority:    "high",
				Title:       fmt.Sprintf("Create index on table: %s", tableName),
				Description: "Add index on columns used in WHERE, JOIN, or ORDER BY clauses.",
				Action:      fmt.Sprintf("CREATE INDEX idx_%s_col ON %s (column_name);", tableName, tableName),
				Benefit:     "50-80% performance improvement",
			}
			analysis.Recommendations = append(analysis.Recommendations, rec)
		}

		// Check for large row count
		if rows > 10000 {
			issue := PlanIssue{
				Type:        "high_cost",
				Severity:    "warning",
				Title:       fmt.Sprintf("Large scan on table: %s", tableName),
				Description: fmt.Sprintf("Query will scan %.0f rows. Consider adding filters or indexes.", rows),
				Table:       tableName,
				Impact:      "Medium - processing many rows",
			}
			analysis.Issues = append(analysis.Issues, issue)
		}
	}

	// Recursively check nested queries
	if nestedLoop, ok := planNode["nested_loop"].([]interface{}); ok {
		for _, item := range nestedLoop {
			if itemMap, ok := item.(map[string]interface{}); ok {
				qa.analyzeMySQLPlan(itemMap, analysis)
			}
		}
	}
}

// analyzeSQLite performs EXPLAIN QUERY PLAN for SQLite
func (qa *QueryAnalyzer) analyzeSQLite(ctx context.Context, db *sql.DB, query string, analysis *QueryPlanAnalysis) (*QueryPlanAnalysis, error) {
	// Execute EXPLAIN QUERY PLAN
	explainQuery := fmt.Sprintf("EXPLAIN QUERY PLAN %s", query)

	rows, err := db.QueryContext(ctx, explainQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to execute EXPLAIN QUERY PLAN: %w", err)
	}
	defer rows.Close()

	planLines := []string{}
	scanPattern := regexp.MustCompile(`SCAN TABLE (\w+)`)

	for rows.Next() {
		var id, parent, notused int
		var detail string
		if err := rows.Scan(&id, &parent, &notused, &detail); err != nil {
			continue
		}
		planLines = append(planLines, detail)

		// Detect table scans
		if matches := scanPattern.FindStringSubmatch(detail); len(matches) > 1 {
			tableName := matches[1]
			issue := PlanIssue{
				Type:        "seq_scan",
				Severity:    "warning",
				Title:       fmt.Sprintf("Table scan detected: %s", tableName),
				Description: "SQLite is scanning the entire table. Consider adding an index.",
				Table:       tableName,
				Impact:      "Medium - full table scan",
			}
			analysis.Issues = append(analysis.Issues, issue)

			rec := PlanRecommendation{
				ID:          fmt.Sprintf("index_%s", tableName),
				Type:        "index",
				Priority:    "high",
				Title:       fmt.Sprintf("Add index to table: %s", tableName),
				Description: "Create index on columns used in WHERE or JOIN conditions.",
				Action:      fmt.Sprintf("CREATE INDEX idx_%s_col ON %s (column);", tableName, tableName),
				Benefit:     "40-70% speedup",
			}
			analysis.Recommendations = append(analysis.Recommendations, rec)
		}
	}

	analysis.PlanText = strings.Join(planLines, "\n")
	analysis.ExecutionPlan = planLines

	return analysis, nil
}

// GetQueryComplexity estimates query complexity without EXPLAIN
func (qa *QueryAnalyzer) GetQueryComplexity(query string) string {
	query = strings.ToLower(query)
	complexity := 0

	if strings.Contains(query, "join") {
		complexity += 2
	}
	if strings.Contains(query, "subquery") || strings.Count(query, "(select") > 0 {
		complexity += 3
	}
	if strings.Contains(query, "group by") {
		complexity += 1
	}
	if strings.Contains(query, "having") {
		complexity += 2
	}
	if strings.Contains(query, "union") {
		complexity += 2
	}

	if complexity >= 6 {
		return "high"
	} else if complexity >= 3 {
		return "medium"
	}
	return "low"
}
