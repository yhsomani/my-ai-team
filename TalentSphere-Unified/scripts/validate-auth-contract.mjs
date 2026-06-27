import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const fail = (message) => {
  console.error(`auth contract validation failed: ${message}`);
  process.exitCode = 1;
};

const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const assertContains = (relativePath, content, pattern, description) => {
  const matched = typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
  if (!matched) {
    fail(`${relativePath} must contain ${description}`);
  }
};

const assertNotContains = (relativePath, content, pattern, description) => {
  const matched = typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
  if (matched) {
    fail(`${relativePath} must not contain ${description}`);
  }
};

const files = {
  adr: 'docs/adr/ADR-001-primary-identity-provider.md',
  authService: 'apps/frontend/src/services/authService.ts',
  app: 'apps/frontend/src/App.tsx',
  apiClient: 'apps/frontend/src/api/axios.ts',
  routeRegistry: 'apps/frontend/src/navigation/routeRegistry.ts',
  gatewayConfig: 'services/api-gateway/src/main/resources/application.yml',
  gatewayPom: 'services/api-gateway/pom.xml',
  authFilter: 'services/api-gateway/src/main/java/com/talentsphere/gateway/filter/AuthenticationFilter.java',
  routeValidator: 'services/api-gateway/src/main/java/com/talentsphere/gateway/filter/RouteValidator.java',
  routeValidatorTest: 'services/api-gateway/src/test/java/com/talentsphere/gateway/filter/RouteValidatorTest.java',
  jwtUtils: 'services/api-gateway/src/main/java/com/talentsphere/gateway/util/JwtUtils.java',
  jwtUtilsTest: 'services/api-gateway/src/test/java/com/talentsphere/gateway/util/JwtUtilsTest.java',
  rateLimitKeyResolvers: 'services/api-gateway/src/main/java/com/talentsphere/gateway/config/RateLimitKeyResolverConfig.java',
  rateLimitKeyResolversTest: 'services/api-gateway/src/test/java/com/talentsphere/gateway/config/RateLimitKeyResolverConfigTest.java',
  authController: 'services/auth-service/src/main/java/com/talentsphere/auth/controller/AuthController.java',
  authSecurityConfig: 'services/auth-service/src/main/java/com/talentsphere/auth/config/SecurityConfig.java',
  authServiceConfig: 'services/auth-service/src/main/resources/application.yml',
  authControllerTest: 'services/auth-service/src/test/java/com/talentsphere/auth/controller/AuthControllerTest.java',
  authControllerDisabledTest: 'services/auth-service/src/test/java/com/talentsphere/auth/controller/AuthControllerLocalCredentialsDisabledTest.java',
  authRegistrationContract: 'services/auth-service/src/test/resources/contracts/registration/shouldRegisterNewUser.groovy',
};

for (const [label, relativePath] of Object.entries(files)) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    fail(`${label} file is missing: ${relativePath}`);
  }
}

const adr = readText(files.adr);
assertContains(files.adr, adr, 'Status: Accepted', 'accepted ADR status');
assertContains(files.adr, adr, 'Supabase Auth is the primary login', 'Supabase Auth primary-authority decision');

const authService = readText(files.authService);
assertContains(files.authService, authService, 'supabase.auth.signUp', 'Supabase signup call');
assertContains(files.authService, authService, 'supabase.auth.signInWithPassword', 'Supabase password login call');
assertContains(files.authService, authService, 'supabase.auth.signOut', 'Supabase logout call');
assertContains(files.authService, authService, 'supabase.auth.getSession', 'Supabase session read');

const app = readText(files.app);
assertContains(files.app, app, 'supabase.auth.getSession()', 'Supabase startup session bootstrap');
assertContains(files.app, app, 'supabase.auth.onAuthStateChange', 'Supabase auth-state subscription');
assertContains(files.app, app, 'import.meta.env.DEV', 'development-only mock-user gate');

const apiClient = readText(files.apiClient);
assertContains(files.apiClient, apiClient, 'supabase.auth.getSession()', 'Supabase session token read');
assertContains(files.apiClient, apiClient, /Authorization\s*=\s*`Bearer \$\{session\.access_token\}`/, 'Bearer access-token header installation');

const routeRegistry = readText(files.routeRegistry);
assertContains(files.routeRegistry, routeRegistry, "user: 'ROLE_USER'", 'ROLE_USER route role');
assertContains(files.routeRegistry, routeRegistry, "recruiter: 'ROLE_RECRUITER'", 'ROLE_RECRUITER route role');
assertContains(files.routeRegistry, routeRegistry, "admin: 'ROLE_ADMIN'", 'ROLE_ADMIN route role');

