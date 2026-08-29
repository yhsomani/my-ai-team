import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const adrPath = path.join(repoRoot, 'docs', 'adr', 'ADR-003-schema-authority.md');
const manifestPath = path.join(repoRoot, 'module-manifest.json');
const dataOwnershipPath = path.join(repoRoot, 'data-ownership-manifest.json');
const planPath = path.resolve(repoRoot, '..', 'PLAN.md');
const architectureIndexPath = path.join(repoRoot, 'docs', 'ARCHITECTURE_STATUS_INDEX.md');
const moduleManifestDocPath = path.join(repoRoot, 'docs', 'MODULE_MANIFEST.md');
const dataOwnershipDocPath = path.join(repoRoot, 'docs', 'DATA_OWNERSHIP.md');
const dbWorkspacePath = path.join(repoRoot, 'infra', 'db', 'README.md');
const packageJsonPath = path.join(repoRoot, 'package.json');
const baselineMigrationPath = path.join(repoRoot, 'infra', 'db', 'migrations', '0001_initial_baseline.sql');
const generatedTypesPath = path.join(repoRoot, 'infra', 'db', 'generated', 'database.types.ts');
const legacyDispositionPath = path.join(repoRoot, 'infra', 'db', 'legacy-schema-disposition.json');
const migrationValidatorPath = path.join(repoRoot, 'scripts', 'validate-schema-migrations.mjs');
const legacyDispositionValidatorPath = path.join(repoRoot, 'scripts', 'validate-legacy-schema-disposition.mjs');
const dbTypeGeneratorPath = path.join(repoRoot, 'scripts', 'generate-db-types.mjs');

const requiredAdrPhrases = [
  'Status: Accepted',
  'migration-first Supabase/Postgres authority',
  'generated TypeScript types',
  'backend validation',
  'infra/db/migrations',
  '0001_initial_baseline.sql',
  'supabase-schema.sql',
  'infra/supabase_master.sql',
  'database.types.ts',
  'legacy-schema-disposition.json',
  'npm run validate:schema-migrations',
  'npm run validate:legacy-schema-disposition',
  'npm run report:db-types',
  'data-ownership-manifest.json',
  'RLS/security policy source',
  'Not verified from the codebase',
  'npm run validate:schema-authority-adr',
];

const fail = (message) => {
  console.error(`schema authority ADR validation failed: ${message}`);
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
  [adrPath, 'ADR-003'],
  [manifestPath, 'module manifest'],
  [dataOwnershipPath, 'data ownership manifest'],
  [planPath, 'PLAN.md'],
  [architectureIndexPath, 'architecture status index'],
  [moduleManifestDocPath, 'module manifest docs'],
  [dataOwnershipDocPath, 'data ownership docs'],
  [dbWorkspacePath, 'schema authority workspace README'],
  [packageJsonPath, 'package.json'],
  [baselineMigrationPath, 'initial baseline migration'],
  [generatedTypesPath, 'generated database types'],
  [legacyDispositionPath, 'legacy schema disposition'],
  [migrationValidatorPath, 'schema migration validator'],
  [legacyDispositionValidatorPath, 'legacy schema disposition validator'],
  [dbTypeGeneratorPath, 'database type generator'],
  [path.join(repoRoot, 'supabase-schema.sql'), 'reviewed schema baseline'],
  [path.join(repoRoot, 'infra', 'supabase_master.sql'), 'legacy master schema'],
];

let missing = false;
for (const [filePath, label] of requiredFiles) {
  if (!assertExists(filePath, label)) missing = true;
}
if (missing) process.exit();

const adr = readFile(adrPath);
const manifest = readJson(manifestPath);
const dataOwnership = readJson(dataOwnershipPath);
const plan = readFile(planPath);
const architectureIndex = readFile(architectureIndexPath);
const moduleManifestDoc = readFile(moduleManifestDocPath);
const dataOwnershipDoc = readFile(dataOwnershipDocPath);
const dbWorkspace = readFile(dbWorkspacePath);
const packageJson = readJson(packageJsonPath);

const firstLines = adr.split(/\r?\n/).slice(0, 8).join('\n');
if (!/^>\s*Documentation status:/m.test(firstLines)) {
  fail('ADR-003 is missing a top-level Documentation status banner');
}

for (const phrase of requiredAdrPhrases) {
  if (!adr.includes(phrase)) {
    fail(`ADR-003 is missing required phrase: ${phrase}`);
  }
}

