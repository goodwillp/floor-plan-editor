@echo off
REM Floor Plan Editor Docker Deployment Script for Windows

echo 🚀 Floor Plan Editor Docker Deployment
echo ======================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)
echo ✅ Docker is running

REM Parse command line argument
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=help

if "%COMMAND%"=="prod" goto :deploy_production
if "%COMMAND%"=="production" goto :deploy_production
if "%COMMAND%"=="dev" goto :deploy_development
if "%COMMAND%"=="development" goto :deploy_development
if "%COMMAND%"=="both" goto :deploy_both
if "%COMMAND%"=="stop" goto :stop_all
if "%COMMAND%"=="logs" goto :show_logs
if "%COMMAND%"=="status" goto :show_status
goto :show_help

:deploy_production
echo 📦 Building production image...
docker build -t floor-plan-editor:latest -f Dockerfile .
if %errorlevel% neq 0 exit /b 1

echo 🚀 Starting production container...
docker-compose up -d floor-plan-editor
if %errorlevel% neq 0 exit /b 1

echo ✅ Production deployment complete!
if not "%PROD_PORT%"=="" (
    echo 🌐 Application available at: http://localhost:%PROD_PORT%
) else (
    echo 🌐 Application available at: http://localhost:3000
)
goto :end

:deploy_development
echo 📦 Building development image...
docker build -t floor-plan-editor:dev -f Dockerfile.dev .
if %errorlevel% neq 0 exit /b 1

echo 🚀 Starting development container...
docker-compose up -d floor-plan-editor-dev
if %errorlevel% neq 0 exit /b 1

echo ✅ Development deployment complete!
if not "%DEV_PORT%"=="" (
    echo 🌐 Application available at: http://localhost:%DEV_PORT%
) else (
    echo 🌐 Application available at: http://localhost:5173
)
goto :end

:deploy_both
call :deploy_production
call :deploy_development
goto :end

:stop_all
echo 🛑 Stopping all containers...
docker-compose down
echo ✅ All containers stopped
goto :end

:show_logs
echo 📋 Container logs:
docker-compose logs -f
goto :end

:show_status
echo 📊 Container status:
docker-compose ps
goto :end

:show_help
echo Usage: %0 [command]
echo.
echo Commands:
echo   prod, production  - Deploy production version
echo   dev, development  - Deploy development version
echo   both             - Deploy both production and development
echo   stop             - Stop all containers
echo   logs             - Show container logs
echo   status           - Show container status
echo   help             - Show this help message
echo.
echo Environment variables:
echo   PROD_PORT        - Production port (default: 3000)
echo   DEV_PORT         - Development port (default: 5173)

:end