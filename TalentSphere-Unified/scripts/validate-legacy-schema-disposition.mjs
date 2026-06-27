import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const dispositionPath = path.join(repoRoot, 'infra', 'db', 'legacy-schema-disposition.json');
const dataOwnershipPath = path.join(repoRoot, 'data-ownership-manifest.json');
const moduleManifestPath = path.join(repoRoot, 'module-manifest.json');
const canonicalBaselinePath = path.join(repoRoot, 'infra', 'db', 'migrations', '0001_initial_baseline.sql');
const legacyMasterPath = path.join(repoRoot, 'infra', 'supabase_master.sql');

const fail = (message) => {
  console.error(`legacy schema disposition validation failed: ${message}`);
  process.exitCode = 1;
};

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readText(filePath));
const resolveRepo = (relativePath) => path.join(repoRoot, relativePath);

const extractTables = (sql) => new Set(Array.from(
  sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)/gi),
  (match) => match[1],
));

for (const filePath of [dispositionPath, dataOwnershipPath, moduleManifestPath, canonicalBaselinePath, legacyMasterPath]) {
  if (!fs.existsSync(filePath)) fail(`required file is missing: ${path.relative(repoRoot, filePath)}`);
}
if (process.exitCode) process.exit();

const disposition = readJson(dispositionPath);
const dataOwnership = readJson(dataOwnershipPath);
const moduleManifest = readJson(moduleManifestPath);
const canonicalTables = extractTables(readText(canonicalBaselinePath));
const legacyTables = extractTables(readText(legacyMasterPath));

if (disposition.schemaVersion !== 1) fail(`unsupported disposition schemaVersion ${disposition.schemaVersion}`);
if (disposition.canonicalBaseline !== 'infra/db/migrations/0001_initial_baseline.sql') fail('canonicalBaseline must point at the current baseline migration');
if (disposition.legacyMaster !== 'infra/supabase_master.sql') fail('legacyMaster must point at infra/supabase_master.sql');

const ownershipByTable = new Map((dataOwnership.tables || []).map((entry) => [entry.name, entry]));
const expectedLegacyOnly = (dataOwnership.tables || [])
  .filter((entry) => entry.migrationStatus === 'legacy-master-only')
  .map((entry) => entry.name)
  .sort();
const expectedDuplicates = (dataOwnership.tables || [])
  .filter((entry) => entry.migrationStatus === 'multiple-reviewed-sql-sources')
  .map((entry) => entry.name)
  .sort();

const actualLegacyOnly = (disposition.legacyMasterOnly || []).map((entry) => entry.table).sort();
const actualDuplicates = (disposition.duplicateReviewedSources || []).map((entry) => entry.table).sort();

const assertSame = (label, actual, expected) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} mismatch.\nExpected: ${expected.join(', ')}\nActual: ${actual.join(', ')}`);
  }
};

assertSame('legacy-master-only disposition tables', actualLegacyOnly, expectedLegacyOnly);
assertSame('duplicate reviewed-source disposition tables', actualDuplicates, expectedDuplicates);

const serviceSqlHasTable = (relativePath, table) => {
  const filePath = resolveRepo(relativePath);
  if (!fs.existsSync(filePath)) return false;
  if (!relativePath.endsWith('.sql')) return true;
  return extractTables(readText(filePath)).has(table);
};

for (const entry of disposition.legacyMasterOnly || []) {
  const ownership = ownershipByTable.get(entry.table);
  if (!ownership) fail(`legacy-only table ${entry.table} is not in data-ownership-manifest.json`);
  if (entry.domain !== ownership?.domain) fail(`legacy-only table ${entry.table} domain drifted from data ownership manifest`);
  if (entry.targetOwner !== ownership?.targetOwner) fail(`legacy-only table ${entry.table} targetOwner drifted from data ownership manifest`);
  if (!legacyTables.has(entry.table)) fail(`legacy-only table ${entry.table} is missing from infra/supabase_master.sql`);
  if (canonicalTables.has(entry.table)) fail(`legacy-only table ${entry.table} should not exist in the canonical baseline`);
  if (!entry.disposition) fail(`legacy-only table ${entry.table} is missing disposition`);
  if (!entry.requiredResolution) fail(`legacy-only table ${entry.table} is missing requiredResolution`);
  if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) fail(`legacy-only table ${entry.table} is missing evidence`);

  for (const evidencePath of entry.evidence || []) {
    if (!fs.existsSync(resolveRepo(evidencePath))) fail(`evidence for ${entry.table} is missing: ${evidencePath}`);
    if (evidencePath.endsWith('.sql') && !serviceSqlHasTable(evidencePath, entry.table)) {
      fail(`SQL evidence ${evidencePath} does not define ${entry.table}`);
    }
  }
}

for (const entry of disposition.duplicateReviewedSources || []) {
  const ownership = ownershipByTable.get(entry.table);
  if (!ownership) fail(`duplicate-source table ${entry.table} is not in data-ownership-manifest.json`);
  if (entry.domain !== ownership?.domain) fail(`duplicate-source table ${entry.table} domain drifted from data ownership manifest`);
  if (entry.targetOwner !== ownership?.targetOwner) fail(`duplicate-source table ${entry.table} targetOwner drifted from data ownership manifest`);
  if (!canonicalTables.has(entry.table)) fail(`duplicate-source table ${entry.table} is missing from canonical baseline`);
  if (!legacyTables.has(entry.table)) fail(`duplicate-source table ${entry.table} is missing from legacy master`);
  if (entry.disposition !== 'canonical-baseline-preferred') fail(`duplicate-source table ${entry.table} must prefer the canonical baseline`);
  if (!entry.requiredResolution) fail(`duplicate-source table ${entry.table} is missing requiredResolution`);
  if (!Array.isArray(entry.serviceMigrationSources) || entry.serviceMigrationSources.length === 0) {
    fail(`duplicate-source table ${entry.table} is missing serviceMigrationSources`);
  }

  for (const migrationPath of entry.serviceMigrationSources || []) {
    if (!serviceSqlHasTable(migrationPath, entry.table)) {
      fail(`service migration source ${migrationPath} does not define ${entry.table}`);
    }
  }
}

const chatService = moduleManifest.backend?.orphanedMavenModules?.find((entry) => entry.path === 'services/chat-service');
const chatMessages = disposition.legacyMasterOnly?.find((entry) => entry.table === 'chat_messages');
if (!chatService) fail('chat-service must remain explicitly orphaned while chat_messages retirement is pending');
if (chatMessages?.disposition !== 'orphaned-chat-service-retirement-pending') {
  fail('chat_messages must remain classified as orphaned-chat-service-retirement-pending');
}

if (process.exitCode) process.exit();

console.log(`legacy schema disposition validation passed (${actualLegacyOnly.length} legacy-only tables, ${actualDuplicates.length} duplicate-source tables)`);
