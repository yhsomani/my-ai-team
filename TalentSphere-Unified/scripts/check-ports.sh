#!/bin/bash
# TalentSphere Port Validator Script
# Validates no hardcoded ports are used in the codebase

set -e

echo "======================================"
echo "TalentSphere Port Validation"
echo "======================================"

# Master Port Map from CLAUDE.md
declare -A MASTER_PORTS=(
    ["api-gateway"]=8080
    ["auth-service"]=8081
    ["user-service"]=8082
    ["profile-service"]=8083
    ["job-service"]=8084
    ["application-service"]=8085
    ["company-service"]=8086
    ["notification-service"]=8087
    ["search-service"]=8088
    ["analytics-service"]=8089
    ["gamification-service"]=8090
    ["challenge-service"]=8091
    ["lms-service"]=8092
    ["video-service"]=8093
    ["file-service"]=8094
    ["email-service"]=8095
    ["messaging-service"]=8096
    ["networking-service"]=8097
    ["payment-service"]=8098
    ["frontend"]=3000
)

ERRORS=0

check_yaml_ports() {
    local file=$1
    if grep -qE ':[0-9]{4}' "$file" 2>/dev/null; then
        # Extract port from YAML (e.g., port: 8081)
        grep -oE ':[0-9]{4}' "$file" | while read -r line; do
            port="${line#:}"
            service=$(grep -B5 "$line" "$file" | grep 'name:' | head -1 | awk '{print $2}' || echo "unknown")
            echo "  $file: port $port (service: $service)"
        done
    fi
}

check_java_ports() {
    local file=$1
    if grep -qE 'port.*[0-9]{4}' "$file" 2>/dev/null; then
        grep -oE 'port.*[0-9]{4}' "$file" | head -3
    fi
}

echo "Checking for hardcoded ports..."

# Check application.yml files
for file in $(find services -name "application.yml" -type f 2>/dev/null); do
    if grep -qE '^\s+port:\s+[0-9]+' "$file"; then
        echo "Found port config in: $file"
    fi
done

echo ""
echo "Validating against Master Port Map..."

# Verify services exist
for service in "${!MASTER_PORTS[@]}"; do
    expected_port=${MASTER_PORTS[$service]}
    if [ -d "services/$service" ]; then
        app_yml="services/$service/src/main/resources/application.yml"
        if [ -f "$app_yml" ]; then
            actual_port=$(grep -E '^\s+port:\s+' "$app_yml" | awk '{print $2}')
            if [ "$expected_port" != "$actual_port" ]; then
                echo "MISMATCH: $service expected $expected_port, found $actual_port"
                ((ERRORS++))
            else
                echo "OK: $service = $expected_port"
            fi
        fi
    fi
done

echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "All ports validated successfully"
    exit 0
else
    echo "Found $ERRORS port mismatches"
    exit 1
fi