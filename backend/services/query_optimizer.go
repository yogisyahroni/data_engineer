package services

import (
	"fmt"
	"regexp"
	"strings"
)

// QueryOptimizer provides SQL query optimization suggestions
type QueryOptimizer struct {
	// Common optimization patterns
	patterns []OptimizationPattern
}

// OptimizationPattern represents a query optimization pattern
type OptimizationPattern struct {
	Name        string
	Description string
	Severity    string // "high", "medium", "low"
	Pattern     *regexp.Regexp
	Suggestion  string
	Example     string
}

// OptimizationSuggestion represents a single optimization suggestion
type OptimizationSuggestion struct {
	Type        string `json:"type"`     // "index", "join", "select", "where", "subquery"
	Severity    string `json:"severity"` // "high", "medium", "low"
	Title       string `json:"title"`
	Description string `json:"description"`
	Original    string `json:"original"`
	Optimized   string `json:"optimized"`
	Impact      string `json:"impact"` // Estimated performance impact
	Example     string `json:"example"`
}

// QueryAnalysisResult represents the result of query analysis
type QueryAnalysisResult struct {
	Query                string                   `json:"query"`
	Suggestions          []OptimizationSuggestion `json:"suggestions"`
	PerformanceScore     int                      `json:"performanceScore"`     // 0-100
	ComplexityLevel      string                   `json:"complexityLevel"`      // "low", "medium", "high"
	EstimatedImprovement string                   `json:"estimatedImprovement"` // e.g., "30-50%"
}

// NewQueryOptimizer creates a new query optimizer
func NewQueryOptimizer() *QueryOptimizer {
	return &QueryOptimizer{
		patterns: []OptimizationPattern{
			{
				Name:        "SELECT *",
				Description: "Avoid SELECT * - specify only needed columns",
				Severity:    "medium",
				Pattern:     regexp.MustCompile(`(?i)SELECT\s+\*`),
				Suggestion:  "Replace SELECT * with specific column names to reduce data transfer and improve performance",
				Example:     "SELECT id, name, email FROM users",
			},
			{
				Name:        "Missing WHERE clause",
				Description: "Query without WHERE clause may scan entire table",
				Severity:    "high",
				Pattern:     regexp.MustCompile(`(?i)SELECT.*FROM\s+\w+\s*(?:;|$)`),
				Suggestion:  "Add WHERE clause to filter data and reduce rows scanned",
				Example:     "SELECT * FROM users WHERE created_at > '2024-01-01'",
			},
			{
				Name:        "OR in WHERE clause",
				Description: "OR conditions can prevent index usage",
				Severity:    "medium",
				Pattern:     regexp.MustCompile(`(?i)WHERE.*\sOR\s`),
				Suggestion:  "Consider using UNION or IN clause instead of OR for better index utilization",
				Example:     "SELECT * FROM users WHERE id IN (1, 2, 3)",
			},
			{
				Name:        "Function on indexed column",
				Description: "Functions on indexed columns prevent index usage",
				Severity:    "high",
				Pattern:     regexp.MustCompile(`(?i)WHERE\s+\w+\([^)]+\)\s*=`),
				Suggestion:  "Avoid functions on indexed columns in WHERE clause",
				Example:     "Use WHERE created_at >= DATE instead of WHERE DATE(created_at) = DATE",
			},
			{
				Name:        "LIKE with leading wildcard",
				Description: "LIKE with leading % prevents index usage",
				Severity:    "medium",
				Pattern:     regexp.MustCompile(`(?i)LIKE\s+'%`),
				Suggestion:  "Avoid leading wildcards in LIKE patterns. Consider full-text search for better performance",
				Example:     "Use LIKE 'prefix%' or full-text search instead of LIKE '%search%'",
			},
			{
				Name:        "Subquery in SELECT",
				Description: "Subqueries in SELECT can be slow",
				Severity:    "medium",
				Pattern:     regexp.MustCompile(`(?i)SELECT.*\(SELECT`),
				Suggestion:  "Consider using JOINs instead of subqueries in SELECT clause",
				Example:     "Use LEFT JOIN instead of correlated subquery",
			},
			{
				Name:        "NOT IN with subquery",
				Description: "NOT IN with subquery can be very slow",
				Severity:    "high",
				Pattern:     regexp.MustCompile(`(?i)NOT\s+IN\s*\(SELECT`),
				Suggestion:  "Use NOT EXISTS or LEFT JOIN with NULL check instead of NOT IN",
				Example:     "SELECT * FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)",
			},
			{
				Name:        "DISTINCT without necessity",
				Description: "DISTINCT can be expensive, ensure it's necessary",
				Severity:    "low",
				Pattern:     regexp.MustCompile(`(?i)SELECT\s+DISTINCT`),
				Suggestion:  "Verify if DISTINCT is necessary. Consider using GROUP BY if aggregating",
				Example:     "Use GROUP BY for aggregations instead of DISTINCT",
			},
		},
	}
}

