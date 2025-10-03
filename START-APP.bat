@echo off
REM ========================================================
REM Q-Collector Application Startup Script
REM ========================================================
REM
REM This script will:
REM 1. Check if Docker is running
REM 2. Start Docker services (PostgreSQL, Redis, MinIO, LibreTranslate)
REM 3. Start Backend API server
REM 4. Start Frontend development server
REM
REM Version: 1.0.0
REM Date: 2025-10-02
REM ========================================================

echo.
echo ========================================================
echo   Q-Collector Application Startup
echo ========================================================
echo.

REM Change to project directory
cd /d "%~dp0"

REM ========================================================
REM Step 1: Check Docker
REM ========================================================

echo [Step 1/4] Checking Docker...
echo.

docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please:
    echo   1. Open Docker Desktop
    echo   2. Wait until Docker is ready (green icon)
    echo   3. Run this script again
    echo.
    pause
    exit /b 1
)

echo   [OK] Docker is running
echo.

REM ========================================================
REM Step 2: Start Docker Services
REM ========================================================

echo [Step 2/4] Starting Docker services...
echo.

echo Starting PostgreSQL, Redis, MinIO, and LibreTranslate...
docker-compose up -d postgres redis minio libretranslate

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start Docker services
    echo.
    pause
    exit /b 1
)

echo.
echo   [OK] Docker services started
echo.
echo Waiting for services to be ready (30 seconds)...
timeout /t 30 /nobreak >nul
echo.

REM ========================================================
REM Step 3: Start Backend Server
REM ========================================================

echo [Step 3/4] Starting Backend API server...
echo.

cd backend
start "Q-Collector Backend" cmd /k "npm start"
cd ..

echo   [OK] Backend server starting...
echo   Backend will run on: http://localhost:5000
echo.

timeout /t 5 /nobreak >nul

REM ========================================================
REM Step 4: Start Frontend Server
REM ========================================================

echo [Step 4/4] Starting Frontend development server...
echo.

start "Q-Collector Frontend" cmd /k "npm start"

echo   [OK] Frontend server starting...
echo   Frontend will run on: http://localhost:3000
echo.

echo ========================================================
echo   Application Started!
echo ========================================================
echo.
echo Services:
echo   - Frontend:      http://localhost:3000
echo   - Backend API:   http://localhost:5000
echo   - PostgreSQL:    localhost:5432
echo   - Redis:         localhost:6379
echo   - MinIO:         http://localhost:9000
echo   - LibreTranslate: http://localhost:5555
echo.
echo Two command windows will open:
echo   1. Backend API server (port 5000)
echo   2. Frontend dev server (port 3000)
echo.
echo To stop the application:
echo   - Close both command windows
echo   - Run: docker-compose down
echo.
pause
