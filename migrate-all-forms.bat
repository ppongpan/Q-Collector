@echo off
REM ========================================================
REM Migration Script - Retranslate All Existing Forms
REM ========================================================
REM
REM This script will:
REM 1. Check prerequisites
REM 2. Backup database
REM 3. Preview changes (dry-run)
REM 4. Execute migration
REM 5. Verify results
REM
REM Version: 1.0.0
REM Date: 2025-10-02
REM ========================================================

echo.
echo ========================================================
echo   Q-Collector Form Migration Script
echo   Retranslate All Existing Forms
echo ========================================================
echo.

REM Change to project directory
cd /d "%~dp0"

REM ========================================================
REM Step 1: Check Prerequisites
REM ========================================================

echo [Step 1/5] Checking prerequisites...
echo.

REM Check if Docker is running
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

REM Check if PostgreSQL is running
docker-compose ps postgres | findstr "Up" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL is not running
    echo.
    echo Starting PostgreSQL...
    docker-compose up -d postgres
    echo Waiting for PostgreSQL to be ready...
    timeout /t 10 /nobreak >nul
    echo.
)

echo   [OK] PostgreSQL is ready
echo.

REM Check if LibreTranslate is running
curl -s http://localhost:5555/languages >nul 2>&1
if errorlevel 1 (
    echo [WARNING] LibreTranslate is not running
    echo.
    echo Starting LibreTranslate...
    docker-compose up -d libretranslate
    echo Waiting for LibreTranslate to be ready (this may take 30-60 seconds)...
    timeout /t 60 /nobreak >nul
    echo.
)

echo   [OK] LibreTranslate is ready
echo.

REM ========================================================
REM Step 2: Check Existing Forms
REM ========================================================

echo.
echo ========================================================
echo [Step 2/5] Checking existing forms...
echo ========================================================
echo.

node backend\scripts\check-existing-forms.js

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to check existing forms
    echo.
    echo Please check:
    echo   1. PostgreSQL is running
    echo   2. Database credentials in .env are correct
    echo   3. Database exists
    echo.
    pause
    exit /b 1
)

echo.
echo.
echo Press any key to continue to backup...
pause >nul

REM ========================================================
REM Step 3: Create Backup
REM ========================================================

echo.
echo ========================================================
echo [Step 3/5] Creating database backup...
echo ========================================================
echo.

node backend\scripts\backup-database.js

if errorlevel 1 (
    echo.
    echo [ERROR] Backup failed!
    echo.
    echo Migration aborted for safety.
    echo.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Backup completed
echo.
echo Press any key to continue to dry-run preview...
pause >nul

REM ========================================================
REM Step 4: Dry-Run Preview
REM ========================================================

echo.
echo ========================================================
echo [Step 4/5] Preview changes (Dry-Run)...
echo ========================================================
echo.
echo This will show what changes will be made
echo WITHOUT actually modifying the database.
echo.

node backend\scripts\migrate-retranslate-forms.js --dry-run

if errorlevel 1 (
    echo.
    echo [ERROR] Dry-run failed!
    echo.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo.
echo ========================================================
echo   IMPORTANT: Review the preview above
echo ========================================================
echo.
echo Do you want to proceed with the actual migration?
echo.
set /p PROCEED="Type 'YES' to continue (anything else to cancel): "

if /i not "%PROCEED%"=="YES" (
    echo.
    echo [CANCELLED] Migration cancelled by user.
    echo.
    pause
    exit /b 0
)

REM ========================================================
REM Step 5: Execute Migration
REM ========================================================

echo.
echo ========================================================
echo [Step 5/5] Executing migration...
echo ========================================================
echo.
echo This will modify the database.
echo Please wait...
echo.

node backend\scripts\migrate-retranslate-forms.js --force

if errorlevel 1 (
    echo.
    echo [ERROR] Migration failed!
    echo.
    echo You can rollback using:
    echo   node backend\scripts\rollback-migration.js backups\backup-YYYY-MM-DDTHH-MM-SS.json
    echo.
    pause
    exit /b 1
)

REM ========================================================
REM Step 6: Verify Results
REM ========================================================

echo.
echo ========================================================
echo [VERIFY] Checking migrated forms...
echo ========================================================
echo.

node backend\scripts\check-existing-forms.js

echo.
echo ========================================================
echo   Migration Complete!
echo ========================================================
echo.
echo Next steps:
echo   1. Test your application
echo   2. Update PowerBI connections (if any)
echo   3. Notify your team about table name changes
echo.
echo Backup files are stored in: backups\
echo.
echo If you need to rollback, use:
echo   node backend\scripts\rollback-migration.js backups\backup-YYYY-MM-DDTHH-MM-SS.json
echo.
pause
