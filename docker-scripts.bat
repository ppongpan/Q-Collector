@echo off
setlocal enabledelayedexpansion

:: Docker management scripts for Form Builder (Windows)

:: Function to print colored output (simplified for Windows)
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:: Check if Docker is installed
:check_docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not installed. Please install Docker Desktop first."
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if !errorlevel! neq 0 (
        call :print_error "Docker Compose is not available. Please install Docker Compose."
        exit /b 1
    )
)

call :print_success "Docker and Docker Compose are available."
goto :eof

:: Development commands
:dev_build
call :print_status "Building development container..."
docker-compose --profile dev build
if %errorlevel% equ 0 (
    call :print_success "Development container built successfully."
) else (
    call :print_error "Failed to build development container."
)
goto :eof

:dev_up
call :print_status "Starting development environment..."
docker-compose --profile dev up -d
if %errorlevel% equ 0 (
    call :print_success "Development environment is running on http://localhost:3000"
) else (
    call :print_error "Failed to start development environment."
)
goto :eof

:dev_down
call :print_status "Stopping development environment..."
docker-compose --profile dev down
if %errorlevel% equ 0 (
    call :print_success "Development environment stopped."
) else (
    call :print_error "Failed to stop development environment."
)
goto :eof

:dev_logs
call :print_status "Showing development logs..."
docker-compose --profile dev logs -f
goto :eof

:: Production commands
:prod_build
call :print_status "Building production container..."
docker-compose --profile prod build
if %errorlevel% equ 0 (
    call :print_success "Production container built successfully."
) else (
    call :print_error "Failed to build production container."
)
goto :eof

:prod_up
call :print_status "Starting production environment..."
docker-compose --profile prod up -d
if %errorlevel% equ 0 (
    call :print_success "Production environment is running on http://localhost:8080"
) else (
    call :print_error "Failed to start production environment."
)
goto :eof

:prod_down
call :print_status "Stopping production environment..."
docker-compose --profile prod down
if %errorlevel% equ 0 (
    call :print_success "Production environment stopped."
) else (
    call :print_error "Failed to stop production environment."
)
goto :eof

:prod_logs
call :print_status "Showing production logs..."
docker-compose --profile prod logs -f
goto :eof

:: Utility commands
:clean
call :print_status "Cleaning up Docker resources..."
docker-compose down --volumes --remove-orphans
docker system prune -f
call :print_success "Docker cleanup completed."
goto :eof

:status
call :print_status "Docker containers status:"
docker-compose ps
goto :eof

:: Help function
:show_help
echo Form Builder Docker Management (Windows)
echo.
echo Development Commands:
echo   docker-scripts.bat dev-build    Build development container
echo   docker-scripts.bat dev-up       Start development environment
echo   docker-scripts.bat dev-down     Stop development environment
echo   docker-scripts.bat dev-logs     Show development logs
echo.
echo Production Commands:
echo   docker-scripts.bat prod-build   Build production container
echo   docker-scripts.bat prod-up      Start production environment
echo   docker-scripts.bat prod-down    Stop production environment
echo   docker-scripts.bat prod-logs    Show production logs
echo.
echo Utility Commands:
echo   docker-scripts.bat status       Show containers status
echo   docker-scripts.bat clean        Clean up Docker resources
echo   docker-scripts.bat help         Show this help
goto :eof

:: Main script logic
if "%1"=="check" (
    call :check_docker
) else if "%1"=="dev-build" (
    call :check_docker
    call :dev_build
) else if "%1"=="dev-up" (
    call :check_docker
    call :dev_up
) else if "%1"=="dev-down" (
    call :dev_down
) else if "%1"=="dev-logs" (
    call :dev_logs
) else if "%1"=="prod-build" (
    call :check_docker
    call :prod_build
) else if "%1"=="prod-up" (
    call :check_docker
    call :prod_up
) else if "%1"=="prod-down" (
    call :prod_down
) else if "%1"=="prod-logs" (
    call :prod_logs
) else if "%1"=="status" (
    call :status
) else if "%1"=="clean" (
    call :clean
) else (
    call :show_help
)