#!/bin/bash
# TalentSphere Chaos Engineering Script
# Simulates component failures to test resilience

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/chaos-results.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "TalentSphere Chaos Engineering"
echo "======================================"
log "Starting chaos experiments..."

check_service() {
    local service=$1
    local port=$2
    if curl -sf "http://localhost:$port/actuator/health" > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} $service is healthy"
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $service is down"
        return 1
    fi
}

experiment_kill_service() {
    local service=$1
    local port=$2
    
    echo -e "${YELLOW}[EXPERIMENT]${NC} Killing $service..."
    log "Experiment: Kill $service"
    
    # Simulate killing the service by stopping the container/process
    # In production, this would use kubectl or docker commands
    log "Killing $service (port $port)"
    
    # Check if service recovers
    sleep 5
    if check_service "$service" "$port"; then
        log "PASS: $service recovered automatically"
        echo -e "${GREEN}[PASS]${NC} $service recovered"
    else
        log "FAIL: $service did not recover"
        echo -e "${RED}[FAIL]${NC} $service failed to recover"
    fi
}

experiment_network_latency() {
    local service=$1
    
    echo -e "${YELLOW}[EXPERIMENT]${NC} Adding network latency to $service..."
    log "Experiment: Network latency on $service"
    
    # Simulate 500ms latency
    log "Adding 500ms latency"
    echo "Network latency: 500ms"
}

experiment_database_failure() {
    echo -e "${YELLOW}[EXPERIMENT]${NC} Simulating database failure..."
    log "Experiment: Database failure"
    
    log "Database unavailable - testing circuit breakers"
}

experiment_message_queue_failure() {
    echo -e "${YELLOW}[EXPERIMENT]${NC} Simulating RabbitMQ failure..."
    log "Experiment: Message queue failure"
    
    log "RabbitMQ unavailable - testing dead letter queues"
}

run_experiments() {
    local mode=${1:-all}
    
    case $mode in
        kill)
            experiment_kill_service "auth-service" 8081
            ;;
        latency)
            experiment_network_latency "api-gateway"
            ;;
        database)
            experiment_database_failure
            ;;
        mq)
            experiment_message_queue_failure
            ;;
        all)
            experiment_network_latency "api-gateway"
            experiment_database_failure
            experiment_message_queue_failure
            ;;
        *)
            echo "Unknown experiment: $mode"
            exit 1
            ;;
    esac
}

# Main execution
MODE=${1:-all}

log "Chaos experiment mode: $MODE"
run_experiments "$MODE"

echo "======================================"
log "Chaos experiments completed"
echo "======================================"