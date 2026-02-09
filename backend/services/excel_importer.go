package services

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ExcelImportOptions represents Excel import configuration
type ExcelImportOptions struct {
	SheetName      string   `json:"sheetName"`      // Specific sheet to import (empty = active sheet)
	SheetIndex     int      `json:"sheetIndex"`     // Sheet index (0-based)
	HasHeader      bool     `json:"hasHeader"`      // First row is header
	SkipRows       int      `json:"skipRows"`       // Rows to skip at start
	MaxRows        int      `json:"maxRows"`        // Max rows to import (0 = all)
	DetectTypes    bool     `json:"detectTypes"`    // Auto-detect column types
	TrimWhitespace bool     `json:"trimWhitespace"` // Trim spaces from values
	NullValues     []string `json:"nullValues"`     // Values to treat as NULL
}

// ExcelSheet represents a sheet in the Excel file
type ExcelSheet struct {
	Name     string `json:"name"`
	Index    int    `json:"index"`
	RowCount int    `json:"rowCount"`
	ColCount int    `json:"colCount"`
}

// ExcelPreview represents a preview of Excel data
type ExcelPreview struct {
	Sheets      []ExcelSheet `json:"sheets"`
	ActiveSheet string       `json:"activeSheet"`
	Columns     []CSVColumn  `json:"columns"` // Reuse CSVColumn type
	Rows        [][]string   `json:"rows"`
	TotalRows   int          `json:"totalRows"`
	SampleSize  int          `json:"sampleSize"`
	HasHeader   bool         `json:"hasHeader"`
}

// ExcelImportResult represents the result of Excel import
type ExcelImportResult struct {
	ImportID     uuid.UUID   `json:"importId"`
	FileName     string      `json:"fileName"`
	SheetName    string      `json:"sheetName"`
	RowsImported int         `json:"rowsImported"`
	Columns      []CSVColumn `json:"columns"`
	Errors       []string    `json:"errors,omitempty"`
	TableName    string      `json:"tableName"`
	Duration     int64       `json:"durationMs"`
}

// ExcelImporter handles Excel file imports (.xlsx, .xls)
type ExcelImporter struct {
	maxFileSize int64
	sampleSize  int
	csvImporter *CSVImporter // Reuse CSV type detection logic
}

// NewExcelImporter creates a new Excel importer
func NewExcelImporter() *ExcelImporter {
	return &ExcelImporter{
		maxFileSize: 100 * 1024 * 1024, // 100 MB
		sampleSize:  100,
		csvImporter: NewCSVImporter(),
	}
}

// ParseExcelPreview generates a preview of Excel file
func (imp *ExcelImporter) ParseExcelPreview(
	ctx context.Context,
	file multipart.File,
	fileName string,
	options *ExcelImportOptions,
) (*ExcelPreview, error) {
	startTime := time.Now()

	// Set default options
	if options == nil {
		options = &ExcelImportOptions{
			HasHeader:      true,
			DetectTypes:    true,
			TrimWhitespace: true,
			NullValues:     []string{"", "NULL", "null", "NA", "N/A", "n/a"},
		}
	}

	// Open Excel file
	xlsxFile, err := excelize.OpenReader(file)
	if err != nil {
		return nil, fmt.Errorf("failed to open Excel file: %w", err)
	}
	defer xlsxFile.Close()

	// Get all sheets
	sheetList := xlsxFile.GetSheetList()
	if len(sheetList) == 0 {
		return nil, errors.New("Excel file has no sheets")
	}

	sheets := make([]ExcelSheet, 0, len(sheetList))
	for i, sheetName := range sheetList {
		rows, err := xlsxFile.GetRows(sheetName)
		if err != nil {
			continue
		}

		colCount := 0
		if len(rows) > 0 {
			colCount = len(rows[0])
		}

		sheets = append(sheets, ExcelSheet{
			Name:     sheetName,
			Index:    i,
			RowCount: len(rows),
			ColCount: colCount,
		})
	}

	// Determine which sheet to preview
	var targetSheet string
	if options.SheetName != "" {
		targetSheet = options.SheetName
	} else if options.SheetIndex >= 0 && options.SheetIndex < len(sheetList) {
		targetSheet = sheetList[options.SheetIndex]
	} else {
		// Use active sheet
		targetSheet = xlsxFile.GetSheetName(xlsxFile.GetActiveSheetIndex())
	}

	// Read rows from target sheet
	allRows, err := xlsxFile.GetRows(targetSheet)
	if err != nil {
		return nil, fmt.Errorf("failed to read sheet %s: %w", targetSheet, err)
	}

	// Skip initial rows
	if options.SkipRows > 0 && options.SkipRows < len(allRows) {
		allRows = allRows[options.SkipRows:]
	}

	if len(allRows) == 0 {
		return nil, errors.New("no data rows found in sheet")
	}

	// Extract header
	var headers []string
	var dataRows [][]string

	if options.HasHeader && len(allRows) > 0 {
		headers = allRows[0]
		dataRows = allRows[1:]
	} else {
		// Generate column names
		if len(allRows) > 0 {
			headers = make([]string, len(allRows[0]))
			for i := range headers {
				headers[i] = fmt.Sprintf("column_%d", i+1)
			}
		}
		dataRows = allRows
	}

	// Clean headers
	headers = imp.csvImporter.cleanHeaders(headers)

	// Get sample rows
	maxSample := imp.sampleSize
	if options.MaxRows > 0 && options.MaxRows < maxSample {
		maxSample = options.MaxRows
	}
	if len(dataRows) > maxSample {
		dataRows = dataRows[:maxSample]
	}

	// Normalize row lengths (Excel can have ragged rows)
	normalizedRows := imp.normalizeRowLengths(dataRows, len(headers))

	// Detect column types
	columns := imp.csvImporter.detectColumnTypes(headers, normalizedRows, &CSVImportOptions{
		DetectTypes:    options.DetectTypes,
		TrimWhitespace: options.TrimWhitespace,
		NullValues:     options.NullValues,
	})

	preview := &ExcelPreview{
		Sheets:      sheets,
		ActiveSheet: targetSheet,
		Columns:     columns,
		Rows:        normalizedRows,
		TotalRows:   len(allRows) - 1, // Exclude header
		SampleSize:  len(normalizedRows),
		HasHeader:   options.HasHeader,
	}

	LogDebug("excel_preview_performance", "Excel preview generated", map[string]interface{}{
		"duration_ms": time.Since(startTime).Milliseconds(),
		"sheet_name":  targetSheet,
		"total_rows":  len(allRows) - 1,
		"sample_size": len(normalizedRows),
	})

	return preview, nil
}

