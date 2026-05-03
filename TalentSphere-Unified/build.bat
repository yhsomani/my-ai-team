@echo off
REM TalentSphere Unified Build Script
REM Builds both frontend and backend
REM Usage: build.bat [all|backend|frontend|clean|validate]

setlocal enabledelayedexpansion

set START_TIME=%time%

if "%1"=="" goto all
if "%1"=="all" goto all
if "%1"=="backend" goto backend
if "%1"=="frontend" goto frontend
if "%1"=="clean" goto clean
if "%1"=="validate" goto validate

echo Usage: build.bat [all^|backend^|frontend^|clean^|validate]
exit /b 1

:all
echo ========================================
echo Building TalentSphere - ALL COMPONENTS
echo ========================================
echo.
goto backend

:backend
echo [1/3] Building Backend Services...
echo ========================================
cd /d "%~dp0"
call mvn clean compile -q
if errorlevel 1 (
    echo FAILED: Backend compilation failed!
    exit /b 1
)
echo Backend build: SUCCESS
echo.

if "%1"=="backend" goto success

:frontend
echo [2/3] Building Frontend...
echo ========================================
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
    echo FAILED: Frontend build failed!
    exit /b 1
)
echo Frontend build: SUCCESS
echo.

goto success

:validate
echo [1/1] Validating System Integrity...
echo ========================================
cd /d "%~dp0"
call mvn validate -q
if errorlevel 1 (
    echo FAILED: Validation failed!
    exit /b 1
)
echo Frontend build (validate only)...
cd /d "%~dp0frontend"
call npm run build -- --mode development
echo Validation: SUCCESS
goto end

:clean
echo Cleaning all build artifacts...
echo ========================================
cd /d "%~dp0"
call mvn clean -q
cd /d "%~dp0frontend"
call rm -rf dist node_modules/.vite
echo Clean complete.

:success
echo ========================================
echo BUILD COMPLETED SUCCESSFULLY
echo ========================================
echo.

:end
set END_TIME=%time%
echo Start time: %START_TIME%
echo End time: %END_TIME%
echo.
echo To run the system:
echo   1. docker-compose up -d
echo   2. cd services ^&^& mvn spring-boot:run
echo   3. cd frontend ^&^& npm run dev
echo.
exit /b 0