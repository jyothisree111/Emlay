@echo off
title EMLAY Hackathon Suite Launcher
echo ===================================================
echo   LAUNCHING EMLAY FULL-STACK SUITE
echo ===================================================
echo 1. Launching Backend on Port 5000...
start "EMLAY Backend Server (5000)" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 >nul

echo 2. Launching React Website on Port 3000...
start "EMLAY Website (3000)" cmd /k "cd /d %~dp0website && npm.cmd run dev"

echo.
echo ===================================================
echo All services launched!
echo Backend:  http://172.25.185.197:5000
echo Website:  http://172.25.185.197:3000
echo Flutter:  Run 'flutter run' in this directory
echo ===================================================
pause
