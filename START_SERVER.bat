@echo off
echo ========================================
echo   AegisDesk Server Starter
echo ========================================
echo.
echo Starting server on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

cd /d "%~dp0"
node server.js

pause
