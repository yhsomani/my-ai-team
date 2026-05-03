#!/bin/bash
set -e

echo "=== Setting up TalentSphere development environment ==="

# Backend setup
echo "Setting up backend..."
cd apps/backend
if ! command -v mvn &> /dev/null; then
    echo "Maven not found, skipping backend Maven setup"
else
    echo "Backend Maven project ready"
fi
cd ..

# Frontend setup
echo "Setting up frontend..."
cd apps/frontend
if command -v npm &> /dev/null; then
    npm install
    echo "Frontend dependencies installed"
else
    echo "npm not found, skipping frontend setup"
fi
cd ..

# Create Docker network
echo "Creating Docker network..."
docker network create talentsphere-network 2>/dev/null || true

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To start the development environment:"
echo "  ./scripts/start-dev.sh"
echo ""
echo "To run backend only:"
echo "  cd apps/backend && mvn spring-boot:run"
echo ""
echo "To run frontend only:"
echo "  cd apps/frontend && npm run dev"
