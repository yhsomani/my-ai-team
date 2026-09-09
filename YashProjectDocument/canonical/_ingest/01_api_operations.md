# API Operations -- Canonical Contract Extraction

> Source: `API_OPENAPI_CONTRACT.json` (OpenAPI 3.1.0)  
> Total operations found: 123  
> Base path: `/` | Path entries: 113

## Admin Domain

**Count: 9 operations**  
Source tag: `api-gateway`

### 1. `GET` /api/v1/admin/feature-flags [ADMIN]

- **operationId:** `FeatureFlagController.getAllFlags`
- **Purpose:** GET /api/v1/admin/feature-flags
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 21, "module": "services/api-gateway", "handler": "getAllFlags"}

### 2. `GET` /api/v1/admin/feature-flags/categories [ADMIN]

- **operationId:** `FeatureFlagController.getFeaturesByCategory`
- **Purpose:** GET /api/v1/admin/feature-flags/categories
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 95, "module": "services/api-gateway", "handler": "getFeaturesByCategory"}

### 3. `GET` /api/v1/admin/feature-flags/core [ADMIN]

- **operationId:** `FeatureFlagController.getCoreFeatures`
- **Purpose:** GET /api/v1/admin/feature-flags/core
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 90, "module": "services/api-gateway", "handler": "getCoreFeatures"}

### 4. `GET` /api/v1/admin/feature-flags/enabled [ADMIN]

- **operationId:** `FeatureFlagController.getEnabledFeatures`
- **Purpose:** GET /api/v1/admin/feature-flags/enabled
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 85, "module": "services/api-gateway", "handler": "getEnabledFeatures"}

### 5. `POST` /api/v1/admin/feature-flags/reset-all [ADMIN]

- **operationId:** `FeatureFlagController.resetAllFlags`
- **Purpose:** POST /api/v1/admin/feature-flags/reset-all
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 79, "module": "services/api-gateway", "handler": "resetAllFlags"}

### 6. `GET` /api/v1/admin/feature-flags/{flagName} [ADMIN]

- **operationId:** `FeatureFlagController.getFlag`
- **Purpose:** GET /api/v1/admin/feature-flags/{flagName}
- **Path params:** flagName: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: flagName: string, currentValue: boolean (required), defaultValue: boolean (required), isOverridden: boolean (required), description: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 26, "module": "services/api-gateway", "handler": "getFlag"}

### 7. `POST` /api/v1/admin/feature-flags/{flagName}/disable [ADMIN]

- **operationId:** `FeatureFlagController.disableFlag`
- **Purpose:** POST /api/v1/admin/feature-flags/{flagName}/disable
- **Path params:** flagName: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 57, "module": "services/api-gateway", "handler": "disableFlag"}

### 8. `POST` /api/v1/admin/feature-flags/{flagName}/enable [ADMIN]

- **operationId:** `FeatureFlagController.enableFlag`
- **Purpose:** POST /api/v1/admin/feature-flags/{flagName}/enable
- **Path params:** flagName: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 46, "module": "services/api-gateway", "handler": "enableFlag"}

### 9. `POST` /api/v1/admin/feature-flags/{flagName}/reset [ADMIN]

- **operationId:** `FeatureFlagController.resetFlag`
- **Purpose:** POST /api/v1/admin/feature-flags/{flagName}/reset
- **Path params:** flagName: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/api-gateway/src/main/java/com/talentsphere/gateway/controller/FeatureFlagController.java", "line": 68, "module": "services/api-gateway", "handler": "resetFlag"}

---

## Ai Domain

**Count: 8 operations**  
Source tag: `ai-service`

### 1. `POST` /api/v1/ai/analyze-resume [PUBLIC]

- **operationId:** `AiController.analyzeResume`
- **Purpose:** POST /api/v1/ai/analyze-resume
- **Request body:** string
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 17, "module": "services/ai-service", "handler": "analyzeResume"}

### 2. `GET` /api/v1/ai/career-path/{userId} [PUBLIC]

- **operationId:** `AiController.getCareerPath`
- **Purpose:** GET /api/v1/ai/career-path/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 48, "module": "services/ai-service", "handler": "getCareerPath"}

### 3. `POST` /api/v1/ai/chat [PUBLIC]

- **operationId:** `AiController.getChatResponse`
- **Purpose:** POST /api/v1/ai/chat
- **Request body:** map[string, any]
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 42, "module": "services/ai-service", "handler": "getChatResponse"}

### 4. `GET` /api/v1/ai/health [PUBLIC]

- **operationId:** `AiController.health`
- **Purpose:** GET /api/v1/ai/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 58, "module": "services/ai-service", "handler": "health"}

### 5. `GET` /api/v1/ai/insights [PUBLIC]

- **operationId:** `AiController.getInsights`
- **Purpose:** GET /api/v1/ai/insights
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 53, "module": "services/ai-service", "handler": "getInsights"}

### 6. `POST` /api/v1/ai/match-job [PUBLIC]

- **operationId:** `AiController.matchJob`
- **Purpose:** POST /api/v1/ai/match-job
- **Query params:** resumeText: string (required); jobDescription: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 22, "module": "services/ai-service", "handler": "matchJob"}

### 7. `GET` /api/v1/ai/results/{userId} [PUBLIC]

- **operationId:** `AiController.getUserResults`
- **Purpose:** GET /api/v1/ai/results/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, userId: string, targetType: string, targetId: string, resultJson: string, score: number (format: double), createdAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 37, "module": "services/ai-service", "handler": "getUserResults"}

### 8. `POST` /api/v1/ai/save-results [PUBLIC]

- **operationId:** `AiController.saveResults`
- **Purpose:** POST /api/v1/ai/save-results
- **Query params:** userId: string (required); targetType: string (required); targetId: string (required); score: number (required) format: double
- **Request body:** string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, targetType: string, targetId: string, resultJson: string, score: number (format: double), createdAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/ai-service/src/main/java/com/talentsphere/ai/controller/AiController.java", "line": 27, "module": "services/ai-service", "handler": "saveResults"}

---

## Applications Domain

**Count: 7 operations**  
Source tag: `application-service`

### 1. `POST` /api/v1/applications [PUBLIC]

- **operationId:** `ApplicationController.apply`
- **Purpose:** POST /api/v1/applications
- **Request body:** id: string, version: integer (format: int64), jobId: string, userId: string, status: string, appliedAt: string (format: date-time), resumeUrl: string, coverLetter: string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), jobId: string, userId: string, status: string, appliedAt: string (format: date-time), resumeUrl: string, coverLetter: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java", "line": 18, "module": "services/application-service", "handler": "apply"}

