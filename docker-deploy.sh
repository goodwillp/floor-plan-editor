#!/bin/bash

# Floor Plan Editor Docker Deployment Script

set -e

echo "🚀 Floor Plan Editor Docker Deployment"
echo "======================================"

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to build and deploy production
deploy_production() {
    echo "📦 Building production image..."
    docker build -t floor-plan-editor:latest -f Dockerfile .
    
    echo "🚀 Starting production container..."
    docker-compose up -d floor-plan-editor
    
    echo "✅ Production deployment complete!"
    echo "🌐 Application available at: http://localhost:${PROD_PORT:-3000}"
}

# Function to build and deploy development
deploy_development() {
    echo "📦 Building development image..."
    docker build -t floor-plan-editor:dev -f Dockerfile.dev .
    
    echo "🚀 Starting development container..."
    docker-compose up -d floor-plan-editor-dev
    
    echo "✅ Development deployment complete!"
    echo "🌐 Application available at: http://localhost:${DEV_PORT:-5173}"
}

# Function to stop all containers
stop_all() {
    echo "🛑 Stopping all containers..."
    docker-compose down
    echo "✅ All containers stopped"
}

# Function to show logs
show_logs() {
    echo "📋 Container logs:"
    docker-compose logs -f
}

# Function to show status
show_status() {
    echo "📊 Container status:"
    docker-compose ps
}

# Main script logic
case "${1:-help}" in
    "prod"|"production")
        check_docker
        deploy_production
        ;;
    "dev"|"development")
        check_docker
        deploy_development
        ;;
    "both")
        check_docker
        deploy_production
        deploy_development
        ;;
    "stop")
        stop_all
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "help"|*)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  prod, production  - Deploy production version"
        echo "  dev, development  - Deploy development version"
        echo "  both             - Deploy both production and development"
        echo "  stop             - Stop all containers"
        echo "  logs             - Show container logs"
        echo "  status           - Show container status"
        echo "  help             - Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  PROD_PORT        - Production port (default: 3000)"
        echo "  DEV_PORT         - Development port (default: 5173)"
        ;;
esac