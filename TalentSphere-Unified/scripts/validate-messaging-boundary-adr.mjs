import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const adrPath = path.join(repoRoot, 'docs', 'adr', 'ADR-004-messaging-boundary.md');
const manifestPath = path.join(repoRoot, 'module-manifest.json');
const planPath = path.resolve(repoRoot, '..', 'PLAN.md');
const architectureIndexPath = path.join(repoRoot, 'docs', 'ARCHITECTURE_STATUS_INDEX.md');
const moduleManifestDocPath = path.join(repoRoot, 'docs', 'MODULE_MANIFEST.md');
const apiReportPath = path.join(repoRoot, 'docs', 'API_CONTRACT_MISMATCH_REPORT.md');
const openApiPath = path.join(repoRoot, 'docs', 'API_OPENAPI_CONTRACT.json');
const packageJsonPath = path.join(repoRoot, 'package.json');

const requiredAdrPhrases = [
  'Status: Accepted',
  'one messaging domain boundary',
  'services/messaging-service',
  'services/chat-service',
  'not a deployable product boundary',
  'orphaned and quarantined',
  '/api/v1/chat/*',
  'x-talentsphere.nonActiveOperations',
  'Not verified from the codebase',
  'npm run validate:messaging-boundary-adr',
];

const fail = (message) => {
  console.error(`messaging boundary ADR validation failed: ${message}`);
  process.exitCode = 1;
};

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readFile(filePath));

const assertExists = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    fail(`${label} is missing at ${path.relative(repoRoot, filePath)}`);
    return false;
  }
  return true;
};

const requiredFiles = [
  [adrPath, 'ADR-004'],
  [manifestPath, 'module manifest'],
  [planPath, 'PLAN.md'],
  [architectureIndexPath, 'architecture status index'],
  [moduleManifestDocPath, 'module manifest docs'],
  [apiReportPath, 'API contract report'],
  [openApiPath, 'OpenAPI contract'],
  [packageJsonPath, 'package.json'],
  [path.join(repoRoot, 'services', 'messaging-service', 'pom.xml'), 'active messaging service'],
  [path.join(repoRoot, 'services', 'chat-service', 'pom.xml'), 'orphaned chat service'],
];

let missing = false;
for (const [filePath, label] of requiredFiles) {
  if (!assertExists(filePath, label)) missing = true;
}
if (missing) process.exit();

const adr = readFile(adrPath);
const manifest = readJson(manifestPath);
const plan = readFile(planPath);
const architectureIndex = readFile(architectureIndexPath);
const moduleManifestDoc = readFile(moduleManifestDocPath);
const apiReport = readFile(apiReportPath);
const openApi = readJson(openApiPath);
const packageJson = readJson(packageJsonPath);

const firstLines = adr.split(/\r?\n/).slice(0, 8).join('\n');
if (!/^>\s*Documentation status:/m.test(firstLines)) {
  fail('ADR-004 is missing a top-level Documentation status banner');
}

for (const phrase of requiredAdrPhrases) {
  if (!adr.includes(phrase)) {
    fail(`ADR-004 is missing required phrase: ${phrase}`);
  }
}

const adrManifestEntry = (manifest.documentation || []).find((entry) => entry.path === 'docs/adr/ADR-004-messaging-boundary.md');
if (!adrManifestEntry) {
  fail('module-manifest.json does not classify docs/adr/ADR-004-messaging-boundary.md');
} else {
  if (adrManifestEntry.status !== 'current') fail('ADR-004 manifest status must be current');
  if (adrManifestEntry.kind !== 'accepted-adr') fail('ADR-004 manifest kind must be accepted-adr');
}

const validatorEntry = (manifest.tooling || []).find((entry) => entry.path === 'scripts/validate-messaging-boundary-adr.mjs');
if (!validatorEntry) {
  fail('module-manifest.json does not classify scripts/validate-messaging-boundary-adr.mjs');
} else {
  if (validatorEntry.status !== 'active') fail('messaging boundary validator manifest status must be active');
  if (validatorEntry.kind !== 'node-script') fail('messaging boundary validator manifest kind must be node-script');
}

