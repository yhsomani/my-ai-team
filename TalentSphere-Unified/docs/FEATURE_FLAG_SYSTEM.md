# TalentSphere Feature Flag System

> Documentation status: Current subsystem reference. Validate implementation details against `services/shared/src/main/java/com/talentsphere/shared/config/Feature.java`.

## Single Source of Truth - Centralized Configuration

---

## Architecture

```
services/shared/src/main/java/com/talentsphere/shared/config/
├── Feature.java                    # SINGLE SOURCE - All 40 flags defined here
├── FeatureFlagConfig.java           # Spring configuration properties
├── FeatureFlagService.java         # Runtime service for flag checks
├── FeatureFlagAspect.java          # AOP aspect for @EnabledForFeature
├── EnabledForFeature.java         # Annotation for method-level gating
└── FeatureFlagAutoConfiguration.java
```

---

## Single Source of Truth (Feature.java)

```java
public enum Feature {
    // CORE - Always Enabled
    enable_auth(true, "Authentication"),
    enable_user_management(true, "User accounts"),
    enable_profile_management(true, "Profile CRUD"),
    
    // Jobs
    enable_job_listings(true, "Job postings"),
    enable_job_recommendations(false, "AI recommendations"),
    enable_application_tracking(false, "Pipeline tracking"),
    
    // LMS
    enable_courses(true, "Course management"),
    enable_course_certificates(false, "Completion certificates"),
    
    // Gamification
    enable_coding_challenges(false, "Code challenges"),
    enable_leaderboards(false, "Leaderboards"),
    enable_achievements(false, "Badges"),
    enable_xp_system(false, "XP points"),
    
    // AI
    enable_ai_resume_analysis(false, "Resume analysis"),
    enable_ai_job_matching(false, "Job matching"),
    
    // ... 40 total features
}
```

---

## Configuration File (feature-flags.yml)

All flags defined in ONE file - no scattered configuration:

```yaml
feature-flags:
  # Core
  enable_auth: true
  enable_user_management: true
  enable_profile_management: true
  
  # Jobs
  enable_job_listings: true
  enable_job_recommendations: false
  enable_application_tracking: false
  
  # Gamification
  enable_coding_challenges: false
  enable_leaderboards: false
  enable_achievements: false
  enable_xp_system: false
  
  # AI
  enable_ai_resume_analysis: false
  enable_ai_job_matching: false

feature-flag:
  use-defaults: true
  cache-enabled: true
```

---

## Clean Import/Access Pattern

### 1. Direct Service Usage (Recommended)
```java
@Service
public class JobService {
    private final FeatureFlagService featureFlagService;

    public ApiResponse<List<Job>> getRecommendedJobs(String userId) {
        // Check flag - single import
        if (!featureFlagService.isEnabled(Feature.enable_job_recommendations)) {
            return ApiResponse.error("Feature disabled");
        }
        // Business logic
    }
}
```

### 2. Annotation-Based (AOP)
```java
@Service
public class RecommendationService {
    @EnabledForFeature(Feature.enable_job_recommendations)
    public List<Job> getPersonalizedJobs(String userId) {
        // Only executes if flag is enabled
    }
}
```

### 3. Programmatic Toggle
```java
// Enable/disable at runtime
featureFlagService.enableFeature(Feature.enable_ai_resume_analysis);
featureFlagService.disableFeature(Feature.enable_coding_challenges);

// Reset to default
featureFlagService.resetFeature(Feature.enable_leaderboards);
```

---

## API Endpoints (via api-gateway)

```bash
# Get all flags with status
GET /api/v1/admin/feature-flags

# Get single flag
GET /api/v1/admin/feature-flags/enable_job_recommendations

# Enable/disable flag
POST /api/v1/admin/feature-flags/enable_ai_resume_analysis/enable
POST /api/v1/admin/feature-flags/enable_coding_challenges/disable
```

---

## Strict Access Rules

1. **NO flag declarations outside Feature.java**
2. **NO boolean constants scattered in code**
3. **All services inject FeatureFlagService**
4. **One import: `com.talentsphere.shared.config.*`**
5. **Run `npm run validate:feature-flags` after changing flags**

`npm run validate:feature-flags` guards the source-level feature flag contract. It verifies that `Feature.java`, `services/shared/src/main/resources/feature-flags.yml`, and `services/bom/application-feature-flags.yml` contain the same stable 40 lower-snake `enable_*` names with matching defaults, no duplicates, enabled core flags, descriptions, and source-level service/controller tests.

---

## Admin Interface

| Flag | Default | Description |
|------|---------|-------------|
| enable_auth | true | Authentication |
| enable_job_listings | true | Job postings |
| enable_job_recommendations | false | AI-powered |
| enable_coding_challenges | false | Judge0 integration |
| enable_leaderboards | false | Gamification |
| enable_ai_resume_analysis | false | AI analysis |

---

## Usage Examples

### Check Before Execution
```java
if (featureFlagService.isEnabled(Feature.enable_job_recommendations)) {
    // Run recommendation engine
}
```

### Feature-Gated Method
```java
@EnabledForFeature(Feature.enable_coding_challenges)
public ApiResponse<SubmissionResult> submitCode(Submission submission) {
    // judge0Client.judge(submission);
}
```

### Default Fallback
```java
// If flag not in config, uses default from Feature enum
boolean enabled = featureFlagService.isEnabled(Feature.enable_analytics);
// Returns: false (default from enum)
```

---

## How to Add New Feature

1. **Add to Feature.java enum:**
```java
enable_new_feature(false, "Description here"),
```

2. **Add to feature-flags.yml:**
```yaml
enable_new_feature: false
```

3. **Use in service:**
```java
if (featureFlagService.isEnabled(Feature.enable_new_feature)) {
    // Feature logic
}
```

---

## Integration Checklist

- [x] Single source: Feature.java enum (40 flags)
- [x] YAML config: feature-flags.yml
- [x] Service: FeatureFlagService for runtime checks
- [x] Annotation: @EnabledForFeature for AOP
- [x] Admin API: FeatureFlagController in gateway
- [x] Clean import pattern established
- [x] Strict access enforced
- [x] Source-level validator: `npm run validate:feature-flags`
