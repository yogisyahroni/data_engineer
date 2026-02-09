#!/usr/bin/env pwsh

# Code Quality Dashboard
# Run this daily to track cleanup progress

Write-Host "🧹 CODE QUALITY CLEANUP - DASHBOARD" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

$backendDir = "e:\antigraviti google\inside engine\insight-engine-ai-ui\backend"
$frontendDir = "e:\antigraviti google\inside engine\insight-engine-ai-ui\frontend"

# Function to count violations
function Count-Violations {
    param($pattern, $path, $includes)
    
    if ($includes) {
        $count = (Get-ChildItem -Path $path -Recurse -Include $includes -ErrorAction SilentlyContinue | 
            Select-String -Pattern $pattern -ErrorAction SilentlyContinue).Count
    }
    else {
        $count = (Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue | 
            Select-String -Pattern $pattern -ErrorAction SilentlyContinue).Count
    }
    
    return $count
}

Write-Host "📊 BACKEND VIOLATIONS" -ForegroundColor Yellow
Write-Host "--------------------" -ForegroundColor Yellow

# Backend: log.Print*
$logPrint = Count-Violations "log\.Print" $backendDir "*.go"
$logPrintStatus = if ($logPrint -le 16) { "✅" } else { "❌" }
Write-Host "$logPrintStatus log.Print*: $logPrint (Target: ≤16 exempt)" -ForegroundColor $(if ($logPrint -le 16) { "Green" } else { "Red" })

# Backend: fmt.Print*
$fmtPrint = Count-Violations "fmt\.Print" $backendDir "*.go"
$fmtPrintStatus = if ($fmtPrint -eq 0) { "✅" } else { "❌" }
Write-Host "$fmtPrintStatus fmt.Print*: $fmtPrint (Target: 0)" -ForegroundColor $(if ($fmtPrint -eq 0) { "Green" } else { "Red" })

# Backend: panic()
$panic = Count-Violations "panic\(" $backendDir "*.go"
$panicStatus = if ($panic -eq 0) { "✅" } else { "🔴" }
Write-Host "$panicStatus panic(): $panic (Target: 0)" -ForegroundColor $(if ($panic -eq 0) { "Green" } else { "Red" })

Write-Host "`n📊 FRONTEND VIOLATIONS" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Yellow

# Frontend: console.log
$consoleLog = Count-Violations "console\.log" $frontendDir @("*.ts", "*.tsx")
Write-Host "⏳ console.log: $consoleLog" -ForegroundColor Gray

# Frontend: console.error
$consoleError = Count-Violations "console\.error" $frontendDir @("*.ts", "*.tsx")
Write-Host "⏳ console.error: $consoleError" -ForegroundColor Gray

# Frontend: console.warn
$consoleWarn = Count-Violations "console\.warn" $frontendDir @("*.ts", "*.tsx")
Write-Host "⏳ console.warn: $consoleWarn" -ForegroundColor Gray

$totalConsole = $consoleLog + $consoleError + $consoleWarn
$consoleStatus = if ($totalConsole -lt 1000) { "✅" } else { "⏳" }
Write-Host "$consoleStatus Total console.*: $totalConsole (Target: <1000 for production code)" -ForegroundColor $(if ($totalConsole -lt 1000) { "Green" } else { "Yellow" })

Write-Host "`n📈 OVERALL PROGRESS" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan

# Calculate overall completion
$totalViolations = 23 + 1 + 800  # Estimated production console logs
$fixedViolations = (23 - $fmtPrint) + (1 - $panic) + (800 - [Math]::Min(800, ($totalConsole - 3500)))

$percentage = [Math]::Round(($fixedViolations / $totalViolations) * 100, 1)

Write-Host "Backend Quality: " -NoNewline
if ($fmtPrint -eq 0 -and $panic -eq 0) {
    Write-Host "100% ✅" -ForegroundColor Green
}
else {
    $backendPct = [Math]::Round(((23 - $fmtPrint + 1 - $panic) / 24) * 100, 1)
    Write-Host "$backendPct% ⏳" -ForegroundColor Yellow
}

Write-Host "Overall Progress: $percentage% " -NoNewline
if ($percentage -ge 90) {
    Write-Host "🎉" -ForegroundColor Green
}
elseif ($percentage -ge 50) {
    Write-Host "⏳" -ForegroundColor Yellow
}
else {
    Write-Host "🔴" -ForegroundColor Red
}

Write-Host "`n🎯 NEXT ACTIONS" -ForegroundColor Cyan
Write-Host "---------------" -ForegroundColor Cyan

if ($panic -gt 0) {
    Write-Host "🔴 CRITICAL: Fix panic() in export_service.go (30 min)" -ForegroundColor Red
}

if ($fmtPrint -gt 0) {
    Write-Host "🔴 HIGH: Migrate $fmtPrint fmt.Print* statements (3 hours)" -ForegroundColor Red
}

if ($fmtPrint -eq 0 -and $panic -eq 0) {
    Write-Host "✅ Backend is clean! Move to frontend logging infrastructure" -ForegroundColor Green
}

Write-Host "`n📅 Last Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "Run this script daily to track progress!`n" -ForegroundColor Gray
