package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// RESTConnectorConfig represents REST API connection configuration
type RESTConnectorConfig struct {
	ID               uuid.UUID         `json:"id"`
	UserID           uuid.UUID         `json:"userId"`
	Name             string            `json:"name"`
	BaseURL          string            `json:"baseUrl"`
	Method           string            `json:"method"` // GET, POST, PUT, DELETE
	Headers          map[string]string `json:"headers"`
	QueryParams      map[string]string `json:"queryParams"`
	Body             string            `json:"body,omitempty"`
	AuthType         string            `json:"authType"` // none, api_key, basic, oauth2, bearer
	AuthConfig       map[string]string `json:"authConfig"`
	PaginationType   string            `json:"paginationType"` // none, offset, cursor, page
	PaginationConfig map[string]string `json:"paginationConfig"`
	DataPath         string            `json:"dataPath"` // JSON path to data array
	Timeout          int               `json:"timeout"`  // Request timeout in seconds
	RetryCount       int               `json:"retryCount"`
	RetryDelay       int               `json:"retryDelay"` // Retry delay in seconds
}

// RESTResponse represents a REST API response
type RESTResponse struct {
	StatusCode int                 `json:"statusCode"`
	Headers    map[string][]string `json:"headers"`
	Body       interface{}         `json:"body"`
	RawBody    string              `json:"rawBody,omitempty"`
	Parsed     bool                `json:"parsed"`
	Error      string              `json:"error,omitempty"`
	Duration   int64               `json:"durationMs"`
}

// RESTDataResult represents extracted data from REST API
type RESTDataResult struct {
	Columns    []Column                 `json:"columns"`
	Rows       []map[string]interface{} `json:"rows"`
	TotalRows  int                      `json:"totalRows"`
	HasMore    bool                     `json:"hasMore"`
	NextCursor string                   `json:"nextCursor,omitempty"`
	Pagination *PaginationInfo          `json:"pagination,omitempty"`
}

// PaginationInfo represents pagination metadata
type PaginationInfo struct {
	Type       string `json:"type"`
	Page       int    `json:"page,omitempty"`
	PageSize   int    `json:"pageSize,omitempty"`
	TotalPages int    `json:"totalPages,omitempty"`
	Offset     int    `json:"offset,omitempty"`
	Limit      int    `json:"limit,omitempty"`
	Cursor     string `json:"cursor,omitempty"`
	HasNext    bool   `json:"hasNext"`
	HasPrev    bool   `json:"hasPrev"`
}

// RESTConnector handles REST API connections
type RESTConnector struct {
	httpClient  *http.Client
	authService *RESTAuthService
}

// NewRESTConnector creates a new REST API connector
func NewRESTConnector() *RESTConnector {
	return &RESTConnector{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		authService: NewRESTAuthService(),
	}
}

// ExecuteRequest executes a REST API request
func (rc *RESTConnector) ExecuteRequest(
	ctx context.Context,
	config *RESTConnectorConfig,
) (*RESTResponse, error) {
	startTime := time.Now()

	// Build URL
	fullURL, err := rc.buildURL(config)
	if err != nil {
		return nil, fmt.Errorf("failed to build URL: %w", err)
	}

	// Create request
	var bodyReader io.Reader
	if config.Body != "" {
		bodyReader = bytes.NewBufferString(config.Body)
	}

	req, err := http.NewRequestWithContext(ctx, config.Method, fullURL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Apply headers
	for key, value := range config.Headers {
		req.Header.Set(key, value)
	}

	// Apply authentication
	if err := rc.authService.ApplyAuth(req, config); err != nil {
		return nil, fmt.Errorf("failed to apply auth: %w", err)
	}

	// Set default Content-Type if not specified
	if req.Header.Get("Content-Type") == "" && config.Body != "" {
		req.Header.Set("Content-Type", "application/json")
	}

	// Execute request with retry
	var resp *http.Response
	var lastErr error

	retryCount := config.RetryCount
	if retryCount == 0 {
		retryCount = 1 // At least one attempt
	}

	for i := 0; i < retryCount; i++ {
		resp, lastErr = rc.httpClient.Do(req)
		if lastErr == nil && resp.StatusCode < 500 {
			break
		}

		// Retry on 5xx errors
		if i < retryCount-1 {
			retryDelay := config.RetryDelay
			if retryDelay == 0 {
				retryDelay = 1
			}
			time.Sleep(time.Duration(retryDelay) * time.Second)
		}
	}

	if lastErr != nil {
		return &RESTResponse{
			StatusCode: 0,
			Error:      lastErr.Error(),
			Duration:   time.Since(startTime).Milliseconds(),
		}, lastErr
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return &RESTResponse{
			StatusCode: resp.StatusCode,
			Headers:    resp.Header,
			Error:      fmt.Sprintf("failed to read response: %v", err),
			Duration:   time.Since(startTime).Milliseconds(),
		}, err
	}

	// Parse JSON response
	var parsedBody interface{}
	parsed := false
	if json.Valid(bodyBytes) {
		if err := json.Unmarshal(bodyBytes, &parsedBody); err == nil {
			parsed = true
		}
	}

	return &RESTResponse{
		StatusCode: resp.StatusCode,
		Headers:    resp.Header,
		Body:       parsedBody,
		RawBody:    string(bodyBytes),
		Parsed:     parsed,
		Duration:   time.Since(startTime).Milliseconds(),
	}, nil
}

// buildURL builds the full URL with query parameters
func (rc *RESTConnector) buildURL(config *RESTConnectorConfig) (string, error) {
	baseURL := strings.TrimRight(config.BaseURL, "/")

	// Parse base URL
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}

	// Add query parameters
	if len(config.QueryParams) > 0 {
		query := parsedURL.Query()
		for key, value := range config.QueryParams {
			query.Set(key, value)
		}
		parsedURL.RawQuery = query.Encode()
	}

	return parsedURL.String(), nil
}

