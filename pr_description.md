🧪 Add comprehensive tests for FeatureFlagController

🎯 **What:** The `FeatureFlagController` was completely untested and missing explicit `@PathVariable` name declarations.

📊 **Coverage:** Covered all endpoint logic including successful requests and handling for incorrect input strings.
- `GET /api/v1/admin/feature-flags`
- `GET /api/v1/admin/feature-flags/{flagName}` (Success & unknown flag error paths)
- `POST /api/v1/admin/feature-flags/{flagName}/enable`
- `POST /api/v1/admin/feature-flags/{flagName}/disable`
- `POST /api/v1/admin/feature-flags/{flagName}/reset`
- `POST /api/v1/admin/feature-flags/reset-all`
- `GET /api/v1/admin/feature-flags/enabled`
- `GET /api/v1/admin/feature-flags/core`
- `GET /api/v1/admin/feature-flags/categories`

✨ **Result:** Test coverage for `FeatureFlagController` is improved to near 100%, and a known Spring Boot 3.2+ compatibility issue with missing path variable names when compiling without `-parameters` flag has been preemptively solved.