### 2. `GET` /api/v1/applications/count/{userId} [PUBLIC]

- **operationId:** `ApplicationController.getApplicationCount`
- **Purpose:** GET /api/v1/applications/count/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java", "line": 23, "module": "services/application-service", "handler": "getApplicationCount"}

### 3. `GET` /api/v1/applications/health [PUBLIC]

- **operationId:** `ApplicationController.health`
- **Purpose:** GET /api/v1/applications/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java", "line": 57, "module": "services/application-service", "handler": "health"}

### 4. `GET` /api/v1/applications/job/{jobId} [PUBLIC]

- **operationId:** `ApplicationController.getApplicationsByJobId`
- **Purpose:** GET /api/v1/applications/job/{jobId}
- **Path params:** jobId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), jobId: string, userId: string, status: string, appliedAt: string (format: date-time), resumeUrl: string, coverLetter: string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java", "line": 34, "module": "services/application-service", "handler": "getApplicationsByJobId"}

### 5. `GET` /api/v1/applications/user/{userId} [PUBLIC]

- **operationId:** `ApplicationController.getApplicationsByUserId`
- **Purpose:** GET /api/v1/applications/user/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), jobId: string, userId: string, status: string, appliedAt: string (format: date-time), resumeUrl: string, coverLetter: string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java", "line": 29, "module": "services/application-service", "handler": "getApplicationsByUserId"}

### 6. `GET` /api/v1/applications/{id}/events [PUBLIC]

- **operationId:** `ApplicationController.getStatusEvents`
- **Purpose:** GET /api/v1/applications/{id}/events
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, applicationId: string, previousStatus: string, status: string, changedBy: string, reason: string, createdAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java", "line": 52, "module": "services/application-service", "handler": "getStatusEvents"}

### 7. `PATCH` /api/v1/applications/{id}/status [PUBLIC]

- **operationId:** `ApplicationController.updateStatus`
- **Purpose:** PATCH /api/v1/applications/{id}/status
- **Path params:** id: string (required)
- **Request body:** map[string, any]
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), jobId: string, userId: string, status: string, appliedAt: string (format: date-time), resumeUrl: string, coverLetter: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/ApplicationController.java", "line": 39, "module": "services/application-service", "handler": "updateStatus"}; x-authorization: "hasRole('RECRUITER')"

---

## Auth Domain

**Count: 4 operations**  
Source tag: `auth-service`

### 1. `GET` /api/v1/auth/.well-known/jwks.json [PUBLIC]

- **operationId:** `JwksController.getJwks`
- **Purpose:** GET /api/v1/auth/.well-known/jwks.json
- **Request body:** None
- **Success:** `200` -- map[string, any]
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/auth-service/src/main/java/com/talentsphere/auth/controller/JwksController.java", "line": 18, "module": "services/auth-service", "handler": "getJwks"}

### 2. `GET` /api/v1/auth/health [PUBLIC]

- **operationId:** `AuthController.health`
- **Purpose:** GET /api/v1/auth/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java", "line": 47, "module": "services/auth-service", "handler": "health"}

### 3. `POST` /api/v1/auth/login [PUBLIC]

- **operationId:** `AuthController.login`
- **Purpose:** POST /api/v1/auth/login
- **Request body:** id: string, version: integer (format: int64), email: string, firstName: string, lastName: string, password: string, enabled: boolean (required), roles: array<string>
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java", "line": 37, "module": "services/auth-service", "handler": "login"}

### 4. `POST` /api/v1/auth/register [PUBLIC]

- **operationId:** `AuthController.register`
- **Purpose:** POST /api/v1/auth/register
- **Request body:** id: string, version: integer (format: int64), email: string, firstName: string, lastName: string, password: string, enabled: boolean (required), roles: array<string>
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), email: string, firstName: string, lastName: string, password: string, enabled: boolean (required), roles: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java", "line": 27, "module": "services/auth-service", "handler": "register"}

---

## Challenges Domain

**Count: 4 operations**  
Source tag: `challenge-service`

### 1. `GET` /api/v1/challenges [PUBLIC]

- **operationId:** `ChallengeController.getAllChallenges`
- **Purpose:** GET /api/v1/challenges
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), title: string, description: string, category: string, difficulty: string, xpReward: integer (required, format: int32), starterCode: string, testCases: array<id: string, challengeId: string, input: string, expectedOutput: string, isPublic: boolean (required)>>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java", "line": 18, "module": "services/challenge-service", "handler": "getAllChallenges"}

### 2. `GET` /api/v1/challenges/health [PUBLIC]

- **operationId:** `ChallengeController.health`
- **Purpose:** GET /api/v1/challenges/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java", "line": 37, "module": "services/challenge-service", "handler": "health"}

### 3. `POST` /api/v1/challenges/submit [PUBLIC]

- **operationId:** `ChallengeController.submitCode`
- **Purpose:** POST /api/v1/challenges/submit
- **Query params:** userId: string (required); challengeId: string (required); language: string (required)
- **Request body:** string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), challengeId: string, userId: string, language: string, code: string, status: string, score: integer (required, format: int32), submittedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java", "line": 28, "module": "services/challenge-service", "handler": "submitCode"}

### 4. `GET` /api/v1/challenges/trending [PUBLIC]

- **operationId:** `ChallengeController.getTrendingChallenges`
- **Purpose:** GET /api/v1/challenges/trending
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), title: string, description: string, category: string, difficulty: string, xpReward: integer (required, format: int32), starterCode: string, testCases: array<id: string, challengeId: string, input: string, expectedOutput: string, isPublic: boolean (required)>>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/challenge-service/src/main/java/com/talentsphere/challenge/controller/ChallengeController.java", "line": 23, "module": "services/challenge-service", "handler": "getTrendingChallenges"}

---

## Companies Domain

**Count: 8 operations**  
Source tag: `company-service`

### 1. `GET` /api/v1/companies [PUBLIC]

- **operationId:** `CompanyController.list`
- **Purpose:** GET /api/v1/companies
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 22, "module": "services/company-service", "handler": "list"}

### 2. `POST` /api/v1/companies [PUBLIC]

- **operationId:** `CompanyController.register`
- **Purpose:** POST /api/v1/companies
- **Request body:** id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time)
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 16, "module": "services/company-service", "handler": "register"}; x-authorization: "hasRole('RECRUITER')"

### 3. `GET` /api/v1/companies/health [PUBLIC]

- **operationId:** `CompanyController.health`
- **Purpose:** GET /api/v1/companies/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 53, "module": "services/company-service", "handler": "health"}

### 4. `GET` /api/v1/companies/search [PUBLIC]

