@echo off
REM Auto-start Ollama and Backend for Windows

echo ====================================
echo Starting Ollama and Backend...
echo ====================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Docker is not installed or not in PATH
    echo.
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

REM Check if ollama container is running
docker ps --filter name=ollama --format "{{.Names}}" | findstr ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Ollama container not running. Checking if it exists...
    docker ps -a --filter name=ollama --format "{{.Names}}" | findstr ollama >nul 2>&1
    
    if %errorlevel% neq 0 (
        echo.
        echo Creating new Ollama container...
        docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama
        timeout /t 5 /nobreak
    ) else (
        echo.
        echo Starting existing Ollama container...
        docker start ollama
        timeout /t 3 /nobreak
    )
) else (
    echo.
    echo Ollama container is already running!
)

REM Start backend
echo.
echo Starting backend...
cd /d "%~dp0ekg-backend"
call npm run start:dev

pause
