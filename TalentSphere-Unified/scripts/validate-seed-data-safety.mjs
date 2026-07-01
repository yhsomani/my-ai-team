import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const fail = (message) => {
  console.error(`seed data safety validation failed: ${message}`);
  process.exitCode = 1;
};

const readText = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

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

const assertBefore = (relativePath, content, earlierPattern, laterPattern, description) => {
  const earlierIndex = content.indexOf(earlierPattern);
  const laterIndex = content.indexOf(laterPattern);
  if (earlierIndex === -1 || laterIndex === -1 || earlierIndex > laterIndex) {
    fail(`${relativePath} must place ${description}`);
  }
};

const confirmation = 'I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA';

const files = {
  seedSql: 'seed-data.sql',
  seedPython: 'scripts/seed_data.py',
  seedGuide: 'SEED_DATA_GUIDE.md',
  packageJson: 'package.json',
  moduleManifest: 'module-manifest.json',
  moduleManifestDoc: 'docs/MODULE_MANIFEST.md',
  dataOwnershipDoc: 'docs/DATA_OWNERSHIP.md',
  ci: '../.github/workflows/talentsphere-ci.yml',
};

for (const relativePath of Object.values(files)) {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    fail(`required file is missing: ${relativePath}`);
  }
}

const seedSql = readText(files.seedSql);
assertContains(files.seedSql, seedSql, "current_setting('app.seed_environment', true)", 'session seed environment guard');
assertContains(files.seedSql, seedSql, "current_setting('app.allow_destructive_seed_data', true)", 'destructive seed confirmation guard');
assertContains(files.seedSql, seedSql, confirmation, 'explicit destructive seed confirmation phrase');
assertContains(files.seedSql, seedSql, "('local', 'development', 'dev', 'test', 'testing', 'ci')", 'non-production seed environment allowlist');
assertContains(files.seedSql, seedSql, 'RAISE EXCEPTION', 'fail-closed seed SQL guard');
assertBefore(files.seedSql, seedSql, "current_setting('app.seed_environment', true)", 'TRUNCATE TABLE', 'the environment guard before the destructive TRUNCATE');
assertBefore(files.seedSql, seedSql, "current_setting('app.allow_destructive_seed_data', true)", 'TRUNCATE TABLE', 'the confirmation guard before the destructive TRUNCATE');
assertNotContains(files.seedSql, seedSql, /^\s*SET\s+app\.seed_environment\s*=/m, 'enabled default seed environment SET statement');
assertNotContains(files.seedSql, seedSql, /^\s*SET\s+app\.allow_destructive_seed_data\s*=/m, 'enabled default destructive confirmation SET statement');

const seedPython = readText(files.seedPython);
assertContains(files.seedPython, seedPython, 'ALLOWED_SEED_ENVIRONMENTS', 'Python seed environment allowlist');
assertContains(files.seedPython, seedPython, 'ALLOW_DESTRUCTIVE_SEED_DATA', 'Python destructive confirmation env var');
assertContains(files.seedPython, seedPython, 'ALLOW_REMOTE_DEV_SEED', 'Python remote dev/test opt-in');
assertContains(files.seedPython, seedPython, 'TALENTSPHERE_SEED_DB_HOST', 'environment-driven database host');
assertContains(files.seedPython, seedPython, 'TALENTSPHERE_SEED_DB_PASSWORD', 'environment-driven database password');
assertContains(files.seedPython, seedPython, 'validate_seed_environment()', 'seed environment validator call');
assertContains(files.seedPython, seedPython, 'sys.exit(', 'fail-closed Python seed guard');
assertContains(files.seedPython, seedPython, confirmation, 'Python destructive seed confirmation phrase');
assertContains(files.seedPython, seedPython, '        validate_seed_environment()\n        users = seed_users()', 'Python guard before seed execution');

const seedGuide = readText(files.seedGuide);
assertContains(files.seedGuide, seedGuide, 'Documentation status: Current seed-data guide', 'documentation status banner');
assertContains(files.seedGuide, seedGuide, 'SET app.seed_environment', 'SQL seed environment setup instructions');
assertContains(files.seedGuide, seedGuide, 'SET app.allow_destructive_seed_data', 'SQL destructive confirmation setup instructions');
assertContains(files.seedGuide, seedGuide, 'TALENTSPHERE_SEED_ENV', 'Python seed environment setup instructions');
assertContains(files.seedGuide, seedGuide, 'DO NOT run in production', 'production prohibition warning');
assertContains(files.seedGuide, seedGuide, 'local, development, test, or CI', 'environment scope wording');
assertNotContains(files.seedGuide, seedGuide, 'tvulrziizvakwzxfvdwv', 'hard-coded Supabase project reference');
assertNotContains(files.seedGuide, seedGuide, 'YOUR_SERVICE_ROLE_KEY', 'copy-paste service-role key placeholder in runnable client code');

const packageJson = readJson(files.packageJson);
if (packageJson.scripts?.['validate:seed-data-safety'] !== 'node scripts/validate-seed-data-safety.mjs') {
  fail(`${files.packageJson} must expose validate:seed-data-safety`);
}

const moduleManifest = readText(files.moduleManifest);
assertContains(files.moduleManifest, moduleManifest, 'seed-data-safety-validation', 'seed data safety tooling entry');
assertContains(files.moduleManifest, moduleManifest, 'scripts/validate-seed-data-safety.mjs', 'seed data safety validator path');

const moduleManifestDoc = readText(files.moduleManifestDoc);
assertContains(files.moduleManifestDoc, moduleManifestDoc, 'npm run validate:seed-data-safety', 'seed data safety validator command');
assertContains(files.moduleManifestDoc, moduleManifestDoc, 'Seed data safety', 'seed data safety validator documentation');

const dataOwnershipDoc = readText(files.dataOwnershipDoc);
assertContains(files.dataOwnershipDoc, dataOwnershipDoc, 'npm run validate:seed-data-safety', 'seed data safety command in data governance docs');
assertContains(files.dataOwnershipDoc, dataOwnershipDoc, 'Seed data safety', 'seed data safety finding in data governance docs');

const ci = readText(files.ci);
assertContains(files.ci, ci, 'Validate seed data safety', 'seed data safety CI step');
assertContains(files.ci, ci, 'npm run validate:seed-data-safety', 'seed data safety CI command');

if (process.exitCode) {
  process.exit();
}

console.log('seed data safety validation passed (SQL and Python seed entry points are environment-gated and documented)');
