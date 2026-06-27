import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const frontendSrcRoot = path.join(repoRoot, 'apps', 'frontend', 'src');
const generatedDbTypesPath = path.join(repoRoot, 'infra', 'db', 'generated', 'database.types.ts');

const allowedCompatibilityImports = new Map();

const compatibilitySurfaceProperties = {
  auth: new Set(['auth']),
  realtime: new Set(['channel', 'removeChannel']),
  'edge-functions': new Set(['functions']),
};

const fail = (message) => {
  console.error(`typed Supabase boundary validation failed: ${message}`);
  process.exitCode = 1;
};

const readText = (filePath) => fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const relativeToRepo = (absolutePath) => path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const lineForIndex = (content, index) => content.slice(0, index).split('\n').length;

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

const parseSupabaseClientImports = (content) => {
  const typedIdentifiers = new Set();
  const compatibilityIdentifiers = new Set();
  const importRegex = /import\s*\{(?<specifiers>[^}]+)\}\s*from\s*['"][^'"]*supabaseClient['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const specifiers = match.groups.specifiers
      .split(',')
      .map((specifier) => specifier.trim().replace(/^type\s+/, ''))
      .filter(Boolean);

    for (const specifier of specifiers) {
      const aliasMatch = specifier.match(/^(?<imported>[A-Za-z_$][\w$]*)\s+as\s+(?<local>[A-Za-z_$][\w$]*)$/);
      const imported = aliasMatch?.groups?.imported || specifier;
      const local = aliasMatch?.groups?.local || specifier;

      if (imported === 'typedSupabase') {
        typedIdentifiers.add(local);
      }

      if (imported === 'supabase') {
        compatibilityIdentifiers.add(local);
      }
    }
  }

  return { typedIdentifiers, compatibilityIdentifiers };
};

const extractGeneratedFunctionNames = () => {
  if (!fs.existsSync(generatedDbTypesPath)) {
    fail(`generated DB types file is missing: ${relativeToRepo(generatedDbTypesPath)}`);
    return new Set();
  }

  const generatedTypes = readText(generatedDbTypesPath);
  const functionsBlock = generatedTypes.match(/\n    Functions: \{(?<body>[\s\S]*?)\n    }\n    Enums:/)?.groups?.body || '';
  return new Set(Array.from(
    functionsBlock.matchAll(/^\s+([A-Za-z_][A-Za-z0-9_]*):\s*\{/gm),
    (match) => match[1],
  ));
};

const sourceFiles = walk(frontendSrcRoot, ['.ts', '.tsx'])
  .filter((filePath) => !/[.]test[.]|[.]spec[.]/.test(filePath))
  .filter((filePath) => !filePath.endsWith('.d.ts'));
const generatedFunctions = extractGeneratedFunctionNames();
const observedCompatibilityFiles = new Set();
let typedTableAccessCount = 0;
let generatedRpcAccessCount = 0;

for (const filePath of sourceFiles) {
  const relativePath = relativeToRepo(filePath);
  const content = readText(filePath);
  const { typedIdentifiers, compatibilityIdentifiers } = parseSupabaseClientImports(content);

  if (compatibilityIdentifiers.size > 0) {
    observedCompatibilityFiles.add(relativePath);

    const allowedSurfaces = allowedCompatibilityImports.get(relativePath);
    if (!allowedSurfaces) {
      fail(`${relativePath} imports the untyped compatibility Supabase client; production frontend code must import typedSupabase`);
    }

    const allowedProperties = new Set((allowedSurfaces || []).flatMap((surface) => (
      Array.from(compatibilitySurfaceProperties[surface] || [])
    )));

    for (const identifier of compatibilityIdentifiers) {
      const propertyRegex = new RegExp(`\\b${escapeRegExp(identifier)}\\s*\\.\\s*([A-Za-z_$][\\w$]*)`, 'g');
      let propertyMatch;

      while ((propertyMatch = propertyRegex.exec(content)) !== null) {
        const property = propertyMatch[1];
        if (!allowedProperties.has(property)) {
          fail(`${relativePath}:${lineForIndex(content, propertyMatch.index)} uses compatibility Supabase property ${identifier}.${property}; allowed surfaces are ${allowedSurfaces?.join(', ') || '<none>'}`);
        }
      }
    }
  }

  const fromRegex = /\b([A-Za-z_$][\w$]*)\s*\.\s*from\s*\(\s*(['"`])([^'"`]+)\2/g;
  let fromMatch;
  while ((fromMatch = fromRegex.exec(content)) !== null) {
    const identifier = fromMatch[1];
    if (compatibilityIdentifiers.has(identifier)) {
      fail(`${relativePath}:${lineForIndex(content, fromMatch.index)} uses compatibility Supabase for table ${fromMatch[3]}`);
      continue;
    }

    if (!typedIdentifiers.has(identifier)) {
      fail(`${relativePath}:${lineForIndex(content, fromMatch.index)} uses ${identifier}.from('${fromMatch[3]}') without importing typedSupabase`);
      continue;
    }

    typedTableAccessCount += 1;
  }

  const rpcRegex = /\b([A-Za-z_$][\w$]*)\s*\.\s*rpc\s*\(\s*(['"`])([^'"`]+)\2/g;
  let rpcMatch;
  while ((rpcMatch = rpcRegex.exec(content)) !== null) {
    const identifier = rpcMatch[1];
    const rpcName = rpcMatch[3];

    if (compatibilityIdentifiers.has(identifier)) {
      fail(`${relativePath}:${lineForIndex(content, rpcMatch.index)} uses compatibility Supabase RPC ${rpcName}; generated RPCs must use typedSupabase and repo-external RPCs need SQL source or a backend/Edge Function boundary`);
      continue;
    }

    if (!generatedFunctions.has(rpcName)) {
      fail(`${relativePath}:${lineForIndex(content, rpcMatch.index)} calls RPC ${rpcName}, but it is not present in generated Database function types`);
      continue;
    }

    if (!typedIdentifiers.has(identifier)) {
      fail(`${relativePath}:${lineForIndex(content, rpcMatch.index)} calls generated RPC ${rpcName} without importing typedSupabase`);
      continue;
    }

    generatedRpcAccessCount += 1;
  }
}

const expectedCompatibilityFiles = Array.from(allowedCompatibilityImports.keys()).sort();
const actualCompatibilityFiles = Array.from(observedCompatibilityFiles).sort();
if (JSON.stringify(actualCompatibilityFiles) !== JSON.stringify(expectedCompatibilityFiles)) {
  fail(`compatibility Supabase import allowlist drifted.\nExpected: ${expectedCompatibilityFiles.join(', ')}\nActual: ${actualCompatibilityFiles.join(', ')}`);
}

if (generatedFunctions.size === 0) {
  fail('generated DB function type list is empty; expected at least get_mutual_connection_counts');
}

if (!generatedFunctions.has('get_mutual_connection_counts')) {
  fail('generated DB function types are missing get_mutual_connection_counts');
}

if (process.exitCode) {
  process.exit();
}

console.log(`typed Supabase boundary validation passed (${typedTableAccessCount} typed table call sites, ${generatedRpcAccessCount} generated RPC call site, ${actualCompatibilityFiles.length} production compatibility client imports)`);
