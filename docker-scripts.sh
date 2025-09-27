#!/bin/bash

# Docker management scripts for Form Builder

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi

    print_success "Docker and Docker Compose are available."
}

# Development commands
dev_build() {
    print_status "Building development container..."
    docker-compose --profile dev build
    print_success "Development container built successfully."
}

dev_up() {
    print_status "Starting development environment..."
    docker-compose --profile dev up -d
    print_success "Development environment is running on http://localhost:3000"
}

dev_down() {
    print_status "Stopping development environment..."
    docker-compose --profile dev down
    print_success "Development environment stopped."
}

dev_logs() {
    print_status "Showing development logs..."
    docker-compose --profile dev logs -f
}

# Production commands
prod_build() {
    print_status "Building production container..."
    docker-compose --profile prod build
    print_success "Production container built successfully."
}

prod_up() {
    print_status "Starting production environment..."
    docker-compose --profile prod up -d
    print_success "Production environment is running on http://localhost:8080"
}

prod_down() {
    print_status "Stopping production environment..."
    docker-compose --profile prod down
    print_success "Production environment stopped."
}

prod_logs() {
    print_status "Showing production logs..."
    docker-compose --profile prod logs -f
}

# Utility commands
clean() {
    print_status "Cleaning up Docker resources..."
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    print_success "Docker cleanup completed."
}

status() {
    print_status "Docker containers status:"
    docker-compose ps
}

# Help function
show_help() {
    echo "Form Builder Docker Management"
    echo ""
    echo "Development Commands:"
    echo "  ./docker-scripts.sh dev-build    Build development container"
    echo "  ./docker-scripts.sh dev-up       Start development environment"
    echo "  ./docker-scripts.sh dev-down     Stop development environment"
    echo "  ./docker-scripts.sh dev-logs     Show development logs"
    echo ""
    echo "Production Commands:"
    echo "  ./docker-scripts.sh prod-build   Build production container"
    echo "  ./docker-scripts.sh prod-up      Start production environment"
    echo "  ./docker-scripts.sh prod-down    Stop production environment"
    echo "  ./docker-scripts.sh prod-logs    Show production logs"
    echo ""
    echo "Utility Commands:"
    echo "  ./docker-scripts.sh status       Show containers status"
    echo "  ./docker-scripts.sh clean        Clean up Docker resources"
    echo "  ./docker-scripts.sh help         Show this help"
}

# Main script logic
case "$1" in
    check)
        check_docker
        ;;
    dev-build)
        check_docker
        dev_build
        ;;
    dev-up)
        check_docker
        dev_up
        ;;
    dev-down)
        dev_down
        ;;
    dev-logs)
        dev_logs
        ;;
    prod-build)
        check_docker
        prod_build
        ;;
    prod-up)
        check_docker
        prod_up
        ;;
    prod-down)
        prod_down
        ;;
    prod-logs)
        prod_logs
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    help|*)
        show_help
        ;;
esac