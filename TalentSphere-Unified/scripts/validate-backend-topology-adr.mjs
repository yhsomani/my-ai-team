import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const adrPath = path.join(repoRoot, 'docs', 'adr', 'ADR-002-backend-topology.md');
const manifestPath = path.join(repoRoot, 'module-manifest.json');
const planPath = path.resolve(repoRoot, '..', 'PLAN.md');
const architectureIndexPath = path.join(repoRoot, 'docs', 'ARCHITECTURE_STATUS_INDEX.md');

const requiredPhrases = [
  'Status: Accepted',
  'modular monolith first',
  'extractable service boundaries',
  'services/chat-service',
  'ADR-004',
  'apps/backend/src/main/resources/application.yml',
  'Not verified from the codebase',
  'npm run validate:backend-topology-adr',
];

const fail = (message) => {
  console.error(`backend topology ADR validation failed: ${message}`);
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

if (!assertExists(adrPath, 'ADR-002') || !assertExists(manifestPath, 'module manifest') || !assertExists(planPath, 'PLAN.md') || !assertExists(architectureIndexPath, 'architecture status index')) {
  process.exit();
}

const adr = readFile(adrPath);
const manifest = readJson(manifestPath);
const plan = readFile(planPath);
const architectureIndex = readFile(architectureIndexPath);

const firstLines = adr.split(/\r?\n/).slice(0, 8).join('\n');
if (!/^>\s*Documentation status:/m.test(firstLines)) {
  fail('ADR-002 is missing a top-level Documentation status banner');
}

for (const phrase of requiredPhrases) {
  if (!adr.includes(phrase)) {
    fail(`ADR-002 is missing required phrase: ${phrase}`);
  }
}

const adrManifestEntry = (manifest.documentation || []).find((entry) => entry.path === 'docs/adr/ADR-002-backend-topology.md');
if (!adrManifestEntry) {
  fail('module-manifest.json does not classify docs/adr/ADR-002-backend-topology.md');
} else {
  if (adrManifestEntry.status !== 'current') fail('ADR-002 manifest status must be current');
  if (adrManifestEntry.kind !== 'accepted-adr') fail('ADR-002 manifest kind must be accepted-adr');
}

const backendModules = manifest.backend?.mavenReactorModules || [];
if (!backendModules.includes('services/api-gateway')) {
  fail('module manifest must keep services/api-gateway in the current active reactor while migration is incomplete');
}
if (!backendModules.includes('services/messaging-service')) {
  fail('module manifest must keep services/messaging-service classified as active current source');
}
const orphanedChat = (manifest.backend?.orphanedMavenModules || []).find((entry) => entry.path === 'services/chat-service');
if (!orphanedChat) {
  fail('module manifest must keep services/chat-service explicitly orphaned until ADR-004 resolves it');
}

if (!fs.existsSync(path.join(repoRoot, 'apps', 'backend', 'src', 'main', 'resources', 'application.yml'))) {
  fail('apps/backend shell evidence is missing');
}

if (plan.includes('| ADR-002 Backend topology | Proposed |')) {
  fail('PLAN.md still lists ADR-002 as Proposed');
}
if (!plan.includes('| ADR-002 Backend topology | Accepted |')) {
  fail('PLAN.md must list ADR-002 as Accepted');
}
if (!plan.includes('- [x] Backend topology ADR accepted.')) {
  fail('PLAN.md backend checklist must mark the topology ADR accepted item complete');
}
if (!architectureIndex.includes('ADR-002 accepts modular monolith first')) {
  fail('ARCHITECTURE_STATUS_INDEX.md must summarize the accepted backend topology decision');
}

if (process.exitCode) {
  process.exit();
}

console.log(`backend topology ADR validation passed (${backendModules.length} active Maven reactor modules; chat-service remains orphaned)`);
