#!/bin/bash

# Auto-start Ollama and Backend for Linux/Mac

echo "===================================="
echo "Starting Ollama and Backend..."
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker is not installed"
    echo ""
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    echo ""
    exit 1
fi

echo "✅ Docker found: $(docker --version)"
echo ""

# Check if ollama container is running
echo "Checking Ollama status..."

if ! docker ps --filter name=ollama --format "{{.Names}}" | grep -q ollama; then
    echo "⚠️  Ollama container not running"
    
    # Check if container exists but is stopped
    if docker ps -a --filter name=ollama --format "{{.Names}}" | grep -q ollama; then
        echo "Starting existing Ollama container..."
        docker start ollama
        sleep 3
    else
        echo "Creating new Ollama container..."
        docker run -d \
            --name ollama \
            -p 11434:11434 \
            -v ollama:/root/.ollama \
            ollama/ollama
        
        echo "Waiting for Ollama to be ready..."
        sleep 5
    fi
else
    echo "✅ Ollama is running!"
fi

echo ""
echo "===================================="
echo "Starting Backend Server..."
echo "===================================="
echo ""

# Navigate to backend and start
cd "$(dirname "$0")/ekg-backend"

if [ -f "package.json" ]; then
    npm run start:dev
else
    echo "❌ ERROR: package.json not found in ekg-backend"
    exit 1
fi
