@echo off
title EMLAY Backend Server (Person 1)
cd /d "%~dp0backend"
echo ===================================================
echo Starting EMLAY Node.js + Express Backend...
echo Local IP: 172.25.185.197 : Port 5000
echo ===================================================
node server.js
pause
