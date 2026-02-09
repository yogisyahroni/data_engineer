package services

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// CSVImportOptions represents CSV import configuration
type CSVImportOptions struct {
	Delimiter      rune     `json:"delimiter"`      // Default: ','
	HasHeader      bool     `json:"hasHeader"`      // Default: true
	SkipRows       int      `json:"skipRows"`       // Rows to skip at start
	MaxRows        int      `json:"maxRows"`        // Max rows to import (0 = all)
	DetectTypes    bool     `json:"detectTypes"`    // Auto-detect column types
	TrimWhitespace bool     `json:"trimWhitespace"` // Trim spaces from values
	NullValues     []string `json:"nullValues"`     // Values to treat as NULL (e.g., "NA", "N/A")
}

// CSVColumn represents a detected CSV column
type CSVColumn struct {
	Name         string   `json:"name"`
	Index        int      `json:"index"`
	DetectedType string   `json:"detectedType"` // text, integer, float, boolean, date
	SampleValues []string `json:"sampleValues"`
	NullCount    int      `json:"nullCount"`
}

// CSVPreview represents a preview of CSV data
type CSVPreview struct {
	Columns    []CSVColumn `json:"columns"`
	Rows       [][]string  `json:"rows"`
	TotalRows  int         `json:"totalRows"`
	SampleSize int         `json:"sampleSize"`
	HasHeader  bool        `json:"hasHeader"`
}

// CSVImportResult represents the result of CSV import
type CSVImportResult struct {
	ImportID     uuid.UUID   `json:"importId"`
	FileName     string      `json:"fileName"`
	RowsImported int         `json:"rowsImported"`
	Columns      []CSVColumn `json:"columns"`
	Errors       []string    `json:"errors,omitempty"`
	TableName    string      `json:"tableName"`
	Duration     int64       `json:"durationMs"`
}

// CSVImporter handles CSV file imports
type CSVImporter struct {
	maxFileSize int64 // Maximum file size in bytes
	sampleSize  int   // Number of rows to sample for type detection
}

// NewCSVImporter creates a new CSV importer
func NewCSVImporter() *CSVImporter {
	return &CSVImporter{
		maxFileSize: 100 * 1024 * 1024, // 100 MB
		sampleSize:  100,               // Sample first 100 rows
	}
}

// ParseCSVPreview generates a preview of CSV file
func (imp *CSVImporter) ParseCSVPreview(
	ctx context.Context,
	file multipart.File,
	fileName string,
	options *CSVImportOptions,
) (*CSVPreview, error) {
	startTime := time.Now()

	// Set default options
	if options == nil {
		options = &CSVImportOptions{
			Delimiter:      ',',
			HasHeader:      true,
			DetectTypes:    true,
			TrimWhitespace: true,
			NullValues:     []string{"", "NULL", "null", "NA", "N/A", "n/a"},
		}
	}

	// Create CSV reader
	reader := csv.NewReader(file)
	reader.Comma = options.Delimiter
	reader.TrimLeadingSpace = options.TrimWhitespace

	// Skip initial rows
	for i := 0; i < options.SkipRows; i++ {
		_, err := reader.Read()
		if err != nil {
			return nil, fmt.Errorf("failed to skip row %d: %w", i, err)
		}
	}

	// Read header
	var headers []string
	var err error

	if options.HasHeader {
		headers, err = reader.Read()
		if err != nil {
			return nil, fmt.Errorf("failed to read header: %w", err)
		}
		headers = imp.cleanHeaders(headers)
	}

	// Read sample rows
	var sampleRows [][]string
	rowCount := 0
	maxSample := imp.sampleSize
	if options.MaxRows > 0 && options.MaxRows < maxSample {
		maxSample = options.MaxRows
	}

	for rowCount < maxSample {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Skip malformed rows
			continue
		}

		sampleRows = append(sampleRows, row)
		rowCount++
	}

	if len(sampleRows) == 0 {
		return nil, errors.New("no data rows found in CSV")
	}

	// Generate column names if no header
	if !options.HasHeader {
		headers = make([]string, len(sampleRows[0]))
		for i := range headers {
			headers[i] = fmt.Sprintf("column_%d", i+1)
		}
	}

	// Detect column types
	columns := imp.detectColumnTypes(headers, sampleRows, options)

	preview := &CSVPreview{
		Columns:    columns,
		Rows:       sampleRows,
		TotalRows:  rowCount,
		SampleSize: len(sampleRows),
		HasHeader:  options.HasHeader,
	}

	LogDebug("csv_preview_performance", "CSV preview generated", map[string]interface{}{
		"duration_ms": time.Since(startTime).Milliseconds(),
		"total_rows":  rowCount,
		"sample_size": len(sampleRows),
	})

	return preview, nil
}

// cleanHeaders cleans and normalizes column headers
func (imp *CSVImporter) cleanHeaders(headers []string) []string {
	cleaned := make([]string, len(headers))
	seen := make(map[string]int)

	for i, header := range headers {
		// Trim and convert to lowercase
		clean := strings.TrimSpace(header)
		clean = strings.ToLower(clean)

		// Replace spaces and special chars with underscores
		clean = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
				return r
			}
			return '_'
		}, clean)

		// Remove consecutive underscores
		clean = strings.ReplaceAll(clean, "__", "_")
		clean = strings.Trim(clean, "_")

		// Handle empty headers
		if clean == "" {
			clean = fmt.Sprintf("column_%d", i+1)
		}

		// Handle duplicates
		if count, exists := seen[clean]; exists {
			seen[clean] = count + 1
			clean = fmt.Sprintf("%s_%d", clean, count+1)
		} else {
			seen[clean] = 0
		}

		cleaned[i] = clean
	}

	return cleaned
}