- **operationId:** `CompanyController.search`
- **Purpose:** GET /api/v1/companies/search
- **Query params:** q: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 27, "module": "services/company-service", "handler": "search"}

### 5. `GET` /api/v1/companies/user/{userId} [PUBLIC]

- **operationId:** `CompanyController.getByUser`
- **Purpose:** GET /api/v1/companies/user/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 32, "module": "services/company-service", "handler": "getByUser"}

### 6. `GET` /api/v1/companies/{id} [PUBLIC]

- **operationId:** `CompanyController.get`
- **Purpose:** GET /api/v1/companies/{id}
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 37, "module": "services/company-service", "handler": "get"}

### 7. `PUT` /api/v1/companies/{id} [PUBLIC]

- **operationId:** `CompanyController.update`
- **Purpose:** PUT /api/v1/companies/{id}
- **Path params:** id: string (required)
- **Request body:** id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time)
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 42, "module": "services/company-service", "handler": "update"}

### 8. `POST` /api/v1/companies/{id}/verify [PUBLIC]

- **operationId:** `CompanyController.verify`
- **Purpose:** POST /api/v1/companies/{id}/verify
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, name: string (required), description: string, website: string, location: string, logoUrl: string, industry: string (required), employeeCount: integer (required, format: int32), ownerUserId: string (required), verified: boolean (required), verifiedAt: string (format: date-time), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/company-service/src/main/java/com/talentsphere/company/controller/CompanyController.java", "line": 47, "module": "services/company-service", "handler": "verify"}; x-authorization: "hasRole('ADMIN')"

---

## Files Domain

**Count: 4 operations**  
Source tag: `file-service`

### 1. `DELETE` /api/v1/files [PUBLIC]

- **operationId:** `FileController.delete`
- **Purpose:** DELETE /api/v1/files
- **Query params:** url: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java", "line": 40, "module": "services/file-service", "handler": "delete"}

### 2. `GET` /api/v1/files/download/{folder}/{fileName:.+} [PUBLIC]

- **operationId:** `FileController.download`
- **Purpose:** GET /api/v1/files/download/{folder}/{fileName:.+}
- **Path params:** folder: string (required); fileName: string (required)
- **Request body:** None
- **Success:** `200` -- string
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java", "line": 28, "module": "services/file-service", "handler": "download"}

### 3. `GET` /api/v1/files/health [PUBLIC]

- **operationId:** `FileController.health`
- **Purpose:** GET /api/v1/files/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java", "line": 45, "module": "services/file-service", "handler": "health"}

### 4. `POST` /api/v1/files/upload [PUBLIC]

- **operationId:** `FileController.upload`
- **Purpose:** POST /api/v1/files/upload
- **Query params:** folder: string
- **Request body:** file: string (required, format: binary)
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/file-service/src/main/java/com/talentsphere/file/controller/FileController.java", "line": 22, "module": "services/file-service", "handler": "upload"}

---

## Gamification Domain

**Count: 5 operations**  
Source tag: `gamification-service`

### 1. `POST` /api/v1/gamification/achievements [PUBLIC]

- **operationId:** `GamificationController.grant`
- **Purpose:** POST /api/v1/gamification/achievements
- **Request body:** id: string, version: integer (format: int64), userId: string, title: string, description: string, iconUrl: string, unlockedAt: string (format: date-time)
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), userId: string, title: string, description: string, iconUrl: string, unlockedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java", "line": 31, "module": "services/gamification-service", "handler": "grant"}

### 2. `GET` /api/v1/gamification/achievements/{userId} [PUBLIC]

- **operationId:** `GamificationController.achievements`
- **Purpose:** GET /api/v1/gamification/achievements/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), userId: string, title: string, description: string, iconUrl: string, unlockedAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java", "line": 26, "module": "services/gamification-service", "handler": "achievements"}

### 3. `GET` /api/v1/gamification/health [PUBLIC]

- **operationId:** `GamificationController.health`
- **Purpose:** GET /api/v1/gamification/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java", "line": 36, "module": "services/gamification-service", "handler": "health"}

### 4. `GET` /api/v1/gamification/leaderboard [PUBLIC]

- **operationId:** `GamificationController.leaderboard`
- **Purpose:** GET /api/v1/gamification/leaderboard
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), userId: string, userName: string, totalXp: integer (required, format: int32), rank: integer (required, format: int32), level: integer (required, format: int32), lastUpdated: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java", "line": 21, "module": "services/gamification-service", "handler": "leaderboard"}

### 5. `GET` /api/v1/gamification/stats/{userId} [PUBLIC]

- **operationId:** `GamificationController.getStats`
- **Purpose:** GET /api/v1/gamification/stats/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/gamification-service/src/main/java/com/talentsphere/gamification/controller/GamificationController.java", "line": 16, "module": "services/gamification-service", "handler": "getStats"}

---

## Jobs Domain

**Count: 8 operations**  
Source tag: `job-service`

### 1. `GET` /api/v1/jobs [PUBLIC]

- **operationId:** `JobController.getActiveJobs`
- **Purpose:** GET /api/v1/jobs
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 18, "module": "services/job-service", "handler": "getActiveJobs"}

### 2. `POST` /api/v1/jobs [PUBLIC]

- **operationId:** `JobController.postJob`
- **Purpose:** POST /api/v1/jobs
- **Request body:** id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required)
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 28, "module": "services/job-service", "handler": "postJob"}; x-authorization: "hasRole('RECRUITER')"

### 3. `GET` /api/v1/jobs/featured [PUBLIC]

- **operationId:** `JobController.getFeaturedJobs`
- **Purpose:** GET /api/v1/jobs/featured
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 23, "module": "services/job-service", "handler": "getFeaturedJobs"}

### 4. `GET` /api/v1/jobs/health [PUBLIC]

- **operationId:** `JobController.health`
- **Purpose:** GET /api/v1/jobs/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 57, "module": "services/job-service", "handler": "health"}

### 5. `GET` /api/v1/jobs/recommended [PUBLIC]

- **operationId:** `JobController.getRecommendedJobs`
- **Purpose:** GET /api/v1/jobs/recommended
- **Query params:** userId: string
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 46, "module": "services/job-service", "handler": "getRecommendedJobs"}; x-authorization: "isAuthenticated()"

### 6. `GET` /api/v1/jobs/search [PUBLIC]

- **operationId:** `JobController.searchJobs`
- **Purpose:** GET /api/v1/jobs/search
- **Query params:** location: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 34, "module": "services/job-service", "handler": "searchJobs"}

### 7. `GET` /api/v1/jobs/search/advanced [PUBLIC]

