@echo off
title MarsNova Full-Stack Platform
color 0b
echo ========================================================
echo   MarsNova Full-Stack Launcher (Frontend + Drogon C++)
echo ========================================================
echo.

echo [1/2] Starting C++ Drogon Backend Engine (Port 8081)...
start "MarsNova Backend (Port 8081)" /d "%~dp0backend" cmd /k "marsnova_backend.exe"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite Frontend Server (Port 5173)...
start "MarsNova Frontend (Port 5173)" /d "%~dp0" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Launching MarsNova in default browser...
start http://localhost:5173

echo.
echo ========================================================
echo   MarsNova Platform Online:
echo   - Website:      http://localhost:5173
echo   - Admin Portal: http://localhost:5173/admin
echo   - Drogon API:   http://localhost:8081/api/v1
echo ========================================================
echo.
pause
