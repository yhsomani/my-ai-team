import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDatabaseTypes, getDatabaseTypePaths } from './generate-db-types.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const reviewedSchemaPath = path.join(repoRoot, 'supabase-schema.sql');
const frontendSupabaseClientPath = path.join(repoRoot, 'apps', 'frontend', 'src', 'lib', 'supabaseClient.ts');
const { migrationPath, generatedPath } = getDatabaseTypePaths();

const fail = (message) => {
  console.error(`schema migration validation failed: ${message}`);
  process.exitCode = 1;
};

const readText = (filePath) => fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const extractTables = (sql) => Array.from(sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([A-Za-z_][A-Za-z0-9_]*)/gi), (match) => match[1]);
const extractRlsTables = (sql) => new Set(Array.from(sql.matchAll(/ALTER\s+TABLE\s+public\.([A-Za-z_][A-Za-z0-9_]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi), (match) => match[1]));
const extractIndexedTables = (sql) => new Set(Array.from(sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+[A-Za-z0-9_]+\s+ON\s+public\.([A-Za-z_][A-Za-z0-9_]*)/gi), (match) => match[1]));
const extractTableColumns = (sql) => {
  const columnsByTable = new Map();

  for (const match of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\n\);/gi)) {
    const [, tableName, body] = match;
    const columns = new Set();

    for (const line of body.split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('--')) continue;

      const columnMatch = trimmed.match(/^"?([A-Za-z_][A-Za-z0-9_]*)"?\s+/);
      if (!columnMatch) continue;

      const columnName = columnMatch[1];
      if (['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'EXCLUDE'].includes(columnName.toUpperCase())) {
        continue;
      }

      columns.add(columnName);
    }

    columnsByTable.set(tableName, columns);
  }

  return columnsByTable;
};
const extractInsertColumnReferences = (sql) => Array.from(
  sql.matchAll(/INSERT\s+INTO\s+public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)/gi),
  (match) => ({
    tableName: match[1],
    columns: match[2]
      .split(',')
      .map((column) => column.trim().replace(/^"|"$/g, ''))
      .filter(Boolean),
  })
);

for (const filePath of [reviewedSchemaPath, migrationPath, generatedPath, frontendSupabaseClientPath]) {
  if (!fs.existsSync(filePath)) {
    fail(`required schema file is missing: ${path.relative(repoRoot, filePath)}`);
  }
}

if (process.exitCode) process.exit();

const reviewedSchema = readText(reviewedSchemaPath);
const migrationSchema = readText(migrationPath);

if (reviewedSchema !== migrationSchema) {
  fail('infra/db/migrations/0001_initial_baseline.sql must match supabase-schema.sql until the baseline is decomposed into smaller ordered migrations');
}

const tables = extractTables(migrationSchema);
const uniqueTables = new Set(tables);
if (tables.length !== uniqueTables.size) {
  fail('baseline migration contains duplicate CREATE TABLE declarations');
}
if (tables.length !== 49) {
  fail(`baseline migration table count changed without validator review: ${tables.length}`);
}

const rlsTables = extractRlsTables(migrationSchema);
const missingRls = tables.filter((table) => !['audit_log', 'badges', 'certifications', 'conversation_participants', 'educations', 'experiences', 'languages', 'lesson_progress', 'lessons', 'projects', 'system_settings', 'user_badges', 'xp_transactions'].includes(table) && !rlsTables.has(table));
if (missingRls.length > 0) {
  fail(`expected source-level RLS enablement for directly exposed baseline tables, missing: ${missingRls.join(', ')}`);
}

const indexedTables = extractIndexedTables(migrationSchema);
const missingIndexes = tables.filter((table) => !['conversation_participants', 'badges', 'notification_settings', 'system_settings'].includes(table) && !indexedTables.has(table));
if (missingIndexes.length > 0) {
  fail(`expected at least one source-level index for baseline tables, missing: ${missingIndexes.join(', ')}`);
}

const tableColumns = extractTableColumns(migrationSchema);
const undefinedInsertColumns = extractInsertColumnReferences(migrationSchema).flatMap(({ tableName, columns }) => {
  const tableColumnSet = tableColumns.get(tableName);
  if (!tableColumnSet) return [`public.${tableName} (table is not declared)`];

  return columns
    .filter((column) => !tableColumnSet.has(column))
    .map((column) => `public.${tableName}.${column}`);
});
if (undefinedInsertColumns.length > 0) {
  fail(`SQL INSERT references undefined baseline columns: ${undefinedInsertColumns.join(', ')}`);
}

const expectedGeneratedTypes = generateDatabaseTypes(migrationSchema);
const actualGeneratedTypes = readText(generatedPath);
if (actualGeneratedTypes !== expectedGeneratedTypes) {
  fail('generated DB types are stale; run npm run report:db-types');
}
const generatedRelationshipCount = Array.from(expectedGeneratedTypes.matchAll(/foreignKeyName:/g)).length;
if (generatedRelationshipCount !== 69) {
  fail(`generated DB relationship count changed without validator review: ${generatedRelationshipCount}`);
}
for (const requiredRelationship of [
  'job_applications_job_id_fkey',
  'subscriptions_plan_id_fkey',
  'notification_settings_user_id_fkey',
  'user_profiles_user_id_fkey',
]) {
  if (!expectedGeneratedTypes.includes(`foreignKeyName: "${requiredRelationship}"`)) {
    fail(`generated DB types are missing required relationship metadata: ${requiredRelationship}`);
  }
}

const requiredGeneratedFunctionSnippets = [
  'get_mutual_connection_counts: {',
  'p_current_user_id: string',
  'p_candidate_ids: string[]',
  'suggested_user_id: string',
  'mutual_count: number',
];
for (const requiredFunctionSnippet of requiredGeneratedFunctionSnippets) {
  if (!expectedGeneratedTypes.includes(requiredFunctionSnippet)) {
    fail(`generated DB types are missing required RPC metadata: ${requiredFunctionSnippet}`);
  }
}

const frontendSupabaseClient = readText(frontendSupabaseClientPath);
if (!frontendSupabaseClient.includes("import type { Database } from '../../../../infra/db/generated/database.types'")) {
  fail('frontend Supabase client must import the generated Database type');
}
if (!frontendSupabaseClient.includes('createClient<Database>')) {
  fail('frontend Supabase client must expose a generated-Database typed client boundary');
}
if (!frontendSupabaseClient.includes('export const typedSupabase')) {
  fail('frontend Supabase client must export typedSupabase for repository migration work');
}

if (process.exitCode) {
  process.exit();
}

console.log(`schema migration validation passed (${tables.length} baseline tables, ${rlsTables.size} RLS-enabled tables, ${indexedTables.size} indexed tables)`);