- **operationId:** `JobController.searchJobsAdvanced`
- **Purpose:** GET /api/v1/jobs/search/advanced
- **Query params:** location: string (required); jobType: string
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 39, "module": "services/job-service", "handler": "searchJobsAdvanced"}

### 8. `GET` /api/v1/jobs/{id} [PUBLIC]

- **operationId:** `JobController.getJobById`
- **Purpose:** GET /api/v1/jobs/{id}
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), companyId: string, companyName: string, companyLogoUrl: string, title: string, description: string, location: string, jobType: string, salaryMin: number, salaryMax: number, currency: string, postedAt: string (format: date-time), active: boolean (required), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/job-service/src/main/java/com/talentsphere/job/controller/JobController.java", "line": 52, "module": "services/job-service", "handler": "getJobById"}

---

## Lms Domain

**Count: 14 operations**  
Source tag: `lms-service`

### 1. `GET` /api/v1/lms/courses [PUBLIC]

- **operationId:** `LmsController.list`
- **Purpose:** GET /api/v1/lms/courses
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, title: string, slug: string, description: string, instructorId: string, category: string, level: string, xpReward: integer (required, format: int32), price: number (required, format: double), rating: string, studentCount: integer (required, format: int32), imageUrl: string, lessonIds: array<string>>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 21, "module": "services/lms-service", "handler": "list"}

### 2. `POST` /api/v1/lms/courses [PUBLIC]

- **operationId:** `LmsController.create`
- **Purpose:** POST /api/v1/lms/courses
- **Request body:** id: string, title: string, slug: string, description: string, instructorId: string, category: string, level: string, xpReward: integer (required, format: int32), price: number (required, format: double), rating: string, studentCount: integer (required, format: int32), imageUrl: string, lessonIds: array<string>
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, title: string, slug: string, description: string, instructorId: string, category: string, level: string, xpReward: integer (required, format: int32), price: number (required, format: double), rating: string, studentCount: integer (required, format: int32), imageUrl: string, lessonIds: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 26, "module": "services/lms-service", "handler": "create"}; x-authorization: "hasRole('ADMIN')"

### 3. `GET` /api/v1/lms/courses/slug/{slug} [PUBLIC]

- **operationId:** `LmsController.getBySlug`
- **Purpose:** GET /api/v1/lms/courses/slug/{slug}
- **Path params:** slug: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, title: string, slug: string, description: string, instructorId: string, category: string, level: string, xpReward: integer (required, format: int32), price: number (required, format: double), rating: string, studentCount: integer (required, format: int32), imageUrl: string, lessonIds: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 37, "module": "services/lms-service", "handler": "getBySlug"}

### 4. `GET` /api/v1/lms/courses/{courseId} [PUBLIC]

- **operationId:** `LmsController.getById`
- **Purpose:** GET /api/v1/lms/courses/{courseId}
- **Path params:** courseId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, title: string, slug: string, description: string, instructorId: string, category: string, level: string, xpReward: integer (required, format: int32), price: number (required, format: double), rating: string, studentCount: integer (required, format: int32), imageUrl: string, lessonIds: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 32, "module": "services/lms-service", "handler": "getById"}

### 5. `POST` /api/v1/lms/courses/{courseId}/enroll [PUBLIC]