// AnalyzeQuery analyzes a SQL query and provides optimization suggestions
func (qo *QueryOptimizer) AnalyzeQuery(query string) *QueryAnalysisResult {
	query = strings.TrimSpace(query)
	suggestions := []OptimizationSuggestion{}

	// Check each pattern
	for _, pattern := range qo.patterns {
		if pattern.Pattern.MatchString(query) {
			suggestion := OptimizationSuggestion{
				Type:        qo.categorizePattern(pattern.Name),
				Severity:    pattern.Severity,
				Title:       pattern.Name,
				Description: pattern.Description,
				Original:    qo.extractMatchedPart(query, pattern.Pattern),
				Optimized:   pattern.Example,
				Impact:      qo.estimateImpact(pattern.Severity),
				Example:     pattern.Suggestion,
			}
			suggestions = append(suggestions, suggestion)
		}
	}

	// Calculate performance score (100 - penalties)
	score := 100
	for _, s := range suggestions {
		switch s.Severity {
		case "high":
			score -= 20
		case "medium":
			score -= 10
		case "low":
			score -= 5
		}
	}
	if score < 0 {
		score = 0
	}

	// Determine complexity level
	complexity := qo.determineComplexity(query)

	// Estimate improvement
	improvement := qo.estimateImprovement(suggestions)

	return &QueryAnalysisResult{
		Query:                query,
		Suggestions:          suggestions,
		PerformanceScore:     score,
		ComplexityLevel:      complexity,
		EstimatedImprovement: improvement,
	}
}

// categorizePattern categorizes the pattern type
func (qo *QueryOptimizer) categorizePattern(name string) string {
	name = strings.ToLower(name)
	if strings.Contains(name, "index") {
		return "index"
	}
	if strings.Contains(name, "join") {
		return "join"
	}
	if strings.Contains(name, "select") {
		return "select"
	}
	if strings.Contains(name, "where") {
		return "where"
	}
	if strings.Contains(name, "subquery") {
		return "subquery"
	}
	return "general"
}

// extractMatchedPart extracts the matched part of the query
func (qo *QueryOptimizer) extractMatchedPart(query string, pattern *regexp.Regexp) string {
	match := pattern.FindString(query)
	if match == "" {
		return query
	}
	return match
}

// estimateImpact estimates the performance impact
func (qo *QueryOptimizer) estimateImpact(severity string) string {
	switch severity {
	case "high":
		return "50-80% improvement possible"
	case "medium":
		return "20-50% improvement possible"
	case "low":
		return "5-20% improvement possible"
	default:
		return "Minor improvement"
	}
}

// determineComplexity determines query complexity
func (qo *QueryOptimizer) determineComplexity(query string) string {
	query = strings.ToLower(query)

	// Count complexity indicators
	complexity := 0

	if strings.Contains(query, "join") {
		complexity += 2
	}
	if strings.Contains(query, "subquery") || strings.Contains(query, "(select") {
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

// estimateImprovement estimates overall improvement potential
func (qo *QueryOptimizer) estimateImprovement(suggestions []OptimizationSuggestion) string {
	if len(suggestions) == 0 {
		return "Query is already optimized"
	}

	highCount := 0
	mediumCount := 0

	for _, s := range suggestions {
		if s.Severity == "high" {
			highCount++
		} else if s.Severity == "medium" {
			mediumCount++
		}
	}

	if highCount >= 2 {
		return "60-80% improvement possible"
	} else if highCount == 1 {
		return "40-60% improvement possible"
	} else if mediumCount >= 2 {
		return "20-40% improvement possible"
	} else if mediumCount == 1 {
		return "10-20% improvement possible"
	}
	return "5-10% improvement possible"
}

// OptimizeQuery attempts to automatically optimize a query
func (qo *QueryOptimizer) OptimizeQuery(query string) string {
	optimized := query

	// Apply automatic optimizations
	// 1. Replace SELECT * with specific columns (requires schema knowledge)
	// For now, we just suggest - actual optimization needs schema context

	// 2. Add LIMIT if missing (for safety)
	if !strings.Contains(strings.ToLower(optimized), "limit") {
		optimized = strings.TrimSuffix(optimized, ";")
		optimized = fmt.Sprintf("%s LIMIT 1000;", optimized)
	}

	return optimized
}
