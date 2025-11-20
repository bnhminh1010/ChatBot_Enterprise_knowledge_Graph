#!/usr/bin/env pwsh
<#
  .SYNOPSIS
  Auto-start Ollama and Backend for Windows PowerShell
  
  .DESCRIPTION
  This script automatically:
  1. Checks if Docker is installed
  2. Starts/creates Ollama container
  3. Starts the backend server
  
  .USAGE
  .\start-dev.ps1
#>

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting Ollama and Backend..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ ERROR: Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if ollama container is running
Write-Host ""
Write-Host "Checking Ollama status..." -ForegroundColor Cyan

$ollamaRunning = docker ps --filter name=ollama --format "{{.Names}}" | Select-String "ollama"

if (-not $ollamaRunning) {
    Write-Host "⚠️  Ollama container not running" -ForegroundColor Yellow
  
    # Check if container exists but is stopped
    $ollamaExists = docker ps -a --filter name=ollama --format "{{.Names}}" | Select-String "ollama"
  
    if (-not $ollamaExists) {
        Write-Host "Creating new Ollama container..." -ForegroundColor Cyan
        docker run -d `
            --name ollama `
            -p 11434:11434 `
            -v ollama:/root/.ollama `
            ollama/ollama
    
        Write-Host "Waiting for Ollama to be ready..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
    }
    else {
        Write-Host "Starting existing Ollama container..." -ForegroundColor Cyan
        docker start ollama
        Start-Sleep -Seconds 3
    }
}
else {
    Write-Host "✅ Ollama is running!" -ForegroundColor Green
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to backend and start
Set-Location -Path (Join-Path $PSScriptRoot "ekg-backend")

if (Test-Path "package.json") {
    npm run start:dev
}
else {
    Write-Host "❌ ERROR: package.json not found in ekg-backend" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