- **operationId:** `LmsController.enroll`
- **Purpose:** POST /api/v1/lms/courses/{courseId}/enroll
- **Path params:** courseId: string (required)
- **Query params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, courseId: string, enrolledAt: string (format: date-time), status: string (enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']), progress: integer (required, format: int32), completedLessonIds: array<string>, startedAt: string (format: date-time), completedAt: string (format: date-time), certificateUrl: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 47, "module": "services/lms-service", "handler": "enroll"}; x-authorization: "hasAnyRole('USER', 'ADMIN')"

### 6. `GET` /api/v1/lms/courses/{courseId}/enrollment [PUBLIC]

- **operationId:** `LmsController.getEnrollment`
- **Purpose:** GET /api/v1/lms/courses/{courseId}/enrollment
- **Path params:** courseId: string (required)
- **Query params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, courseId: string, enrolledAt: string (format: date-time), status: string (enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']), progress: integer (required, format: int32), completedLessonIds: array<string>, startedAt: string (format: date-time), completedAt: string (format: date-time), certificateUrl: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 71, "module": "services/lms-service", "handler": "getEnrollment"}

### 7. `POST` /api/v1/lms/courses/{courseId}/enrollments/drop [PUBLIC]

- **operationId:** `LmsController.dropCourse`
- **Purpose:** POST /api/v1/lms/courses/{courseId}/enrollments/drop
- **Path params:** courseId: string (required)
- **Query params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, courseId: string, enrolledAt: string (format: date-time), status: string (enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']), progress: integer (required, format: int32), completedLessonIds: array<string>, startedAt: string (format: date-time), completedAt: string (format: date-time), certificateUrl: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 58, "module": "services/lms-service", "handler": "dropCourse"}

### 8. `POST` /api/v1/lms/courses/{courseId}/enrollments/start [PUBLIC]

- **operationId:** `LmsController.startCourse`
- **Purpose:** POST /api/v1/lms/courses/{courseId}/enrollments/start
- **Path params:** courseId: string (required)
- **Query params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, courseId: string, enrolledAt: string (format: date-time), status: string (enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']), progress: integer (required, format: int32), completedLessonIds: array<string>, startedAt: string (format: date-time), completedAt: string (format: date-time), certificateUrl: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 53, "module": "services/lms-service", "handler": "startCourse"}

### 9. `GET` /api/v1/lms/courses/{courseId}/learning-paths [PUBLIC]

- **operationId:** `LmsController.getLearningPaths`
- **Purpose:** GET /api/v1/lms/courses/{courseId}/learning-paths
- **Path params:** courseId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, name: string, description: string, imageUrl: string, courses: array<courseId: string, orderIndex: integer (required, format: int32), isRequired: boolean (required)>, courseId: string, orderIndex: integer (required, format: int32), isRequired: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 89, "module": "services/lms-service", "handler": "getLearningPaths"}

### 10. `GET` /api/v1/lms/courses/{courseId}/lessons [PUBLIC]

- **operationId:** `LmsController.getLessons`
- **Purpose:** GET /api/v1/lms/courses/{courseId}/lessons
- **Path params:** courseId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, courseId: string, title: string, content: string, orderIndex: integer (required, format: int32), videoUrl: string, durationMinutes: integer (required, format: int32), prerequisiteLessonId: string, isFree: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 42, "module": "services/lms-service", "handler": "getLessons"}

### 11. `POST` /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete [PUBLIC]

- **operationId:** `LmsController.completeLesson`
- **Purpose:** POST /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete
- **Path params:** courseId: string (required); lessonId: string (required)
- **Query params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, courseId: string, enrolledAt: string (format: date-time), status: string (enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']), progress: integer (required, format: int32), completedLessonIds: array<string>, startedAt: string (format: date-time), completedAt: string (format: date-time), certificateUrl: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 63, "module": "services/lms-service", "handler": "completeLesson"}

### 12. `GET` /api/v1/lms/enrollments/{userId} [PUBLIC]

- **operationId:** `LmsController.getUserEnrollments`
- **Purpose:** GET /api/v1/lms/enrollments/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, userId: string, courseId: string, enrolledAt: string (format: date-time), status: string (enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']), progress: integer (required, format: int32), completedLessonIds: array<string>, startedAt: string (format: date-time), completedAt: string (format: date-time), certificateUrl: string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 78, "module": "services/lms-service", "handler": "getUserEnrollments"}; x-authorization: "hasAnyRole('USER', 'ADMIN') or #userId == authentication.name"

### 13. `GET` /api/v1/lms/health [PUBLIC]

- **operationId:** `LmsController.health`
- **Purpose:** GET /api/v1/lms/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 94, "module": "services/lms-service", "handler": "health"}

### 14. `GET` /api/v1/lms/learning-paths [PUBLIC]

- **operationId:** `LmsController.getAllLearningPaths`
- **Purpose:** GET /api/v1/lms/learning-paths
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, name: string, description: string, imageUrl: string, courses: array<courseId: string, orderIndex: integer (required, format: int32), isRequired: boolean (required)>, courseId: string, orderIndex: integer (required, format: int32), isRequired: boolean (required)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/lms-service/src/main/java/com/talentsphere/lms/controller/LmsController.java", "line": 84, "module": "services/lms-service", "handler": "getAllLearningPaths"}

---

## Messages Domain

**Count: 5 operations**  
Source tag: `messaging-service`

### 1. `GET` /api/v1/messages/conversation [PUBLIC]

- **operationId:** `MessagingController.getConversation`
- **Purpose:** GET /api/v1/messages/conversation
- **Query params:** user1: string (required); user2: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), senderId: string, receiverId: string, content: string, isRead: boolean (required), timestamp: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java", "line": 23, "module": "services/messaging-service", "handler": "getConversation"}

### 2. `GET` /api/v1/messages/health [PUBLIC]

- **operationId:** `MessagingController.health`
- **Purpose:** GET /api/v1/messages/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java", "line": 40, "module": "services/messaging-service", "handler": "health"}

### 3. `PATCH` /api/v1/messages/read [PUBLIC]

- **operationId:** `MessagingController.markAsRead`
- **Purpose:** PATCH /api/v1/messages/read
- **Query params:** user1: string (required); user2: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java", "line": 34, "module": "services/messaging-service", "handler": "markAsRead"}

### 4. `POST` /api/v1/messages/send [PUBLIC]

- **operationId:** `MessagingController.sendMessage`
- **Purpose:** POST /api/v1/messages/send
- **Query params:** senderId: string (required); receiverId: string (required)
- **Request body:** string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), senderId: string, receiverId: string, content: string, isRead: boolean (required), timestamp: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java", "line": 18, "module": "services/messaging-service", "handler": "sendMessage"}

### 5. `GET` /api/v1/messages/unread/count/{userId} [PUBLIC]

- **operationId:** `MessagingController.getUnreadCount`
- **Purpose:** GET /api/v1/messages/unread/count/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/messaging-service/src/main/java/com/talentsphere/messaging/controller/MessagingController.java", "line": 28, "module": "services/messaging-service", "handler": "getUnreadCount"}

---

## Networking Domain

**Count: 8 operations**  
Source tag: `networking-service`

### 1. `POST` /api/v1/networking/connect [PUBLIC]

- **operationId:** `NetworkingController.requestConnection`
- **Purpose:** POST /api/v1/networking/connect
- **Request body:** map[string, any]
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), requesterId: string, receiverId: string, status: string (enum: ['PENDING', 'ACCEPTED', 'BLOCKED']), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 21, "module": "services/networking-service", "handler": "requestConnection"}

### 2. `POST` /api/v1/networking/connections/accept/{id} [PUBLIC]

- **operationId:** `NetworkingController.acceptConnection`
- **Purpose:** POST /api/v1/networking/connections/accept/{id}
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 28, "module": "services/networking-service", "handler": "acceptConnection"}

### 3. `GET` /api/v1/networking/connections/{userId} [PUBLIC]

- **operationId:** `NetworkingController.getConnections`
- **Purpose:** GET /api/v1/networking/connections/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), requesterId: string, receiverId: string, status: string (enum: ['PENDING', 'ACCEPTED', 'BLOCKED']), createdAt: string (format: date-time), updatedAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 34, "module": "services/networking-service", "handler": "getConnections"}

### 4. `GET` /api/v1/networking/feed [PUBLIC]

- **operationId:** `NetworkingController.getFeed`
- **Purpose:** GET /api/v1/networking/feed
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), authorId: string, content: string, authorName: string, authorRole: string, likesCount: integer (required, format: int32), commentsCount: integer (required, format: int32), sharesCount: integer (required, format: int32), createdAt: string (format: date-time), updatedAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 51, "module": "services/networking-service", "handler": "getFeed"}

### 5. `GET` /api/v1/networking/health [PUBLIC]

- **operationId:** `NetworkingController.health`
- **Purpose:** GET /api/v1/networking/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 61, "module": "services/networking-service", "handler": "health"}

### 6. `POST` /api/v1/networking/posts [PUBLIC]

- **operationId:** `NetworkingController.createPost`
- **Purpose:** POST /api/v1/networking/posts
- **Request body:** id: string, version: integer (format: int64), authorId: string, content: string, authorName: string, authorRole: string, likesCount: integer (required, format: int32), commentsCount: integer (required, format: int32), sharesCount: integer (required, format: int32), createdAt: string (format: date-time), updatedAt: string (format: date-time)
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), authorId: string, content: string, authorName: string, authorRole: string, likesCount: integer (required, format: int32), commentsCount: integer (required, format: int32), sharesCount: integer (required, format: int32), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 46, "module": "services/networking-service", "handler": "createPost"}

### 7. `POST` /api/v1/networking/posts/like/{postId} [PUBLIC]

