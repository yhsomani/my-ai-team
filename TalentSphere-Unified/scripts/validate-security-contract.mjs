import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const fail = (message) => {
  console.error(`security contract validation failed: ${message}`);
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

const countOccurrences = (content, pattern) => content.split(pattern).length - 1;

const files = {
  postProcessor: 'services/shared/src/main/java/com/talentsphere/shared/env/MandatoryEnvironmentPostProcessor.java',
  postProcessorTest: 'services/shared/src/test/java/com/talentsphere/shared/env/MandatoryEnvironmentPostProcessorTest.java',
  globalExceptionHandler: 'services/shared/src/main/java/com/talentsphere/shared/GlobalExceptionHandler.java',
  globalExceptionHandlerTest: 'services/shared/src/test/java/com/talentsphere/shared/GlobalExceptionHandlerTest.java',
  fileService: 'services/file-service/src/main/java/com/talentsphere/file/service/FileService.java',
  fileServiceTest: 'services/file-service/src/test/java/com/talentsphere/file/service/FileServiceTest.java',
  schedulerAudit: 'scripts/scheduler-audit.mjs',
  schedulerAuditTest: 'scripts/scheduler-audit.test.mjs',
  savedSearchDigestScript: 'scripts/discover-saved-search-digests.mjs',
  notificationDigestScript: 'scripts/run-notification-digests.mjs',
  networkingReminderScript: 'scripts/run-networking-reminders.mjs',
  serviceTemplate: 'services/ServiceApplicationTemplate.yml',
  notificationConfig: 'services/notification-service/src/main/resources/application.yml',
  infrastructure: 'infra/k8s/base/infrastructure.yaml',
  packageJson: 'package.json',
  moduleManifest: 'module-manifest.json',
  moduleManifestDoc: 'docs/MODULE_MANIFEST.md',
  ci: '../.github/workflows/talentsphere-ci.yml',
};

for (const [label, relativePath] of Object.entries(files)) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    fail(`${label} file is missing: ${relativePath}`);
  }
}

const postProcessor = readText(files.postProcessor);
assertContains(files.postProcessor, postProcessor, 'STRICT_SECRET_VALIDATION_PROPERTY', 'strict secret validation property');
assertContains(files.postProcessor, postProcessor, 'PRODUCTION_ENVIRONMENTS', 'production environment detection');
assertContains(files.postProcessor, postProcessor, 'throw new IllegalStateException(msg)', 'production fail-fast exception');
assertContains(files.postProcessor, postProcessor, 'spring.datasource.password', 'database password validation');
assertContains(files.postProcessor, postProcessor, 'spring.rabbitmq.password', 'RabbitMQ password validation');
assertContains(files.postProcessor, postProcessor, 'spring.data.redis.password', 'Redis password validation');
assertContains(files.postProcessor, postProcessor, 'spring.data.mongodb.uri', 'MongoDB URI validation');
assertContains(files.postProcessor, postProcessor, 'jwt.secret', 'JWT secret validation');
assertContains(files.postProcessor, postProcessor, 'hasConfiguredProperty', 'guarded required-property detection');
assertContains(files.postProcessor, postProcessor, 'normalized.contains("${")', 'unresolved placeholder detection');
assertContains(files.postProcessor, postProcessor, 'PLACEHOLDER_VALUES', 'literal placeholder detection');
assertNotContains(files.postProcessor, postProcessor, 'private static final List<String> MANDATORY_SECRETS', 'legacy warning-only env var list');

const postProcessorTest = readText(files.postProcessorTest);
assertContains(files.postProcessorTest, postProcessorTest, 'productionProfileFailsWhenConfiguredSecretIsUnresolved', 'production missing-secret failure test');
assertContains(files.postProcessorTest, postProcessorTest, 'strictValidationPropertyFailsOutsideProduction', 'explicit strict-mode failure test');
assertContains(files.postProcessorTest, postProcessorTest, 'nonProductionWarnsButDoesNotFail', 'non-production warning-only test');
assertContains(files.postProcessorTest, postProcessorTest, 'productionDoesNotRequireSecretsAServiceDoesNotDeclare', 'service-scoped requirement test');
assertContains(files.postProcessorTest, postProcessorTest, 'productionAllowsResolvedConfiguredSecrets', 'resolved production credential test');

