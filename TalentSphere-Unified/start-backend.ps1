# -----------------------------------------------------------------------------
# TalentSphere Backend Initialization Script
# -----------------------------------------------------------------------------
Write-Host "Initializing TalentSphere Unified Backend (Spring Boot Ecosystem)..." -ForegroundColor Cyan

# Ensure Docker is running
Write-Host "`n[1/3] Starting Infrastructure (Postgres, MongoDB, Redis, RabbitMQ)..." -ForegroundColor Yellow
docker-compose up -d postgres mongodb redis rabbitmq
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start core Docker services! Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Host "Waiting 10 seconds for databases to initialize..."
Start-Sleep -Seconds 10

# Check for Maven to see if local build is possible
$mvnVersion = mvn -version 2>$null
if ($null -ne $mvnVersion) {
    Write-Host "`n[2/3] Local Maven detected. Building shared libraries..." -ForegroundColor Yellow
    mvn install -N -DskipTests
    mvn install -pl services/bom,services/contracts,services/shared,services/shared-security,services/shared-messaging,services/shared-resilience -am -DskipTests
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Local build failed! Proceeding with Docker-only build." -ForegroundColor Gray
    }
} else {
    Write-Host "`n[2/3] Maven not found locally. Skipping local build, will rely on Docker multi-stage builds." -ForegroundColor Gray
}

# Start all microservices
Write-Host "`n[3/3] Starting full microservices ecosystem via Docker Compose..." -ForegroundColor Yellow
docker-compose up -d --build

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "TalentSphere Backend is launching!" -ForegroundColor Green
Write-Host "Services will be available shortly at:" -ForegroundColor Green
Write-Host " - API Gateway: http://localhost:8080" -ForegroundColor White
Write-Host " - Auth Service: http://localhost:8081" -ForegroundColor White
Write-Host " - User Service: http://localhost:8082" -ForegroundColor White
Write-Host " - LMS Service:  http://localhost:8090" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "Run 'docker-compose logs -f' to monitor startup." -ForegroundColor Cyan