- **operationId:** `NetworkingController.likePost`
- **Purpose:** POST /api/v1/networking/posts/like/{postId}
- **Path params:** postId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), authorId: string, content: string, authorName: string, authorRole: string, likesCount: integer (required, format: int32), commentsCount: integer (required, format: int32), sharesCount: integer (required, format: int32), createdAt: string (format: date-time), updatedAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 56, "module": "services/networking-service", "handler": "likePost"}

### 8. `GET` /api/v1/networking/suggestions/{userId} [PUBLIC]

- **operationId:** `NetworkingController.getSuggestions`
- **Purpose:** GET /api/v1/networking/suggestions/{userId}
- **Path params:** userId: string (required)
- **Query params:** 10: integer format: int32
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<suggestedUserId: string, mutualConnections: integer (required, format: int64), recommendationScore: integer (required, format: int32), recommendationReasons: array<string>, source: string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/networking-service/src/main/java/com/talentsphere/networking/controller/NetworkingController.java", "line": 39, "module": "services/networking-service", "handler": "getSuggestions"}

---

## Notifications Domain

**Count: 5 operations**  
Source tag: `notification-service`

### 1. `GET` /api/v1/notifications/health [PUBLIC]

- **operationId:** `NotificationController.health`
- **Purpose:** GET /api/v1/notifications/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java", "line": 39, "module": "services/notification-service", "handler": "health"}

### 2. `GET` /api/v1/notifications/user/{userId} [PUBLIC]

- **operationId:** `NotificationController.getNotifications`
- **Purpose:** GET /api/v1/notifications/user/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), userId: string, message: string, type: string, isRead: boolean (required), createdAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java", "line": 17, "module": "services/notification-service", "handler": "getNotifications"}

### 3. `PATCH` /api/v1/notifications/user/{userId}/read-all [PUBLIC]

- **operationId:** `NotificationController.markAllAsRead`
- **Purpose:** PATCH /api/v1/notifications/user/{userId}/read-all
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java", "line": 33, "module": "services/notification-service", "handler": "markAllAsRead"}

### 4. `GET` /api/v1/notifications/user/{userId}/unread-count [PUBLIC]

- **operationId:** `NotificationController.getUnreadCount`
- **Purpose:** GET /api/v1/notifications/user/{userId}/unread-count
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: integer (format: int64), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java", "line": 22, "module": "services/notification-service", "handler": "getUnreadCount"}

### 5. `PATCH` /api/v1/notifications/{id}/read [PUBLIC]

- **operationId:** `NotificationController.markAsRead`
- **Purpose:** PATCH /api/v1/notifications/{id}/read
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/notification-service/src/main/java/com/talentsphere/notification/controller/NotificationController.java", "line": 27, "module": "services/notification-service", "handler": "markAsRead"}

---

## Payments Domain

**Count: 5 operations**  
Source tag: `payment-service`

### 1. `POST` /api/v1/payments/checkout [PUBLIC]

- **operationId:** `PaymentController.createSession`
- **Purpose:** POST /api/v1/payments/checkout
- **Request body:** userId: string (required), amount: number (required, format: double), currency: string (required), description: string
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java", "line": 24, "module": "services/payment-service", "handler": "createSession"}; x-authorization: "isAuthenticated()"

### 2. `GET` /api/v1/payments/health [PUBLIC]

- **operationId:** `PaymentController.health`
- **Purpose:** GET /api/v1/payments/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java", "line": 46, "module": "services/payment-service", "handler": "health"}

### 3. `GET` /api/v1/payments/history/{userId} [PUBLIC]

- **operationId:** `PaymentController.getHistory`
- **Purpose:** GET /api/v1/payments/history/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), userId: string, sessionId: string, amount: number (required, format: double), currency: string, status: string, description: string, createdAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java", "line": 35, "module": "services/payment-service", "handler": "getHistory"}; x-authorization: "#userId == authentication.name or hasRole('ADMIN')"

### 4. `GET` /api/v1/payments/plans [PUBLIC]

- **operationId:** `PaymentController.getPlans`
- **Purpose:** GET /api/v1/payments/plans
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<map[string, any]>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java", "line": 41, "module": "services/payment-service", "handler": "getPlans"}

### 5. `GET` /api/v1/payments/status/{sessionId} [PUBLIC]

- **operationId:** `PaymentController.getStatus`
- **Purpose:** GET /api/v1/payments/status/{sessionId}
- **Path params:** sessionId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/payment-service/src/main/java/com/talentsphere/payment/controller/PaymentController.java", "line": 30, "module": "services/payment-service", "handler": "getStatus"}

---

## Profile Domain

**Count: 11 operations**  
Source tag: `profile-service`

### 1. `GET` /api/v1/profile/health [PUBLIC]

- **operationId:** `ProfileController.health`
- **Purpose:** GET /api/v1/profile/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 110, "module": "services/profile-service", "handler": "health"}

### 2. `GET` /api/v1/profile/{userId} [PUBLIC]

- **operationId:** `ProfileController.getProfile`
- **Purpose:** GET /api/v1/profile/{userId}
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: userId: string, fullName: string, headline: string, summary: string, location: string, phone: string, website: string, linkedinUrl: string, githubUrl: string, createdAt: string (format: date-time), gamificationStats: xp: integer (required, format: int32), level: integer (required, format: int32), badges: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 26, "module": "services/profile-service", "handler": "getProfile"}; x-authorization: "hasAnyRole('USER', 'ADMIN')"

### 3. `PUT` /api/v1/profile/{userId} [PUBLIC]

- **operationId:** `ProfileController.updateProfile`
- **Purpose:** PUT /api/v1/profile/{userId}
- **Path params:** userId: string (required)
- **Request body:** fullName: string (required), headline: string, summary: string, location: string, phone: string, website: string, linkedinUrl: string, githubUrl: string
- **Success:** `200` -- success: boolean (required), message: string (required), data: userId: string, fullName: string, headline: string, summary: string, location: string, phone: string, website: string, linkedinUrl: string, githubUrl: string, createdAt: string (format: date-time), gamificationStats: xp: integer (required, format: int32), level: integer (required, format: int32), badges: array<string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 33, "module": "services/profile-service", "handler": "updateProfile"}; x-authorization: "#userId == authentication.name or hasRole('ADMIN')"

### 4. `GET` /api/v1/profile/{userId}/education [PUBLIC]

- **operationId:** `ProfileController.getEducation`
- **Purpose:** GET /api/v1/profile/{userId}/education
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, userId: string, institution: string, degree: string, fieldOfStudy: string, startDate: string (format: date), endDate: string (format: date), description: string, createdAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 94, "module": "services/profile-service", "handler": "getEducation"}; x-authorization: "hasAnyRole('USER', 'ADMIN')"

### 5. `POST` /api/v1/profile/{userId}/education [PUBLIC]

