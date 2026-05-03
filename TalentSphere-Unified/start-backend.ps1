# -----------------------------------------------------------------------------
# TalentSphere Backend Initialization Script
# -----------------------------------------------------------------------------
Write-Host "Initializing TalentSphere Backend Environment..." -ForegroundColor Cyan

# Ensure Docker is running
Write-Host "`n[1/4] Starting Docker Compose architecture..." -ForegroundColor Yellow
docker-compose up -d postgres redis rabbitmq
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start core Docker services! Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Host "Waiting 5 seconds for PostgreSQL to initialize..."
Start-Sleep -Seconds 5

# Install user-service dependencies and migrate
Write-Host "`n[2/4] Setting up User Service..." -ForegroundColor Yellow
Set-Location -Path "services\user-service"
npm install
if ($LASTEXITCODE -eq 0) {
    npx drizzle-kit push
    npm run db:seed
} else {
    Write-Host "Failed to install user-service dependencies." -ForegroundColor Red
}
Set-Location -Path "..\.."

# Install challenge-service dependencies and migrate
Write-Host "`n[3/4] Setting up Challenge Service..." -ForegroundColor Yellow
Set-Location -Path "services\challenge-service"
npm install
if ($LASTEXITCODE -eq 0) {
    npx drizzle-kit push
    npm run db:seed
} else {
    Write-Host "Failed to install challenge-service dependencies." -ForegroundColor Red
}
Set-Location -Path "..\.."
# Install notification-service dependencies
Write-Host "`n[3.5/4] Setting up Notification Service..." -ForegroundColor Yellow
Set-Location -Path "services\notification-service"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install notification-service dependencies." -ForegroundColor Red
}
Set-Location -Path "..\.."

# Install lms-service dependencies and migrate
Write-Host "`n[3.8/4] Setting up LMS Service..." -ForegroundColor Yellow
Set-Location -Path "services\lms-service"
npm install
if ($LASTEXITCODE -eq 0) {
    npx drizzle-kit push
    npm run db:seed
} else {
    Write-Host "Failed to install LMS service dependencies." -ForegroundColor Red
}
Set-Location -Path "..\.."

# Install job-service dependencies and migrate
Write-Host "`n[3.9/4] Setting up Job Service..." -ForegroundColor Yellow
Set-Location -Path "services\job-service"
npm install
if ($LASTEXITCODE -eq 0) {
    npx drizzle-kit push
    npm run db:seed
} else {
    Write-Host "Failed to install Job service dependencies." -ForegroundColor Red
}
Set-Location -Path "..\.."

# Start all remaining docker containers
Write-Host "`n[4/4] Starting full microservices ecosystem (User Service, Challenge Service, API Gateway)..." -ForegroundColor Yellow
docker-compose up -d --build

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "TalentSphere Backend is completely ready!" -ForegroundColor Green
Write-Host "You can now test the live endpoints from the React app." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
