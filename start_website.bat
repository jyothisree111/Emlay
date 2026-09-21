@echo off
title EMLAY React Website (Person 3)
cd /d "%~dp0website"
echo ===================================================
echo Starting EMLAY React + Vite Website...
echo Host: 0.0.0.0 : Port 3000
echo Network: http://172.25.185.197:3000
echo ===================================================
npm.cmd run dev
pause