- **operationId:** `ProfileController.addEducation`
- **Purpose:** POST /api/v1/profile/{userId}/education
- **Path params:** userId: string (required)
- **Request body:** institution: string, degree: string, fieldOfStudy: string, startDate: string (format: date), endDate: string (format: date), description: string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, institution: string, degree: string, fieldOfStudy: string, startDate: string (format: date), endDate: string (format: date), description: string, createdAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 101, "module": "services/profile-service", "handler": "addEducation"}; x-authorization: "#userId == authentication.name or hasRole('ADMIN')"

### 6. `GET` /api/v1/profile/{userId}/experience [PUBLIC]

- **operationId:** `ProfileController.getExperience`
- **Purpose:** GET /api/v1/profile/{userId}/experience
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, userId: string, company: string, title: string, location: string, startDate: string (format: date), endDate: string (format: date), current: boolean (required), description: string, createdAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 68, "module": "services/profile-service", "handler": "getExperience"}; x-authorization: "hasAnyRole('USER', 'ADMIN')"

### 7. `POST` /api/v1/profile/{userId}/experience [PUBLIC]

- **operationId:** `ProfileController.addExperience`
- **Purpose:** POST /api/v1/profile/{userId}/experience
- **Path params:** userId: string (required)
- **Request body:** company: string, title: string, location: string, startDate: string (format: date), endDate: string (format: date), current: boolean, description: string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, company: string, title: string, location: string, startDate: string (format: date), endDate: string (format: date), current: boolean (required), description: string, createdAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 75, "module": "services/profile-service", "handler": "addExperience"}; x-authorization: "#userId == authentication.name or hasRole('ADMIN')"

### 8. `DELETE` /api/v1/profile/{userId}/experience/{experienceId} [PUBLIC]

- **operationId:** `ProfileController.deleteExperience`
- **Purpose:** DELETE /api/v1/profile/{userId}/experience/{experienceId}
- **Path params:** userId: string (required); experienceId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 84, "module": "services/profile-service", "handler": "deleteExperience"}; x-authorization: "#userId == authentication.name or hasRole('ADMIN')"

### 9. `GET` /api/v1/profile/{userId}/skills [PUBLIC]

- **operationId:** `ProfileController.getSkills`
- **Purpose:** GET /api/v1/profile/{userId}/skills
- **Path params:** userId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, userId: string, name: string, level: string, category: string, proficiency: integer (required, format: int32), createdAt: string (format: date-time)>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 42, "module": "services/profile-service", "handler": "getSkills"}; x-authorization: "hasAnyRole('USER', 'ADMIN')"

### 10. `POST` /api/v1/profile/{userId}/skills [PUBLIC]

- **operationId:** `ProfileController.addSkill`
- **Purpose:** POST /api/v1/profile/{userId}/skills
- **Path params:** userId: string (required)
- **Request body:** name: string (required), level: string, category: string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, userId: string, name: string, level: string, category: string, proficiency: integer (required, format: int32), createdAt: string (format: date-time), timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 49, "module": "services/profile-service", "handler": "addSkill"}; x-authorization: "#userId == authentication.name or hasRole('ADMIN')"

### 11. `DELETE` /api/v1/profile/{userId}/skills/{skillId} [PUBLIC]

- **operationId:** `ProfileController.deleteSkill`
- **Purpose:** DELETE /api/v1/profile/{userId}/skills/{skillId}
- **Path params:** userId: string (required); skillId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/profile-service/src/main/java/com/talentsphere/profile/controller/ProfileController.java", "line": 58, "module": "services/profile-service", "handler": "deleteSkill"}; x-authorization: "#userId == authentication.name or hasRole('ADMIN')"

---

## Recruiter Domain

**Count: 2 operations**  
Source tag: `application-service`

### 1. `GET` /api/v1/recruiter/applications/recent [PUBLIC]

- **operationId:** `RecruiterController.getRecentApplications`
- **Purpose:** GET /api/v1/recruiter/applications/recent
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), jobId: string, userId: string, status: string, appliedAt: string (format: date-time), resumeUrl: string, coverLetter: string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/RecruiterController.java", "line": 35, "module": "services/application-service", "handler": "getRecentApplications"}

### 2. `GET` /api/v1/recruiter/stats [PUBLIC]

- **operationId:** `RecruiterController.getStats`
- **Purpose:** GET /api/v1/recruiter/stats
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/application-service/src/main/java/com/talentsphere/application/controller/RecruiterController.java", "line": 20, "module": "services/application-service", "handler": "getStats"}

---

## Search Domain

**Count: 4 operations**  
Source tag: `search-service`

### 1. `GET` /api/v1/search/health [PUBLIC]

- **operationId:** `SearchController.health`
- **Purpose:** GET /api/v1/search/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java", "line": 49, "module": "services/search-service", "handler": "health"}

### 2. `GET` /api/v1/search/jobs [PUBLIC]

- **operationId:** `SearchController.searchJobs`
- **Purpose:** GET /api/v1/search/jobs
- **Query params:** query: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java", "line": 23, "module": "services/search-service", "handler": "searchJobs"}

### 3. `GET` /api/v1/search/profiles [PUBLIC]

- **operationId:** `SearchController.searchProfiles`
- **Purpose:** GET /api/v1/search/profiles
- **Query params:** query: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java", "line": 31, "module": "services/search-service", "handler": "searchProfiles"}

### 4. `GET` /api/v1/search/profiles/skills [PUBLIC]

- **operationId:** `SearchController.searchProfilesBySkills`
- **Purpose:** GET /api/v1/search/profiles/skills
- **Query params:** skills: array (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/search-service/src/main/java/com/talentsphere/search/controller/SearchController.java", "line": 41, "module": "services/search-service", "handler": "searchProfilesBySkills"}

---

## Users Domain

**Count: 7 operations**  
Source tag: `user-service`

### 1. `GET` /api/v1/admin/public/stats [ADMIN]

- **operationId:** `AdminController.getPublicStats`
- **Purpose:** GET /api/v1/admin/public/stats
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/user-service/src/main/java/com/talentsphere/user/controller/AdminController.java", "line": 48, "module": "services/user-service", "handler": "getPublicStats"}

### 2. `GET` /api/v1/admin/stats [ADMIN]

- **operationId:** `AdminController.getStats`
- **Purpose:** GET /api/v1/admin/stats
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/user-service/src/main/java/com/talentsphere/user/controller/AdminController.java", "line": 20, "module": "services/user-service", "handler": "getStats"}; x-authorization: "hasRole('ADMIN')"

### 3. `GET` /api/v1/users [PUBLIC]

- **operationId:** `UserController.getAllUsers`
- **Purpose:** GET /api/v1/users
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: array<id: string, version: integer (format: int64), email: string, firstName: string, lastName: string, headline: string, bio: string, profilePictureUrl: string, location: string>, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java", "line": 24, "module": "services/user-service", "handler": "getAllUsers"}; x-authorization: "hasRole('ADMIN') or hasRole('ROLE_ADMIN')"

### 4. `GET` /api/v1/users/health [PUBLIC]

- **operationId:** `UserController.health`
- **Purpose:** GET /api/v1/users/health
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java", "line": 50, "module": "services/user-service", "handler": "health"}

### 5. `GET` /api/v1/users/{id} [PUBLIC]

- **operationId:** `UserController.getProfile`
- **Purpose:** GET /api/v1/users/{id}
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), email: string, firstName: string, lastName: string, headline: string, bio: string, profilePictureUrl: string, location: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java", "line": 17, "module": "services/user-service", "handler": "getProfile"}; x-authorization: "hasRole('USER') or hasRole('ADMIN') or hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')"