const globalExceptionHandler = readText(files.globalExceptionHandler);
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'CorrelationIdFilter.CORRELATION_ID_MDC_KEY', 'correlation ID lookup');
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'safeMessage', 'safe public error message helper');
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'INTERNAL_ERROR', 'stable internal error code');
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'VALIDATION_ERROR', 'stable validation error code');
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'INVALID_REQUEST', 'stable invalid request error code');
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'ACCESS_DENIED', 'stable access denied error code');
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'errorKey(ObjectError error)', 'field and object validation error key handling');
assertContains(files.globalExceptionHandler, globalExceptionHandler, 'log.error("Unhandled exception correlationId={}"', 'raw exception logging with correlation ID');
assertNotContains(files.globalExceptionHandler, globalExceptionHandler, 'ApiResponse.error(e.getMessage())', 'raw domain exception message returned to clients');
assertNotContains(files.globalExceptionHandler, globalExceptionHandler, 'Internal Nexus Error', 'raw internal exception prefix returned to clients');
assertNotContains(files.globalExceptionHandler, globalExceptionHandler, 'Insufficient Neural Clearances', 'role-themed access-denied copy');
assertNotContains(files.globalExceptionHandler, globalExceptionHandler, 'ApiResponse.success(errors', 'successful validation response for invalid input');

const globalExceptionHandlerTest = readText(files.globalExceptionHandlerTest);
assertContains(files.globalExceptionHandlerTest, globalExceptionHandlerTest, 'generalExceptionReturnsSafePublicMessageWithCorrelationId', 'general exception leakage test');
assertContains(files.globalExceptionHandlerTest, globalExceptionHandlerTest, 'baseExceptionReturnsCodeWithoutRawMessage', 'domain exception leakage test');
assertContains(files.globalExceptionHandlerTest, globalExceptionHandlerTest, 'illegalArgumentReturnsSafeBadRequestMessage', 'invalid request leakage test');
assertContains(files.globalExceptionHandlerTest, globalExceptionHandlerTest, 'accessDeniedReturnsSafeForbiddenMessage', 'access denied leakage test');
assertContains(files.globalExceptionHandlerTest, globalExceptionHandlerTest, 'validationExceptionReturnsErrorResponseWithSafeSummaryAndFieldData', 'validation safe summary test');
assertContains(files.globalExceptionHandlerTest, globalExceptionHandlerTest, 'doesNotContain("secret")', 'raw secret leakage assertion');

const fileService = readText(files.fileService);
assertContains(files.fileService, fileService, 'ALLOWED_CONTENT_TYPES_BY_EXTENSION', 'explicit upload content-type allowlist');
assertContains(files.fileService, fileService, 'validateUploadContent', 'central upload content validation');
assertContains(files.fileService, fileService, 'matchesContentSignature', 'content signature validation');
assertContains(files.fileService, fileService, 'looksLikeActiveContent', 'active content rejection');
assertContains(files.fileService, fileService, 'MalwareScanner', 'malware scanner hook');
assertContains(files.fileService, fileService, 'LocalSignatureMalwareScanner', 'default local malware scan strategy');
assertContains(files.fileService, fileService, 'EICAR_SIGNATURE', 'EICAR test signature detection');
assertContains(files.fileService, fileService, 'File failed malware scan', 'malware scan rejection response');
assertContains(files.fileService, fileService, 'File content type is not allowed', 'MIME rejection response');
assertContains(files.fileService, fileService, 'File content does not match declared type', 'signature mismatch rejection response');
assertContains(files.fileService, fileService, 'File content is not allowed', 'active content rejection response');
assertNotContains(files.fileService, fileService, 'Upload failed: " + e.getMessage()', 'raw upload exception message returned to clients');
assertNotContains(files.fileService, fileService, 'Delete failed: " + e.getMessage()', 'raw delete exception message returned to clients');

