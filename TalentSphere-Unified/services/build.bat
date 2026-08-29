@echo off
REM TalentSphere Services Build Script
REM Usage: build.bat [command]
REM Commands: build, test, clean, validate

setlocal

set MAVEN_OPTS=-Xmx2048m -XX:MaxMetaspaceSize=512m

if "%1"=="" (
    echo Usage: build.bat [command]
    echo Commands:
    echo   build     - Build all services skipping tests
    echo   test     - Build and run tests
    echo   clean    - Clean build artifacts
    echo   validate - Validate POM files
    echo   clean-build - Clean and build
    exit /b 1
)

if "%1"=="build" goto build
if "%1"=="test" goto test
if "%1"=="clean" goto clean
if "%1"=="validate" goto validate
if "%1"=="clean-build" goto clean-build

echo Unknown command: %1
exit /b 1

:build
echo Building all services...
call mvn clean package -DskipTests -q %MAVEN_OPTS%
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)
echo Build completed successfully!
exit /b 0

:test
echo Running tests...
call mvn test %MAVEN_OPTS%
if errorlevel 1 (
    echo Tests failed!
    exit /b 1
)
echo Tests completed successfully!
exit /b 0

:clean
echo Cleaning build artifacts...
call mvn clean -q %MAVEN_OPTS%
echo Clean completed!
exit /b 0

:validate
echo Validating POM files...
call mvn validate -q %MAVEN_OPTS%
if errorlevel 1 (
    echo Validation failed!
    exit /b 1
)
echo Validation passed!
exit /b 0

:clean-build
echo Clean and building...
call mvn clean package -DskipTests %MAVEN_OPTS%
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)
echo Build completed successfully!
exit /b 0