// detectColumnTypes detects data types for each column
func (imp *CSVImporter) detectColumnTypes(
	headers []string,
	rows [][]string,
	options *CSVImportOptions,
) []CSVColumn {
	columns := make([]CSVColumn, len(headers))

	for i, header := range headers {
		column := CSVColumn{
			Name:         header,
			Index:        i,
			DetectedType: "text", // Default
			SampleValues: make([]string, 0),
			NullCount:    0,
		}

		if !options.DetectTypes {
			columns[i] = column
			continue
		}

		// Collect sample values and detect type
		intCount := 0
		floatCount := 0
		boolCount := 0
		dateCount := 0
		totalCount := 0

		for rowIdx, row := range rows {
			if i >= len(row) {
				column.NullCount++
				continue
			}

			value := strings.TrimSpace(row[i])

			// Check for NULL values
			isNull := false
			for _, nullVal := range options.NullValues {
				if value == nullVal {
					isNull = true
					break
				}
			}

			if isNull {
				column.NullCount++
				continue
			}

			// Add to sample values (first 5)
			if len(column.SampleValues) < 5 {
				column.SampleValues = append(column.SampleValues, value)
			}

			totalCount++

			// Type detection
			if imp.isInteger(value) {
				intCount++
			}
			if imp.isFloat(value) {
				floatCount++
			}
			if imp.isBoolean(value) {
				boolCount++
			}
			if imp.isDate(value) {
				dateCount++
			}

			// Stop sampling after enough rows
			if rowIdx >= 100 {
				break
			}
		}

		// Determine column type based on detection
		if totalCount > 0 {
			threshold := 0.8 // 80% of values must match type

			if float64(boolCount)/float64(totalCount) >= threshold {
				column.DetectedType = "boolean"
			} else if float64(dateCount)/float64(totalCount) >= threshold {
				column.DetectedType = "date"
			} else if float64(intCount)/float64(totalCount) >= threshold {
				column.DetectedType = "integer"
			} else if float64(floatCount)/float64(totalCount) >= threshold {
				column.DetectedType = "float"
			}
		}

		columns[i] = column
	}

	return columns
}

// isInteger checks if a value is an integer
func (imp *CSVImporter) isInteger(value string) bool {
	_, err := strconv.ParseInt(value, 10, 64)
	return err == nil
}

// isFloat checks if a value is a float
func (imp *CSVImporter) isFloat(value string) bool {
	_, err := strconv.ParseFloat(value, 64)
	return err == nil
}

// isBoolean checks if a value is a boolean
func (imp *CSVImporter) isBoolean(value string) bool {
	lower := strings.ToLower(value)
	return lower == "true" || lower == "false" ||
		lower == "yes" || lower == "no" ||
		lower == "1" || lower == "0" ||
		lower == "t" || lower == "f" ||
		lower == "y" || lower == "n"
}

// isDate checks if a value is a date
func (imp *CSVImporter) isDate(value string) bool {
	dateFormats := []string{
		"2006-01-02",
		"2006-01-02 15:04:05",
		"2006/01/02",
		"02-01-2006",
		"02/01/2006",
		"01-02-2006",
		"01/02/2006",
		time.RFC3339,
		time.RFC1123,
	}

	for _, format := range dateFormats {
		_, err := time.Parse(format, value)
		if err == nil {
			return true
		}
	}

	return false
}

// ImportCSV imports CSV file to temporary table
func (imp *CSVImporter) ImportCSV(
	ctx context.Context,
	file multipart.File,
	fileName string,
	options *CSVImportOptions,
	preview *CSVPreview,
) (*CSVImportResult, error) {
	startTime := time.Now()

	// This would integrate with TempTableService
	// For now, return structure showing what would be imported
	result := &CSVImportResult{
		ImportID:     uuid.New(),
		FileName:     fileName,
		RowsImported: preview.TotalRows,
		Columns:      preview.Columns,
		TableName:    fmt.Sprintf("csv_import_%s", uuid.New().String()[:8]),
		Duration:     time.Since(startTime).Milliseconds(),
	}

	return result, nil
}

// ValidateCSVFile validates CSV file before import
func (imp *CSVImporter) ValidateCSVFile(fileHeader *multipart.FileHeader) error {
	// Check file size
	if fileHeader.Size > imp.maxFileSize {
		return fmt.Errorf("file too large: %d bytes (max %d)", fileHeader.Size, imp.maxFileSize)
	}

	// Check file extension
	if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".csv") {
		return errors.New("invalid file type: only .csv files are supported")
	}

	return nil
}

// GetDefaultOptions returns default CSV import options
func (imp *CSVImporter) GetDefaultOptions() *CSVImportOptions {
	return &CSVImportOptions{
		Delimiter:      ',',
		HasHeader:      true,
		SkipRows:       0,
		MaxRows:        0,
		DetectTypes:    true,
		TrimWhitespace: true,
		NullValues:     []string{"", "NULL", "null", "NA", "N/A", "n/a"},
	}
}

// DetectDelimiter attempts to auto-detect CSV delimiter
func (imp *CSVImporter) DetectDelimiter(sample string) rune {
	delimiters := []rune{',', ';', '\t', '|'}
	counts := make(map[rune]int)

	lines := strings.Split(sample, "\n")
	if len(lines) < 2 {
		return ','
	}

	// Count delimiter occurrences in first few lines
	for i := 0; i < min(5, len(lines)); i++ {
		for _, delim := range delimiters {
			counts[delim] += strings.Count(lines[i], string(delim))
		}
	}

	// Find most common delimiter
	maxCount := 0
	bestDelim := ','
	for delim, count := range counts {
		if count > maxCount {
			maxCount = count
			bestDelim = delim
		}
	}

	return bestDelim
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