// FetchData fetches and extracts data from REST API
func (rc *RESTConnector) FetchData(
	ctx context.Context,
	config *RESTConnectorConfig,
	limit int,
) (*RESTDataResult, error) {
	// Execute request
	response, err := rc.ExecuteRequest(ctx, config)
	if err != nil {
		return nil, err
	}

	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("API returned error status %d: %s", response.StatusCode, response.RawBody)
	}

	if !response.Parsed {
		return nil, fmt.Errorf("failed to parse JSON response")
	}

	// Extract data from response
	data, err := rc.extractData(response.Body, config.DataPath)
	if err != nil {
		return nil, fmt.Errorf("failed to extract data: %w", err)
	}

	// Convert to rows
	rows, err := rc.convertToRows(data, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to convert data: %w", err)
	}

	// Extract columns
	columns := rc.extractColumns(rows)

	// Check pagination
	hasMore, nextCursor := rc.detectPagination(response.Body, config, len(rows), limit)

	return &RESTDataResult{
		Columns:    columns,
		Rows:       rows,
		TotalRows:  len(rows),
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

// extractData extracts data array from response using JSON path
func (rc *RESTConnector) extractData(body interface{}, dataPath string) ([]interface{}, error) {
	if dataPath == "" {
		// Try to detect array at root
		if arr, ok := body.([]interface{}); ok {
			return arr, nil
		}

		// Try common paths
		if obj, ok := body.(map[string]interface{}); ok {
			commonPaths := []string{"data", "results", "items", "records", "rows"}
			for _, path := range commonPaths {
				if value, exists := obj[path]; exists {
					if arr, ok := value.([]interface{}); ok {
						return arr, nil
					}
				}
			}
		}

		return nil, fmt.Errorf("no data array found in response")
	}

	// Navigate path
	parts := strings.Split(dataPath, ".")
	current := body

	for _, part := range parts {
		if obj, ok := current.(map[string]interface{}); ok {
			value, exists := obj[part]
			if !exists {
				return nil, fmt.Errorf("path not found: %s", part)
			}
			current = value
		} else {
			return nil, fmt.Errorf("expected object at path: %s", part)
		}
	}

	// Expect array at final path
	if arr, ok := current.([]interface{}); ok {
		return arr, nil
	}

	return nil, fmt.Errorf("expected array at path: %s", dataPath)
}

// convertToRows converts array of objects to row format
func (rc *RESTConnector) convertToRows(data []interface{}, limit int) ([]map[string]interface{}, error) {
	rows := make([]map[string]interface{}, 0)

	maxRows := len(data)
	if limit > 0 && limit < maxRows {
		maxRows = limit
	}

	for i := 0; i < maxRows; i++ {
		item := data[i]

		// Convert to map
		if obj, ok := item.(map[string]interface{}); ok {
			rows = append(rows, obj)
		} else {
			// Wrap primitive values
			rows = append(rows, map[string]interface{}{
				"value": item,
			})
		}
	}

	return rows, nil
}

// extractColumns extracts column schema from rows
func (rc *RESTConnector) extractColumns(rows []map[string]interface{}) []Column {
	if len(rows) == 0 {
		return []Column{}
	}

	// Collect all keys
	keySet := make(map[string]bool)
	for _, row := range rows {
		for key := range row {
			keySet[key] = true
		}
	}

	// Create columns
	columns := make([]Column, 0, len(keySet))
	for key := range keySet {
		// Detect type from first non-null value
		dataType := "text"
		for _, row := range rows {
			if value, exists := row[key]; exists && value != nil {
				dataType = rc.detectValueType(value)
				break
			}
		}

		columns = append(columns, Column{
			Name:     key,
			DataType: dataType,
		})
	}

	return columns
}

// detectValueType detects the type of a value
func (rc *RESTConnector) detectValueType(value interface{}) string {
	switch v := value.(type) {
	case bool:
		return "boolean"
	case float64:
		// Check if it's actually an integer
		if v == float64(int64(v)) {
			return "integer"
		}
		return "float"
	case string:
		return "text"
	case []interface{}, map[string]interface{}:
		return "json"
	default:
		return "text"
	}
}

// detectPagination detects pagination info from response
func (rc *RESTConnector) detectPagination(
	body interface{},
	config *RESTConnectorConfig,
	fetchedRows int,
	limit int,
) (bool, string) {
	if config.PaginationType == "none" || config.PaginationType == "" {
		return false, ""
	}

	obj, ok := body.(map[string]interface{})
	if !ok {
		return false, ""
	}

	switch config.PaginationType {
	case "cursor":
		// Look for next cursor
		cursorPath := config.PaginationConfig["cursor_path"]
		if cursorPath == "" {
			cursorPath = "next_cursor"
		}

		if cursor, exists := obj[cursorPath]; exists {
			if cursorStr, ok := cursor.(string); ok && cursorStr != "" {
				return true, cursorStr
			}
		}

	case "offset":
		// Check if we fetched a full page
		return fetchedRows >= limit, ""

	case "page":
		// Look for total pages
		totalPagesPath := config.PaginationConfig["total_pages_path"]
		if totalPagesPath == "" {
			totalPagesPath = "total_pages"
		}

		if totalPages, exists := obj[totalPagesPath]; exists {
			if totalPagesFloat, ok := totalPages.(float64); ok {
				currentPage := 1
				if pageStr := config.PaginationConfig["current_page"]; pageStr != "" {
					currentPage, _ = strconv.Atoi(pageStr)
				}
				return currentPage < int(totalPagesFloat), ""
			}
		}
	}

	return false, ""
}

// TestConnection tests the REST API connection
func (rc *RESTConnector) TestConnection(ctx context.Context, config *RESTConnectorConfig) error {
	response, err := rc.ExecuteRequest(ctx, config)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}

	if response.StatusCode >= 400 {
		return fmt.Errorf("API returned error status %d: %s", response.StatusCode, response.RawBody)
	}

	if !response.Parsed {
		return fmt.Errorf("response is not valid JSON")
	}

	return nil
}