const gatewayConfig = readText(files.gatewayConfig);
assertContains(files.gatewayConfig, gatewayConfig, /^jwt:\n\s+secret:\s+\$\{JWT_SECRET\}/m, 'single HMAC JWT_SECRET verifier configuration');
assertNotContains(files.gatewayConfig, gatewayConfig, 'jwk-set-uri', 'unused JWKS URI while JwtUtils uses HMAC validation');

const gatewayPom = readText(files.gatewayPom);
assertContains(files.gatewayPom, gatewayPom, 'spring-boot-starter-data-redis-reactive', 'reactive Redis dependency required by Gateway RequestRateLimiter');

const authFilter = readText(files.authFilter);
assertContains(files.authFilter, authFilter, 'jwtUtils.validateToken(authHeader)', 'Gateway token validation call');
assertContains(files.authFilter, authFilter, 'jwtUtils.getAuthenticatedUserId(claims)', 'normalized authenticated user ID forwarding');
assertContains(files.authFilter, authFilter, 'jwtUtils.getPrimaryRole(claims)', 'normalized role forwarding');
assertNotContains(files.authFilter, authFilter, 'claims.getStringClaim("role")', 'raw role-claim forwarding');

const routeValidator = readText(files.routeValidator);
assertContains(files.routeValidator, routeValidator, 'openApiEndpoints.contains(path)', 'exact public endpoint matching');
assertContains(files.routeValidator, routeValidator, 'openPathPrefixes', 'explicit public path prefixes');
assertNotContains(files.routeValidator, routeValidator, 'getPath().contains', 'substring-based public endpoint matching');

const routeValidatorTest = readText(files.routeValidatorTest);
assertContains(files.routeValidatorTest, routeValidatorTest, 'protectedPathsContainingPublicPathTextRemainSecured', 'substring-bypass route validator test');
assertContains(files.routeValidatorTest, routeValidatorTest, 'eurekaPrefixIsExplicitlyPublic', 'explicit public prefix route validator test');

for (const routeId of ['auth-service', 'ai-service', 'challenge-service', 'messaging-service', 'file-service']) {
  assertContains(files.gatewayConfig, gatewayConfig, `- id: ${routeId}`, `${routeId} route`);
}
assertNotContains(files.gatewayConfig, gatewayConfig, 'default-filters:\n        - RequestRateLimiter', 'broad default route limiter replacing sensitive route-specific limits');
assertContains(files.gatewayConfig, gatewayConfig, 'key-resolver: "#{@ipKeyResolver}"', 'IP key resolver for public auth rate limits');
assertContains(files.gatewayConfig, gatewayConfig, 'key-resolver: "#{@userOrIpKeyResolver}"', 'identity/IP key resolver for authenticated sensitive route limits');
assertContains(files.gatewayConfig, gatewayConfig, 'redis-rate-limiter.replenishRate: 10', 'auth and AI rate limiter replenish rate');
assertContains(files.gatewayConfig, gatewayConfig, 'redis-rate-limiter.replenishRate: 30', 'challenge rate limiter replenish rate');
assertContains(files.gatewayConfig, gatewayConfig, 'redis-rate-limiter.replenishRate: 60', 'messaging rate limiter replenish rate');
assertContains(files.gatewayConfig, gatewayConfig, 'redis-rate-limiter.replenishRate: 20', 'file upload/download rate limiter replenish rate');

const rateLimitKeyResolvers = readText(files.rateLimitKeyResolvers);
assertContains(files.rateLimitKeyResolvers, rateLimitKeyResolvers, 'KeyResolver ipKeyResolver()', 'IP key resolver bean');
assertContains(files.rateLimitKeyResolvers, rateLimitKeyResolvers, 'KeyResolver userOrIpKeyResolver()', 'user-or-IP key resolver bean');
assertContains(files.rateLimitKeyResolvers, rateLimitKeyResolvers, 'X-Forwarded-For', 'forwarded IP handling');
assertContains(files.rateLimitKeyResolvers, rateLimitKeyResolvers, 'X-User-Id', 'authenticated user rate-limit key handling');
assertContains(files.rateLimitKeyResolvers, rateLimitKeyResolvers, 'defaultIfEmpty("ip:" + clientIp(exchange))', 'IP fallback for authenticated route limiter');
assertContains(files.rateLimitKeyResolvers, rateLimitKeyResolvers, 'replaceAll("[^a-zA-Z0-9._:@-]", "_")', 'rate-limit key sanitization');

