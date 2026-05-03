# TalentSphere Backend Documentation

## Overview

Auto-generated using **SpringDoc OpenAPI** for Spring Boot backend services.

## Extracted Documentation

### Auth Service (Port 8081)

| Endpoint | Method | Description |
|---------|-------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/health` | GET | Health check |
| `/api/auth/login` | POST | User login (JWT) |
| `/api/auth/refresh` | POST | Refresh JWT token |

**Database:** MongoDB `talentsphere_auth`

### Available Services

| Service | Port | Database |
|---------|------|---------|
| auth-service | 8081 | talentsphere_auth |
| user-service | 8082 | talentsphere_user |
| profile-service | 8083 | talentsphere_profile |
| job-service | 8084 | talentsphere_job |
| application-service | 8085 | talentsphere_application |
| company-service | 8086 | talentsphere_company |
| notification-service | 8087 | talentsphere_notification |
| search-service | 8088 | Elasticsearch |
| gamification-service | 8090 | talentsphere_gamification |
| challenge-service | 8091 | talentsphere_challenge |
| lms-service | 8092 | talentsphere_lms |
| messaging-service | 8096 | talentsphere_messaging |
| networking-service | 8097 | talentsphere_networking |
| api-gateway | 8080 | N/A |

## Swagger UI Access

Each service exposes:
- **Swagger UI:** `http://localhost:{port}/swagger-ui.html`
- **OpenAPI JSON:** `http://localhost:{port}/api-docs` or `/v3/api-docs`

## Usage

```bash
# Build service
mvn clean install -f services/auth-service/pom.xml

# Run service
java -jar services/auth-service/target/ts-auth-service.jar

# Access Swagger UI
# http://localhost:8081/swagger-ui.html
```

## OpenAPI Configuration

Each service includes:
- API info (title, version, description)
- JWT bearer authentication
- Request/response schemas
- Error responses

## Dependencies

| Package | Version |
|---------|---------|
| spring-boot | 3.2.5 |
| springdoc-openapi | 2.5.0 |
| spring-cloud-gateway | 2023.0.1 |
| jjwt | 0.12.5 |

## Build Output

JAR files located in each service's `target/` directory after build.