const fileServiceTest = readText(files.fileServiceTest);
assertContains(files.fileServiceTest, fileServiceTest, 'uploadFile_RejectsMissingContentType', 'missing content type test');
assertContains(files.fileServiceTest, fileServiceTest, 'uploadFile_RejectsMismatchedContentType', 'MIME mismatch test');
assertContains(files.fileServiceTest, fileServiceTest, 'uploadFile_RejectsSpoofedContentSignature', 'signature mismatch test');
assertContains(files.fileServiceTest, fileServiceTest, 'uploadFile_RejectsActiveContentDisguisedAsText', 'active content test');
assertContains(files.fileServiceTest, fileServiceTest, 'uploadFile_RejectsEicarSignature', 'default malware signature test');
assertContains(files.fileServiceTest, fileServiceTest, 'uploadFile_UsesConfiguredMalwareScannerHook', 'malware scanner hook test');
assertContains(files.fileServiceTest, fileServiceTest, 'docxBytes', 'DOCX signature fixture');
assertContains(files.fileServiceTest, fileServiceTest, 'pdfBytes', 'PDF signature fixture');
assertContains(files.fileServiceTest, fileServiceTest, 'pngBytes', 'PNG signature fixture');
assertContains(files.fileServiceTest, fileServiceTest, 'jpgBytes', 'JPEG signature fixture');

const schedulerAudit = readText(files.schedulerAudit);
assertContains(files.schedulerAudit, schedulerAudit, 'scheduler_run_audit', 'scheduler audit event kind');
assertContains(files.schedulerAudit, schedulerAudit, 'buildSchedulerAuditLogRow', 'scheduler audit row builder');
assertContains(files.schedulerAudit, schedulerAudit, 'recordSchedulerAuditEvent', 'durable scheduler audit writer');
assertContains(files.schedulerAudit, schedulerAudit, 'runWithSchedulerAudit', 'scheduler audit wrapper');
assertContains(files.schedulerAudit, schedulerAudit, "client.from('audit_log').insert(row)", 'audit_log insert');
assertContains(files.schedulerAudit, schedulerAudit, 'secretPattern', 'secret-bearing key redaction');
assertContains(files.schedulerAudit, schedulerAudit, '$1=[redacted]', 'env-secret redaction replacement');
assertContains(files.schedulerAudit, schedulerAudit, "status: 'started'", 'started audit status');
assertContains(files.schedulerAudit, schedulerAudit, "status: 'completed'", 'completed audit status');
assertContains(files.schedulerAudit, schedulerAudit, "status: 'failed'", 'failed audit status');

const schedulerAuditTest = readText(files.schedulerAuditTest);
assertContains(files.schedulerAuditTest, schedulerAuditTest, 'scheduler-audit tests passed', 'scheduler audit helper test');
assertContains(files.schedulerAuditTest, schedulerAuditTest, 'SUPABASE_SERVICE_ROLE_KEY=[redacted]', 'redaction test');
assertContains(files.schedulerAuditTest, schedulerAuditTest, 'scheduler.notification_digest_delivery.started', 'started audit test');
assertContains(files.schedulerAuditTest, schedulerAuditTest, 'scheduler.notification_digest_delivery.completed', 'completed audit test');
assertContains(files.schedulerAuditTest, schedulerAuditTest, 'scheduler.notification_digest_delivery.failed', 'failed audit test');
assertContains(files.schedulerAuditTest, schedulerAuditTest, 'blockedExecuted, false', 'initial audit failure blocks execution test');