const adrManifestEntry = (manifest.documentation || []).find((entry) => entry.path === 'docs/adr/ADR-003-schema-authority.md');
if (!adrManifestEntry) {
  fail('module-manifest.json does not classify docs/adr/ADR-003-schema-authority.md');
} else {
  if (adrManifestEntry.status !== 'current') fail('ADR-003 manifest status must be current');
  if (adrManifestEntry.kind !== 'accepted-adr') fail('ADR-003 manifest kind must be accepted-adr');
}

const validatorEntry = (manifest.tooling || []).find((entry) => entry.path === 'scripts/validate-schema-authority-adr.mjs');
if (!validatorEntry) {
  fail('module-manifest.json does not classify scripts/validate-schema-authority-adr.mjs');
} else {
  if (validatorEntry.status !== 'active') fail('schema authority validator manifest status must be active');
  if (validatorEntry.kind !== 'node-script') fail('schema authority validator manifest kind must be node-script');
}

const migrationValidatorEntry = (manifest.tooling || []).find((entry) => entry.path === 'scripts/validate-schema-migrations.mjs');
if (!migrationValidatorEntry) {
  fail('module-manifest.json does not classify scripts/validate-schema-migrations.mjs');
} else {
  if (migrationValidatorEntry.status !== 'active') fail('schema migration validator manifest status must be active');
  if (migrationValidatorEntry.kind !== 'node-script') fail('schema migration validator manifest kind must be node-script');
}

const dbTypeGeneratorEntry = (manifest.tooling || []).find((entry) => entry.path === 'scripts/generate-db-types.mjs');
if (!dbTypeGeneratorEntry) {
  fail('module-manifest.json does not classify scripts/generate-db-types.mjs');
} else {
  if (dbTypeGeneratorEntry.status !== 'active') fail('database type generator manifest status must be active');
  if (dbTypeGeneratorEntry.kind !== 'node-script') fail('database type generator manifest kind must be node-script');
}

const legacyDispositionValidatorEntry = (manifest.tooling || []).find((entry) => entry.path === 'scripts/validate-legacy-schema-disposition.mjs');
if (!legacyDispositionValidatorEntry) {
  fail('module-manifest.json does not classify scripts/validate-legacy-schema-disposition.mjs');
} else {
  if (legacyDispositionValidatorEntry.status !== 'active') fail('legacy schema disposition validator manifest status must be active');
  if (legacyDispositionValidatorEntry.kind !== 'node-script') fail('legacy schema disposition validator manifest kind must be node-script');
}

const manifestEntries = [
  ...(manifest.infrastructure || []),
  ...(manifest.documentation || []),
  ...(manifest.tooling || []),
];
const workspaceEntry = manifestEntries.find((entry) => entry.path === 'infra/db/README.md');
if (!workspaceEntry) {
  fail('module-manifest.json does not classify infra/db/README.md');
} else if (workspaceEntry.status !== 'current') {
  fail('schema authority workspace manifest status must be current');
}

const baselineMigrationEntry = manifestEntries.find((entry) => entry.path === 'infra/db/migrations/0001_initial_baseline.sql');
if (!baselineMigrationEntry) {
  fail('module-manifest.json does not classify infra/db/migrations/0001_initial_baseline.sql');
} else if (baselineMigrationEntry.status !== 'source-validated') {
  fail('initial baseline migration manifest status must be source-validated');
}

const legacyDispositionEntry = manifestEntries.find((entry) => entry.path === 'infra/db/legacy-schema-disposition.json');
if (!legacyDispositionEntry) {
  fail('module-manifest.json does not classify infra/db/legacy-schema-disposition.json');
} else if (legacyDispositionEntry.status !== 'source-validated') {
  fail('legacy schema disposition manifest status must be source-validated');
}

const generatedTypesEntry = (manifest.generatedOrExternal || []).find((entry) => entry.path === 'infra/db/generated/database.types.ts');
if (!generatedTypesEntry) {
  fail('module-manifest.json does not classify infra/db/generated/database.types.ts');
} else if (generatedTypesEntry.kind !== 'generated-contract') {
  fail('generated database types manifest kind must be generated-contract');
}

if (packageJson.scripts?.['validate:schema-authority-adr'] !== 'node scripts/validate-schema-authority-adr.mjs') {
  fail('package.json is missing validate:schema-authority-adr script');
}
if (packageJson.scripts?.['validate:schema-migrations'] !== 'node scripts/validate-schema-migrations.mjs') {
  fail('package.json is missing validate:schema-migrations script');
}
if (packageJson.scripts?.['validate:legacy-schema-disposition'] !== 'node scripts/validate-legacy-schema-disposition.mjs') {
  fail('package.json is missing validate:legacy-schema-disposition script');
}
if (packageJson.scripts?.['report:db-types'] !== 'node scripts/generate-db-types.mjs') {
  fail('package.json is missing report:db-types script');
}