// GetNextPage fetches the next page of data
func (rc *RESTConnector) GetNextPage(
	ctx context.Context,
	config *RESTConnectorConfig,
	currentPage int,
	cursor string,
) (*RESTDataResult, error) {
	// Clone config
	nextConfig := *config

	switch config.PaginationType {
	case "cursor":
		// Add cursor to query params
		cursorParam := config.PaginationConfig["cursor_param"]
		if cursorParam == "" {
			cursorParam = "cursor"
		}
		nextConfig.QueryParams[cursorParam] = cursor

	case "offset":
		// Calculate offset
		limit := 100
		if limitStr := config.PaginationConfig["limit"]; limitStr != "" {
			limit, _ = strconv.Atoi(limitStr)
		}

		offsetParam := config.PaginationConfig["offset_param"]
		if offsetParam == "" {
			offsetParam = "offset"
		}
		nextConfig.QueryParams[offsetParam] = strconv.Itoa(currentPage * limit)

		limitParam := config.PaginationConfig["limit_param"]
		if limitParam == "" {
			limitParam = "limit"
		}
		nextConfig.QueryParams[limitParam] = strconv.Itoa(limit)

	case "page":
		// Increment page
		pageParam := config.PaginationConfig["page_param"]
		if pageParam == "" {
			pageParam = "page"
		}
		nextConfig.QueryParams[pageParam] = strconv.Itoa(currentPage + 1)
	}

	return rc.FetchData(ctx, &nextConfig, 0)
}