const savedSearchDigestScript = readText(files.savedSearchDigestScript);
assertContains(files.savedSearchDigestScript, savedSearchDigestScript, "from './scheduler-audit.mjs'", 'saved-search scheduler audit import');
assertContains(files.savedSearchDigestScript, savedSearchDigestScript, 'runWithSchedulerAudit(client', 'saved-search scheduler audit wrapper');
assertContains(files.savedSearchDigestScript, savedSearchDigestScript, "jobName: 'saved_search_digest_discovery'", 'saved-search scheduler audit job name');
assertContains(files.savedSearchDigestScript, savedSearchDigestScript, 'auditDryRun: options.auditDryRun', 'saved-search explicit dry-run audit option');

const notificationDigestScript = readText(files.notificationDigestScript);
assertContains(files.notificationDigestScript, notificationDigestScript, "from './scheduler-audit.mjs'", 'notification scheduler audit import');
assertContains(files.notificationDigestScript, notificationDigestScript, 'runWithSchedulerAudit(client', 'notification scheduler audit wrapper');
assertContains(files.notificationDigestScript, notificationDigestScript, "jobName: 'notification_digest_delivery'", 'notification scheduler audit job name');
assertContains(files.notificationDigestScript, notificationDigestScript, 'auditDryRun: options.auditDryRun', 'notification explicit dry-run audit option');

const networkingReminderScript = readText(files.networkingReminderScript);
assertContains(files.networkingReminderScript, networkingReminderScript, "from './scheduler-audit.mjs'", 'networking scheduler audit import');
assertContains(files.networkingReminderScript, networkingReminderScript, 'runWithSchedulerAudit(client', 'networking scheduler audit wrapper');
assertContains(files.networkingReminderScript, networkingReminderScript, "jobName: 'networking_reminder_delivery'", 'networking scheduler audit job name');
assertContains(files.networkingReminderScript, networkingReminderScript, 'auditDryRun: options.auditDryRun', 'networking explicit dry-run audit option');

const notificationConfig = readText(files.notificationConfig);
assertContains(files.notificationConfig, notificationConfig, 'RABBITMQ_USER', 'standard RabbitMQ username env var');
assertContains(files.notificationConfig, notificationConfig, 'RABBITMQ_PASSWORD', 'standard RabbitMQ password env var');
assertNotContains(files.notificationConfig, notificationConfig, 'RABBIT_USER', 'legacy notification RabbitMQ username env var');
assertNotContains(files.notificationConfig, notificationConfig, 'RABBIT_PASSWORD', 'legacy notification RabbitMQ password env var');

const serviceTemplate = readText(files.serviceTemplate);
assertContains(files.serviceTemplate, serviceTemplate, 'secret: ${JWT_SECRET}', 'JWT secret without a default fallback');
assertNotContains(files.serviceTemplate, serviceTemplate, 'dev-secret-replace-me', 'default JWT placeholder secret');

const infrastructure = readText(files.infrastructure);
assertContains(files.infrastructure, infrastructure, 'SPRING_PROFILES_ACTIVE: "production"', 'production profile declaration');
assertNotContains(files.infrastructure, infrastructure, 'kind: Secret', 'committed Kubernetes Secret resource with placeholder values');
assertNotContains(files.infrastructure, infrastructure, 'stringData:', 'committed Kubernetes Secret stringData');
assertNotContains(files.infrastructure, infrastructure, 'replace-me', 'placeholder production values');

const servicesDir = path.join(repoRoot, 'infra/k8s/base/services');
const serviceFiles = fs.readdirSync(servicesDir)
  .filter((fileName) => fileName.endsWith('.yaml'))
  .sort();

for (const fileName of serviceFiles) {
  const relativePath = `infra/k8s/base/services/${fileName}`;
  const content = readText(relativePath);
  assertContains(relativePath, content, 'configMapRef:', 'shared config map reference');
  assertContains(relativePath, content, 'name: talentsphere-config', 'talentsphere config map name');
  assertContains(relativePath, content, 'secretRef:', 'runtime secret reference');
  assertContains(relativePath, content, 'name: talentsphere-secrets', 'talentsphere secret name');
  assertNotContains(relativePath, content, 'replace-me', 'placeholder production values');
}