if (packageJson.scripts?.['validate:messaging-boundary-adr'] !== 'node scripts/validate-messaging-boundary-adr.mjs') {
  fail('package.json is missing validate:messaging-boundary-adr script');
}

const activeModules = manifest.backend?.mavenReactorModules || [];
if (!activeModules.includes('services/messaging-service')) {
  fail('services/messaging-service must remain active while it is the current messaging boundary source');
}
if (activeModules.includes('services/chat-service')) {
  fail('services/chat-service must not be active in the Maven reactor under ADR-004');
}

const orphanedChat = (manifest.backend?.orphanedMavenModules || []).find((entry) => entry.path === 'services/chat-service');
if (!orphanedChat) {
  fail('services/chat-service must remain explicitly orphaned until retirement/merge execution is complete');
} else {
  const text = `${orphanedChat.reason || ''} ${orphanedChat.requiredResolution || ''}`.toLowerCase();
  if (!text.includes('adr-004')) fail('chat-service orphaned-module reason must reference ADR-004');
  if (!text.includes('retire') || !text.includes('merge')) fail('chat-service orphaned-module resolution must require retire/merge work');
}

if (plan.includes('| ADR-004 Messaging boundary | Proposed |')) {
  fail('PLAN.md still lists ADR-004 as Proposed');
}
if (!plan.includes('| ADR-004 Messaging boundary | Accepted |')) {
  fail('PLAN.md must list ADR-004 as Accepted');
}
if (!plan.includes('- [x] Messaging boundary ADR accepted.')) {
  fail('PLAN.md backend checklist must mark the messaging boundary ADR accepted item complete');
}
if (!plan.includes('Runtime WebSocket/STOMP behavior, Mongo connectivity, message ordering/dedupe, attachment signed access, and backend Maven execution remain Not verified from the codebase.')) {
  fail('PLAN.md must keep messaging boundary runtime limits explicit');
}

if (!architectureIndex.includes('ADR-004 accepts one messaging domain boundary')) {
  fail('ARCHITECTURE_STATUS_INDEX.md must summarize the accepted messaging boundary decision');
}
if (!moduleManifestDoc.includes('npm run validate:messaging-boundary-adr')) {
  fail('docs/MODULE_MANIFEST.md must document the messaging boundary ADR validator');
}

const chatRouteRows = apiReport
  .split(/\r?\n/)
  .filter((line) => line.includes('| orphaned | services/chat-service |') && line.includes('/api/v1/chat/'));
if (chatRouteRows.length !== 3) {
  fail(`API contract report must keep exactly 3 orphaned chat-service routes, found ${chatRouteRows.length}`);
}
if (!apiReport.includes('| POST | /api/v1/messages/send |')) {
  fail('API contract report must keep active messaging-service send route');
}

const deployablePaths = Object.keys(openApi.paths || {});
const deployableChatPaths = deployablePaths.filter((apiPath) => apiPath.startsWith('/api/v1/chat'));
if (deployableChatPaths.length > 0) {
  fail(`OpenAPI deployable paths must not include chat-service routes: ${deployableChatPaths.join(', ')}`);
}
const nonActiveChatOperations = openApi['x-talentsphere']?.nonActiveOperations
  ?.filter((operation) => operation.module === 'services/chat-service' && operation.path?.startsWith('/api/v1/chat')) || [];
if (nonActiveChatOperations.length !== 3) {
  fail(`OpenAPI contract must record exactly 3 non-active chat-service operations, found ${nonActiveChatOperations.length}`);
}

if (process.exitCode) {
  process.exit();
}

console.log(`messaging boundary ADR validation passed (${chatRouteRows.length} orphaned chat routes; ${nonActiveChatOperations.length} non-active OpenAPI chat operations)`);