if (plan.includes('| ADR-003 Schema authority | Proposed |')) {
  fail('PLAN.md still lists ADR-003 as Proposed');
}
if (!plan.includes('| ADR-003 Schema authority | Accepted |')) {
  fail('PLAN.md must list ADR-003 as Accepted');
}
if (!plan.includes('- [x] Schema authority ADR accepted.')) {
  fail('PLAN.md data checklist must mark the schema authority ADR accepted item complete');
}
if (!plan.includes('Baseline migration and generated database types are source-validated; live Supabase migration execution, live Supabase-generated relationship types, live RLS behavior, rollback execution, and query-plan/index validation remain Not verified from the codebase.')) {
  fail('PLAN.md must keep schema-authority source progress and runtime limits explicit');
}

if (!architectureIndex.includes('ADR-003 accepts migration-first Supabase/Postgres authority')) {
  fail('ARCHITECTURE_STATUS_INDEX.md must summarize the accepted schema authority decision');
}
if (!moduleManifestDoc.includes('npm run validate:schema-authority-adr')) {
  fail('docs/MODULE_MANIFEST.md must document the schema authority ADR validator');
}
if (!moduleManifestDoc.includes('npm run validate:schema-migrations')) {
  fail('docs/MODULE_MANIFEST.md must document the schema migration validator');
}
if (!moduleManifestDoc.includes('npm run validate:legacy-schema-disposition')) {
  fail('docs/MODULE_MANIFEST.md must document the legacy schema disposition validator');
}
if (!dataOwnershipDoc.includes('ADR-003 accepts migration-first Supabase/Postgres authority')) {
  fail('docs/DATA_OWNERSHIP.md must reference the accepted schema authority decision');
}
if (!dataOwnershipDoc.includes('source-derived database types')) {
  fail('docs/DATA_OWNERSHIP.md must summarize the generated database type artifact');
}
if (!dataOwnershipDoc.includes('legacy-schema-disposition.json')) {
  fail('docs/DATA_OWNERSHIP.md must summarize the legacy schema disposition artifact');
}
if (!dbWorkspace.includes('Documentation status: Current schema authority workspace')) {
  fail('infra/db/README.md is missing the schema authority documentation status banner');
}
if (!dbWorkspace.includes('infra/db/generated/database.types.ts')) {
  fail('infra/db/README.md must document generated database types');
}
if (!dbWorkspace.includes('legacy-schema-disposition.json')) {
  fail('infra/db/README.md must document legacy schema dispositions');
}
if (!dbWorkspace.includes('Supabase migration execution is Not verified from the codebase')) {
  fail('infra/db/README.md must keep runtime migration limits explicit');
}

const tables = dataOwnership.tables || [];
const directFrontendCount = tables.filter((entry) => entry.directFrontendAccess).length;
const legacyOnlyCount = tables.filter((entry) => entry.migrationStatus === 'legacy-master-only').length;
const duplicateSourceCount = tables.filter((entry) => entry.migrationStatus === 'multiple-reviewed-sql-sources').length;
const unresolvedRlsCount = tables.filter((entry) => entry.rlsStatus === 'not-verified').length;
const unresolvedIndexCount = tables.filter((entry) => entry.indexStatus === 'not-verified').length;

if (tables.length !== 59) fail(`data ownership manifest table count changed without ADR-003 validator update: ${tables.length}`);
if (directFrontendCount !== 45) fail(`direct frontend table count changed without ADR-003 validator update: ${directFrontendCount}`);
if (legacyOnlyCount !== 10) fail(`legacy-master-only table count changed without ADR-003 validator update: ${legacyOnlyCount}`);
if (duplicateSourceCount !== 15) fail(`multiple-reviewed-sql-sources table count changed without ADR-003 validator update: ${duplicateSourceCount}`);
if (unresolvedRlsCount < 1) fail('ADR-003 validator expected unresolved RLS work until table-by-table validation is complete');
if (unresolvedIndexCount < 1) fail('ADR-003 validator expected unresolved index work until query-plan validation is complete');

if (process.exitCode) {
  process.exit();
}

console.log(`schema authority ADR validation passed (${tables.length} tables; ${directFrontendCount} direct frontend tables; ${legacyOnlyCount} legacy-only tables; ${duplicateSourceCount} duplicate SQL-source tables)`);
