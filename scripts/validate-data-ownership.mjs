import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const manifestPath = path.join(repoRoot, 'data-ownership-manifest.json');
const frontendRoot = path.join(repoRoot, 'apps', 'frontend', 'src');
const schemaFiles = [
  'supabase-schema.sql',
  'infra/supabase_master.sql',
  'docker/init-db.sql',
];

const fail = (message) => {
  console.error(`data ownership validation failed: ${message}`);
  process.exitCode = 1;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const relativeToRepo = (absolutePath) => path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');

const walk = (dir, extensions) => {
  if (!fs.existsSync(dir)) return [];

  const results = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (['node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) continue;
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (extensions.some((extension) => entry.name.endsWith(extension))) {
        results.push(entryPath);
      }
    }
  }

  return results.sort();
};

const extractSupabaseClientImportLocals = (content, exportedName) => {
  const localNames = new Set();
  const importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['"][^'"]*supabaseClient['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    for (const rawSpecifier of match[1].split(',')) {
      const specifier = rawSpecifier.trim().replace(/^type\s+/, '');
      if (!specifier) continue;

      const [importedName, localName] = specifier.split(/\s+as\s+/).map((part) => part.trim());
      if (importedName === exportedName) {
        localNames.add(localName || importedName);
      }
    }
  }

  return localNames;
};

const validateTypedSupabaseClientBoundary = (filePath, content) => {
  const compatibilityClientLocals = extractSupabaseClientImportLocals(content, 'supabase');

  if (compatibilityClientLocals.size > 0) {
    fail(`frontend production Supabase access must use typedSupabase, found compatibility import(s) ${Array.from(compatibilityClientLocals).join(', ')} in ${relativeToRepo(filePath)}`);
  }
};

const assertSameList = (label, actual, expected) => {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  const actualJson = JSON.stringify(actualSorted);
  const expectedJson = JSON.stringify(expectedSorted);
  if (actualJson !== expectedJson) {
    fail(`${label} mismatch.\nExpected: ${expectedSorted.join(', ')}\nActual: ${actualSorted.join(', ')}`);
  }
};

const extractFrontendTables = () => {
  const files = walk(frontendRoot, ['.ts', '.tsx'])
    .filter((filePath) => !/[.]test[.]|[.]spec[.]/.test(filePath));
  const tableRegex = /\.from\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;
  const tables = new Set();

  for (const filePath of files) {
    const content = readText(filePath);
    let match;

    validateTypedSupabaseClientBoundary(filePath, content);

    while ((match = tableRegex.exec(content)) !== null) {
      tables.add(match[2]);
    }
  }

  return tables;
};

const extractSchemaTables = () => {
  const tables = new Map();
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([A-Za-z_][A-Za-z0-9_]*)/gi;

  for (const schemaFile of schemaFiles) {
    const absolutePath = path.join(repoRoot, schemaFile);
    if (!fs.existsSync(absolutePath)) continue;

    const content = readText(absolutePath);
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const table = match[1];
      if (!tables.has(table)) tables.set(table, new Set());
      tables.get(table).add(schemaFile);
    }
  }

  return tables;
};

const manifest = readJson(manifestPath);

if (manifest.schemaVersion !== 1) {
  fail(`unsupported schemaVersion ${manifest.schemaVersion}`);
}

if (!manifest.domains || typeof manifest.domains !== 'object') {
  fail('domains map is missing');
}

const frontendTables = extractFrontendTables();
const schemaTables = extractSchemaTables();
const observedTables = new Set([
  ...frontendTables,
  ...schemaTables.keys(),
]);

const entries = manifest.tables || [];
const manifestTables = entries.map((entry) => entry.name);
assertSameList('table ownership manifest', manifestTables, Array.from(observedTables));

const seen = new Set();

for (const entry of entries) {
  if (!entry.name) fail('table entry is missing name');
  if (seen.has(entry.name)) fail(`duplicate table entry: ${entry.name}`);
  seen.add(entry.name);

  const domain = manifest.domains?.[entry.domain];
  if (!entry.domain || !domain) fail(`table ${entry.name} has unknown domain ${entry.domain || '<missing>'}`);
  if (!domain.owner) fail(`domain ${entry.domain} is missing owner`);
  if (!entry.targetOwner) fail(`table ${entry.name} is missing targetOwner`);
  if (!entry.targetAccess) fail(`table ${entry.name} is missing targetAccess`);
  if (!entry.migrationStatus) fail(`table ${entry.name} is missing migrationStatus`);
  if (!entry.rlsStatus) fail(`table ${entry.name} is missing rlsStatus`);
  if (!entry.indexStatus) fail(`table ${entry.name} is missing indexStatus`);

  const actualDirect = frontendTables.has(entry.name);
  if (entry.directFrontendAccess !== actualDirect) {
    fail(`table ${entry.name} directFrontendAccess expected ${actualDirect}, found ${entry.directFrontendAccess}`);
  }

  const actualSchemaSources = Array.from(schemaTables.get(entry.name) || []).sort();
  assertSameList(`schema sources for table ${entry.name}`, entry.schemaSources || [], actualSchemaSources);

  if (actualSchemaSources.length === 0 && !String(entry.migrationStatus).includes('missing')) {
    fail(`table ${entry.name} has no reviewed SQL source but migrationStatus is ${entry.migrationStatus}`);
  }

  if (actualDirect && !entry.frontendUsage) {
    fail(`direct frontend table ${entry.name} is missing frontendUsage`);
  }
}

if (process.exitCode) {
  process.exit();
}

console.log(`data ownership validation passed (${entries.length} tables, ${frontendTables.size} direct frontend tables, ${schemaTables.size} SQL-defined tables)`);
