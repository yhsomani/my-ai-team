import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const fail = (message) => {
  console.error(`write fallback safety validation failed: ${message}`);
  process.exitCode = 1;
};

const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    return entryPath.endsWith('.java') ? [entryPath] : [];
  });
};

const relativeToRepo = (absolutePath) => path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');

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

const serviceRoot = path.join(repoRoot, 'services');
const productionJavaFiles = walk(serviceRoot)
  .filter((filePath) => relativeToRepo(filePath).includes('/src/main/java/'))
  .sort();

for (const filePath of productionJavaFiles) {
  const relativePath = relativeToRepo(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  assertNotContains(relativePath, content, /setId\("TEMP_/i, 'temporary persisted-id write fallback');
  assertNotContains(relativePath, content, /setId\("BUFFERED_/i, 'buffered persisted-id write fallback');
  assertNotContains(relativePath, content, /ApiResponse\.success\([\s\S]{0,240}(buffered|temporary|mock persisted|not persisted|Pending Neural Verification)/i, 'successful response for an unpersisted write fallback');
  assertNotContains(relativePath, content, /return\s+ApiResponse\.ok\(\s*null\s*\);\s*\/\/\s*(pretend|fallback|buffered|temporary)/i, 'successful null response for an unpersisted write fallback');
}

const networkingService = readText('services/networking-service/src/main/java/com/talentsphere/networking/service/NetworkingService.java');
assertContains('services/networking-service/src/main/java/com/talentsphere/networking/service/NetworkingService.java', networkingService, 'Connection request could not be persisted', 'explicit connection request fallback failure');
assertContains('services/networking-service/src/main/java/com/talentsphere/networking/service/NetworkingService.java', networkingService, 'Connection acceptance could not be persisted', 'explicit connection accept fallback failure');
assertContains('services/networking-service/src/main/java/com/talentsphere/networking/service/NetworkingService.java', networkingService, 'Connection block could not be persisted', 'explicit connection block fallback failure');

const messagingService = readText('services/messaging-service/src/main/java/com/talentsphere/messaging/service/MessagingService.java');
assertContains('services/messaging-service/src/main/java/com/talentsphere/messaging/service/MessagingService.java', messagingService, 'Message could not be persisted', 'explicit message send fallback failure');
assertContains('services/messaging-service/src/main/java/com/talentsphere/messaging/service/MessagingService.java', messagingService, 'Message read state could not be persisted', 'explicit message read-state fallback failure');

const chatService = readText('services/chat-service/src/main/java/com/talentsphere/chat/service/ChatService.java');
assertContains('services/chat-service/src/main/java/com/talentsphere/chat/service/ChatService.java', chatService, 'Chat message could not be persisted', 'explicit orphaned chat write fallback failure');

const companyService = readText('services/company-service/src/main/java/com/talentsphere/company/service/CompanyService.java');
assertContains('services/company-service/src/main/java/com/talentsphere/company/service/CompanyService.java', companyService, 'Company registration temporarily unavailable. Please try again.', 'company register fallback error response');

const packageJson = JSON.parse(readText('package.json'));
if (packageJson.scripts?.['validate:write-fallback-safety'] !== 'node scripts/validate-write-fallback-safety.mjs') {
  fail('package.json must expose validate:write-fallback-safety');
}

const moduleManifest = readText('module-manifest.json');
assertContains('module-manifest.json', moduleManifest, 'write-fallback-safety-validation', 'write fallback validator tooling entry');
assertContains('module-manifest.json', moduleManifest, 'scripts/validate-write-fallback-safety.mjs', 'write fallback validator path');

const moduleManifestDoc = readText('docs/MODULE_MANIFEST.md');
assertContains('docs/MODULE_MANIFEST.md', moduleManifestDoc, 'npm run validate:write-fallback-safety', 'write fallback validator command');
assertContains('docs/MODULE_MANIFEST.md', moduleManifestDoc, 'Write fallback safety', 'write fallback validator documentation');

const ci = readText('../.github/workflows/talentsphere-ci.yml');
assertContains('../.github/workflows/talentsphere-ci.yml', ci, 'Validate write fallback safety', 'write fallback validation CI step');
assertContains('../.github/workflows/talentsphere-ci.yml', ci, 'npm run validate:write-fallback-safety', 'write fallback validation CI command');

if (process.exitCode) {
  process.exit();
}

console.log(`write fallback safety validation passed (${productionJavaFiles.length} production Java files scanned)`);
