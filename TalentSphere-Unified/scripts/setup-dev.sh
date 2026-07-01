#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Setting up TalentSphere development environment ==="
echo "Repository root: $REPO_ROOT"
cd "$REPO_ROOT"

# Backend setup: current source is the root Maven reactor. apps/backend is an
# ADR-002 target shell only until domains are migrated into it.
echo "Checking backend reactor..."
if ! command -v mvn &> /dev/null; then
    echo "Maven not found, skipping backend reactor check"
else
    echo "Backend Maven reactor available at $REPO_ROOT/pom.xml"
fi
echo "apps/backend is a modular-monolith target shell, not a runnable Maven app yet"

# Frontend setup
echo "Setting up frontend..."
if command -v npm &> /dev/null; then
    npm install
    echo "Root npm workspace dependencies installed"
else
    echo "npm not found, skipping frontend setup"
fi

# Create Docker network
echo "Creating Docker network..."
if command -v docker &> /dev/null; then
    docker network create talentsphere-network 2>/dev/null || true
else
    echo "Docker not found, skipping Docker network creation"
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "To start the development environment:"
echo "  ./scripts/start-dev.sh"
echo ""
echo "To validate or package the current backend reactor:"
echo "  mvn package"
echo ""
echo "To run frontend only:"
echo "  npm run dev"