### 6. `PUT` /api/v1/users/{id} [PUBLIC]

- **operationId:** `UserController.updateProfile`
- **Purpose:** PUT /api/v1/users/{id}
- **Path params:** id: string (required)
- **Request body:** id: string, version: integer (format: int64), email: string, firstName: string, lastName: string, headline: string, bio: string, profilePictureUrl: string, location: string
- **Success:** `200` -- success: boolean (required), message: string (required), data: id: string, version: integer (format: int64), email: string, firstName: string, lastName: string, headline: string, bio: string, profilePictureUrl: string, location: string, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java", "line": 31, "module": "services/user-service", "handler": "updateProfile"}; x-authorization: "#id == authentication.name or hasRole(\\'ADMIN\\') or hasRole(\\'ROLE_ADMIN\\')"

### 7. `DELETE` /api/v1/users/{id} [PUBLIC]

- **operationId:** `UserController.deleteProfile`
- **Purpose:** DELETE /api/v1/users/{id}
- **Path params:** id: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: null, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java", "line": 42, "module": "services/user-service", "handler": "deleteProfile"}; x-authorization: "hasRole('ADMIN') or hasRole('ROLE_ADMIN')"

---

## Video Domain

**Count: 5 operations**  
Source tag: `video-service`

### 1. `POST` /api/v1/video/schedule [PUBLIC]

- **operationId:** `VideoController.scheduleInterview`
- **Purpose:** POST /api/v1/video/schedule
- **Query params:** jobId: string (required); applicantId: string (required); interviewerId: string (required); scheduledAt: string (required) format: date-time
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java", "line": 19, "module": "services/video-service", "handler": "scheduleInterview"}

### 2. `GET` /api/v1/video/session/{sessionId} [PUBLIC]

- **operationId:** `VideoController.getSession`
- **Purpose:** GET /api/v1/video/session/{sessionId}
- **Path params:** sessionId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java", "line": 28, "module": "services/video-service", "handler": "getSession"}

### 3. `POST` /api/v1/video/session/{sessionId}/end [PUBLIC]

- **operationId:** `VideoController.endSession`
- **Purpose:** POST /api/v1/video/session/{sessionId}/end
- **Path params:** sessionId: string (required)
- **Query params:** recordingUrl: string
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java", "line": 38, "module": "services/video-service", "handler": "endSession"}

### 4. `POST` /api/v1/video/session/{sessionId}/start [PUBLIC]

- **operationId:** `VideoController.startSession`
- **Purpose:** POST /api/v1/video/session/{sessionId}/start
- **Path params:** sessionId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java", "line": 33, "module": "services/video-service", "handler": "startSession"}

### 5. `GET` /api/v1/video/session/{sessionId}/token [PUBLIC]

- **operationId:** `VideoController.getRoomToken`
- **Purpose:** GET /api/v1/video/session/{sessionId}/token
- **Path params:** sessionId: string (required)
- **Request body:** None
- **Success:** `200` -- success: boolean (required), message: string (required), data: object, timestamp: string (required, format: date-time)
- **Errors:** Not defined
- **Auth:** None (public)
- **Extensions:** x-source: {"file": "services/video-service/src/main/java/com/talentsphere/video/controller/VideoController.java", "line": 45, "module": "services/video-service", "handler": "getRoomToken"}

---

## Summary Statistics

| Domain | Count |
|--------|-------|
| Admin | 9 |
| Ai | 8 |
| Applications | 7 |
| Auth | 4 |
| Challenges | 4 |
| Companies | 8 |
| Files | 4 |
| Gamification | 5 |
| Jobs | 8 |
| Lms | 14 |
| Messages | 5 |
| Networking | 8 |
| Notifications | 5 |
| Payments | 5 |
| Profile | 11 |
| Recruiter | 2 |
| Search | 4 |
| Users | 7 |
| Video | 5 |
| **TOTAL** | **123 |

## [OPENAPI-GAP] Operations Lacking Request/Response Schema Detail

- [OPENAPI-GAP] `POST /api/v1/admin/feature-flags/reset-all` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/admin/feature-flags/{flagName}/disable` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/admin/feature-flags/{flagName}/enable` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/admin/feature-flags/{flagName}/reset` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/ai/match-job` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/companies/{id}/verify` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/lms/courses/{courseId}/enroll` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/lms/courses/{courseId}/enrollments/drop` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/lms/courses/{courseId}/enrollments/start` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/lms/courses/{courseId}/lessons/{lessonId}/complete` -- no request body schema defined
- [OPENAPI-GAP] `PATCH /api/v1/messages/read` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/networking/connections/accept/{id}` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/networking/posts/like/{postId}` -- no request body schema defined
- [OPENAPI-GAP] `PATCH /api/v1/notifications/user/{userId}/read-all` -- no request body schema defined
- [OPENAPI-GAP] `PATCH /api/v1/notifications/{id}/read` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/video/schedule` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/video/session/{sessionId}/end` -- no request body schema defined
- [OPENAPI-GAP] `POST /api/v1/video/session/{sessionId}/start` -- no request body schema defined

## Backend Identification

All endpoints share base path `/` with no per-service `servers` differentiation in the spec.

The `securitySchemes` defined in `components` are:


Each domain tag maps to a distinct microservice backend. The architecture appears to be
a Spring Boot / NestJS microservice fleet behind an API gateway, with Bearer JWT as the
primary auth mechanism. No Supabase/PostgREST references were found in the OpenAPI spec.

The `api-gateway` tag (admin feature-flag routes) may sit at the gateway layer, while all
other tags represent individual backend services.
