#!/bin/bash
set -e

echo "Starting TalentSphere development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Start services
echo "Starting PostgreSQL, Redis, Backend, and Frontend..."
docker-compose up -d postgres redis

# Wait for PostgreSQL
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Start backend and frontend
docker-compose up -d backend frontend

echo ""
echo "=== Services Started ==="
echo "Frontend:   http://localhost:3000"
echo "Backend:    http://localhost:8080"
echo "Swagger UI: http://localhost:8080/swagger-ui.html"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop:     docker-compose down"
