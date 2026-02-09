# Logging Audit Report - Generated: 2026-02-09

## Summary

This script scans for unstructured logging patterns that need migration to structured JSON logging.

## Patterns to Find

1. `log.Println` - Standard library logging
2. `log.Printf` - Formatted standard library logging
3. `log.Fatalf` - Fatal logging
4. `fmt.Printf` - Print statements (review needed - some valid for non-logging)

---

## PowerShell Commands

### Find all log.Println usage

```powershell
Get-ChildItem -Path backend -Recurse -Filter *.go | Select-String "log\.Println" | Select-Object Path,LineNumber,Line | Format-Table -AutoSize
```

### Find all log.Printf usage

```powershell
Get-ChildItem -Path backend -Recurse -Filter *.go | Select-String "log\.Printf" | Select-Object Path,LineNumber,Line | Format-Table -AutoSize
```

### Find all log.Fatalf usage

```powershell
Get-ChildItem -Path backend -Recurse -Filter *.go | Select-String "log\.Fatalf" | Select-Object Path,LineNumber,Line | Format-Table -AutoSize
```

### Count total violations

```powershell
$logPrintln = (Get-ChildItem -Path backend -Recurse -Filter *.go | Select-String "log\.Println").Count
$logPrintf = (Get-ChildItem -Path backend -Recurse -Filter *.go | Select-String "log\.Printf").Count
$logFatalf = (Get-ChildItem -Path backend -Recurse -Filter *.go | Select-String "log\.Fatalf").Count
Write-Host "log.Println: $logPrintln"
Write-Host "log.Printf: $logPrintf"
Write-Host "log.Fatalf: $logFatalf"
Write-Host "Total violations: $($logPrintln + $logPrintf + $logFatalf)"
```

### Generate file-by-file report

```powershell
$files = Get-ChildItem -Path backend -Recurse -Filter *.go
$report = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $printlnCount = ([regex]::Matches($content, 'log\.Println')).Count
    $printfCount = ([regex]::Matches($content, 'log\.Printf')).Count
    $fatalfCount = ([regex]::Matches($content, 'log\.Fatalf')).Count
    
    $totalViolations = $printlnCount + $printfCount + $fatalfCount
    
    if ($totalViolations -gt 0) {
        $report += [PSCustomObject]@{
            File = $file.Name
            Path = $file.FullName
            'log.Println' = $printlnCount
            'log.Printf' = $printfCount
            'log.Fatalf' = $fatalfCount
            Total = $totalViolations
        }
    }
}

$report | Sort-Object -Property Total -Descending | Format-Table -AutoSize
$report | Export-Csv -Path "logging_violations_report.csv" -NoTypeInformation
Write-Host "`nReport saved to logging_violations_report.csv"
```

---

## Manual Execution Steps

1. Open PowerShell in project root
2. Run count command to see total violations
3. Run file-by-file report to prioritize migration
4. Use LOGGING_MIGRATION.md patterns to fix each file
5. Re-run audit after each batch of fixes
6. Verify build passes after each migration

---

## Quick Reference: Replacement Patterns

### Pattern: log.Println

```go
// Before
log.Println("Operation successful")

// After
services.LogInfo("operation_name", "Operation successful", nil)
```

### Pattern: log.Printf with error

```go
// Before
log.Printf("Failed to execute: %v", err)

// After
services.LogError("operation_name", "Failed to execute",map[string]interface{}{"error": err})
```

### Pattern: log.Fatalf

```go
// Before
log.Fatalf("Critical failure: %v", err)

// After
services.LogFatal("operation_name", "Critical failure", map[string]interface{}{"error": err})
```
