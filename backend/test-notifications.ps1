# PowerShell script for testing email notifications
# Run with: .\test-notifications.ps1

Write-Host "🧪 Testing email notifications..." -ForegroundColor Cyan
Write-Host ""

# Test Budget Alerts
Write-Host "Testing Budget Alerts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/notifications/check-budgets" -Method POST
    Write-Host "✅ Budget Alerts Test Result:" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Error testing budget alerts:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "---" -ForegroundColor Gray
Write-Host ""

# Uncomment to test monthly reports
# Write-Host "Testing Monthly Reports..." -ForegroundColor Yellow
# try {
#     $response = Invoke-RestMethod -Uri "http://localhost:5000/api/notifications/send-monthly-reports" -Method POST
#     Write-Host "✅ Monthly Reports Test Result:" -ForegroundColor Green
#     $response | ConvertTo-Json
# } catch {
#     Write-Host "❌ Error testing monthly reports:" -ForegroundColor Red
#     Write-Host $_.Exception.Message
# }