const rateLimitKeyResolversTest = readText(files.rateLimitKeyResolversTest);
assertContains(files.rateLimitKeyResolversTest, rateLimitKeyResolversTest, 'ipKeyResolverUsesFirstForwardedForAddress', 'forwarded IP key resolver test');
assertContains(files.rateLimitKeyResolversTest, rateLimitKeyResolversTest, 'userOrIpKeyResolverUsesGatewayForwardedUserId', 'user ID key resolver test');
assertContains(files.rateLimitKeyResolversTest, rateLimitKeyResolversTest, 'userOrIpKeyResolverSanitizesHeaderValues', 'rate-limit key sanitization test');
assertContains(files.rateLimitKeyResolversTest, rateLimitKeyResolversTest, 'userOrIpKeyResolverFallsBackToIpWhenNoUserExists', 'identity fallback key resolver test');

const jwtUtils = readText(files.jwtUtils);
assertContains(files.jwtUtils, jwtUtils, 'MACVerifier', 'HMAC JWT verifier implementation');
assertContains(files.jwtUtils, jwtUtils, 'ROLE_USER', 'least-privileged role constant');
assertContains(files.jwtUtils, jwtUtils, 'ROLE_RECRUITER', 'recruiter role constant');
assertContains(files.jwtUtils, jwtUtils, 'ROLE_ADMIN', 'admin role constant');
assertContains(files.jwtUtils, jwtUtils, 'getAuthenticatedUserId', 'authenticated user ID extraction helper');
assertContains(files.jwtUtils, jwtUtils, 'getPrimaryRole', 'primary role normalization helper');
assertContains(files.jwtUtils, jwtUtils, 'app_metadata', 'Supabase app_metadata role extraction');
assertContains(files.jwtUtils, jwtUtils, 'user_metadata', 'Supabase user_metadata role extraction');

const jwtUtilsTest = readText(files.jwtUtilsTest);
assertContains(files.jwtUtilsTest, jwtUtilsTest, 'readsSupabaseMetadataRoles', 'Supabase metadata role test');
assertContains(files.jwtUtilsTest, jwtUtilsTest, 'defaultsToLeastPrivilegedRoleWhenNoKnownRoleExists', 'least-privilege fallback test');
assertContains(files.jwtUtilsTest, jwtUtilsTest, 'usesSubjectAsAuthenticatedUserIdForSupabaseStyleTokens', 'Supabase subject user ID test');

const authController = readText(files.authController);
assertContains(files.authController, authController, 'talentsphere.auth.local-credentials.enabled:false', 'default-disabled local credential feature flag');
assertContains(files.authController, authController, 'HttpStatus.GONE', '410 Gone response for disabled local credential endpoints');
assertContains(files.authController, authController, 'Local credential registration is disabled. Use Supabase Auth.', 'disabled registration message');
assertContains(files.authController, authController, 'Local credential login is disabled. Use Supabase Auth.', 'disabled login message');

const authServiceConfig = readText(files.authServiceConfig);
assertContains(files.authServiceConfig, authServiceConfig, 'AUTH_LOCAL_CREDENTIALS_ENABLED:false', 'default false auth-service local credential configuration');

const authSecurityConfig = readText(files.authSecurityConfig);
assertContains(files.authSecurityConfig, authSecurityConfig, '/api/v1/auth/.well-known/jwks.json', 'actual auth-service JWKS public path');
assertNotContains(files.authSecurityConfig, authSecurityConfig, '/api/v1/auth/jwks.json', 'stale auth-service JWKS public path');

const authControllerTest = readText(files.authControllerTest);
assertContains(files.authControllerTest, authControllerTest, 'talentsphere.auth.local-credentials.enabled=true', 'explicit opt-in controller test property');
assertContains(files.authControllerTest, authControllerTest, 'post("/api/v1/auth/register")', 'versioned register route test');
assertContains(files.authControllerTest, authControllerTest, 'post("/api/v1/auth/login")', 'versioned login route test');

const authControllerDisabledTest = readText(files.authControllerDisabledTest);
assertContains(files.authControllerDisabledTest, authControllerDisabledTest, 'talentsphere.auth.local-credentials.enabled=false', 'default-disabled controller test property');
assertContains(files.authControllerDisabledTest, authControllerDisabledTest, 'status().isGone()', 'disabled local credential HTTP status tests');
assertContains(files.authControllerDisabledTest, authControllerDisabledTest, 'never()).register', 'disabled registration avoids service call');
assertContains(files.authControllerDisabledTest, authControllerDisabledTest, 'never()).login', 'disabled login avoids service call');

const authRegistrationContract = readText(files.authRegistrationContract);
assertContains(files.authRegistrationContract, authRegistrationContract, "url '/api/v1/auth/register'", 'versioned auth registration contract path');
assertContains(files.authRegistrationContract, authRegistrationContract, 'status GONE()', 'disabled-by-default registration contract status');

if (process.exitCode) {
  process.exit();
}

console.log('auth contract validation passed (Supabase primary auth, HMAC Gateway verifier config, exact public-route matching, normalized ROLE_* forwarding, sensitive-route rate limits, local credentials disabled by default)');
