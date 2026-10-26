Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   MarsNova Full-Stack Launcher (Frontend + Drogon C++)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

Write-Host "[1/2] Starting C++ Drogon Backend on port 8081..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\backend`" && .\marsnova_backend.exe" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Vite Frontend on port 5173..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Opening MarsNova in default browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   MarsNova Platform Online:" -ForegroundColor Green
Write-Host "   - Website:      http://localhost:5173" -ForegroundColor White
Write-Host "   - Admin Portal: http://localhost:5173/admin" -ForegroundColor White
Write-Host "   - Drogon API:   http://localhost:8081/api/v1" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