// normalizeRowLengths ensures all rows have the same number of columns
func (imp *ExcelImporter) normalizeRowLengths(rows [][]string, targetLength int) [][]string {
	normalized := make([][]string, len(rows))

	for i, row := range rows {
		if len(row) < targetLength {
			// Pad with empty strings
			padded := make([]string, targetLength)
			copy(padded, row)
			normalized[i] = padded
		} else if len(row) > targetLength {
			// Truncate
			normalized[i] = row[:targetLength]
		} else {
			normalized[i] = row
		}
	}

	return normalized
}

// ImportExcel imports Excel file to temporary table
func (imp *ExcelImporter) ImportExcel(
	ctx context.Context,
	file multipart.File,
	fileName string,
	options *ExcelImportOptions,
	preview *ExcelPreview,
) (*ExcelImportResult, error) {
	startTime := time.Now()

	// This would integrate with TempTableService
	result := &ExcelImportResult{
		ImportID:     uuid.New(),
		FileName:     fileName,
		SheetName:    preview.ActiveSheet,
		RowsImported: preview.TotalRows,
		Columns:      preview.Columns,
		TableName:    fmt.Sprintf("excel_import_%s", uuid.New().String()[:8]),
		Duration:     time.Since(startTime).Milliseconds(),
	}

	return result, nil
}

// ValidateExcelFile validates Excel file before import
func (imp *ExcelImporter) ValidateExcelFile(fileHeader *multipart.FileHeader) error {
	// Check file size
	if fileHeader.Size > imp.maxFileSize {
		return fmt.Errorf("file too large: %d bytes (max %d)", fileHeader.Size, imp.maxFileSize)
	}

	// Check file extension
	ext := strings.ToLower(fileHeader.Filename)
	if !strings.HasSuffix(ext, ".xlsx") && !strings.HasSuffix(ext, ".xls") {
		return errors.New("invalid file type: only .xlsx and .xls files are supported")
	}

	return nil
}

// GetDefaultOptions returns default Excel import options
func (imp *ExcelImporter) GetDefaultOptions() *ExcelImportOptions {
	return &ExcelImportOptions{
		SheetName:      "",
		SheetIndex:     -1,
		HasHeader:      true,
		SkipRows:       0,
		MaxRows:        0,
		DetectTypes:    true,
		TrimWhitespace: true,
		NullValues:     []string{"", "NULL", "null", "NA", "N/A", "n/a"},
	}
}

// GetSheetNames returns the list of sheet names in an Excel file
func (imp *ExcelImporter) GetSheetNames(file multipart.File) ([]ExcelSheet, error) {
	xlsxFile, err := excelize.OpenReader(file)
	if err != nil {
		return nil, fmt.Errorf("failed to open Excel file: %w", err)
	}
	defer xlsxFile.Close()

	sheetList := xlsxFile.GetSheetList()
	sheets := make([]ExcelSheet, len(sheetList))

	for i, name := range sheetList {
		rows, _ := xlsxFile.GetRows(name)
		colCount := 0
		if len(rows) > 0 {
			colCount = len(rows[0])
		}

		sheets[i] = ExcelSheet{
			Name:     name,
			Index:    i,
			RowCount: len(rows),
			ColCount: colCount,
		}
	}

	return sheets, nil
}

// ConvertRangeToRows converts Excel range (e.g., "A1:D10") to row data
func (imp *ExcelImporter) ConvertRangeToRows(
	xlsxFile *excelize.File,
	sheetName string,
	rangeRef string,
) ([][]string, error) {
	// Get rows within range
	rows, err := xlsxFile.GetRows(sheetName)
	if err != nil {
		return nil, err
	}

	// If no range specified, return all rows
	if rangeRef == "" {
		return rows, nil
	}

	// Parse range (simplified - full implementation would parse A1:D10 notation)
	// For now, return all rows
	return rows, nil
}