const packageJson = JSON.parse(readText(files.packageJson));
if (packageJson.scripts?.['validate:security-contract'] !== 'node scripts/validate-security-contract.mjs') {
  fail(`${files.packageJson} must expose validate:security-contract`);
}
if (packageJson.scripts?.['test:scheduler-audit'] !== 'node scripts/scheduler-audit.test.mjs') {
  fail(`${files.packageJson} must expose test:scheduler-audit`);
}

const moduleManifest = readText(files.moduleManifest);
assertContains(files.moduleManifest, moduleManifest, 'security-contract-validation', 'security contract validator tooling entry');
assertContains(files.moduleManifest, moduleManifest, 'scripts/validate-security-contract.mjs', 'security contract validator path');

const moduleManifestDoc = readText(files.moduleManifestDoc);
assertContains(files.moduleManifestDoc, moduleManifestDoc, 'npm run validate:security-contract', 'security contract validator command');
assertContains(files.moduleManifestDoc, moduleManifestDoc, 'Security contract', 'security contract validator documentation');

const ci = readText(files.ci);
assertContains(files.ci, ci, 'npm run validate:security-contract', 'security contract validation CI step');
assertContains(files.ci, ci, 'Test scheduler audit helper', 'scheduler audit helper CI step');
assertContains(files.ci, ci, 'npm run test:scheduler-audit', 'scheduler audit helper CI command');
assertContains(files.ci, ci, 'security-scans:', 'dedicated security scan job');
assertContains(files.ci, ci, 'name: Security Scans', 'security scan job name');
assertContains(files.ci, ci, 'Audit frontend/workspace npm dependencies', 'frontend/workspace npm audit step');
assertContains(files.ci, ci, 'Audit extension npm dependencies', 'extension npm audit step');
if (countOccurrences(ci, 'npm audit --audit-level=high') < 2) {
  fail(`${files.ci} must run npm audit for both workspace and extension dependencies`);
}
assertContains(files.ci, ci, 'Scan repository dependencies, configuration, and secrets', 'filesystem security scan step');
assertContains(files.ci, ci, 'aquasecurity/trivy-action@0.30.0', 'Trivy action pin');
assertContains(files.ci, ci, 'scan-type: fs', 'Trivy filesystem scan');
assertContains(files.ci, ci, 'scan-ref: TalentSphere-Unified', 'Trivy filesystem scan target');
assertContains(files.ci, ci, 'scanners: vuln,secret,misconfig', 'dependency, secret, and misconfiguration scanners');
assertContains(files.ci, ci, 'severity: HIGH,CRITICAL', 'high/critical scan threshold');
assertContains(files.ci, ci, 'ignore-unfixed: true', 'unfixed vulnerability handling');
assertContains(files.ci, ci, 'exit-code: "1"', 'failing scan exit code');
assertContains(files.ci, ci, '- security-scans', 'Docker build waits for security scans');
assertContains(files.ci, ci, 'Scan frontend image', 'frontend image scan step');
assertContains(files.ci, ci, 'image-ref: talentsphere-frontend:${{ github.sha }}', 'frontend image scan target');
assertContains(files.ci, ci, 'Scan API gateway image', 'API gateway image scan step');
assertContains(files.ci, ci, 'image-ref: talentsphere-api-gateway:${{ github.sha }}', 'API gateway image scan target');
if (countOccurrences(ci, 'scanners: vuln,secret') < 2) {
  fail(`${files.ci} must run vulnerability and secret scans for each built image`);
}

if (process.exitCode) {
  process.exit();
}

console.log(`security contract validation passed (${serviceFiles.length} Kubernetes service manifests consume runtime secrets; production strict startup validation, safe public error handling, file upload content/security policy, audited service-role scheduler runs, and CI security scans are source-covered)`);
