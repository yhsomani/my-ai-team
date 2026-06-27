import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const extensionRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const migrationSourcePath = path.join(extensionRoot, 'src/lib/storageMigrations.ts');
const storageSourcePath = path.join(extensionRoot, 'src/lib/storage.ts');
const backgroundSourcePath = path.join(extensionRoot, 'src/background/index.ts');
const migrationSource = fs.readFileSync(migrationSourcePath, 'utf8');

const transpiled = ts.transpileModule(migrationSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
    strict: true,
  },
});
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-extension-storage-migrations-'));
const tempModulePath = path.join(tempDir, 'storageMigrations.mjs');
fs.writeFileSync(tempModulePath, transpiled.outputText);

const {
  EXTENSION_STORAGE_SCHEMA_KEY,
  EXTENSION_STORAGE_SCHEMA_VERSION,
  migrateExtensionStorageSnapshot,
  summarizeExtensionStorageMigration,
} = await import(pathToFileURL(tempModulePath).href);

const nowIso = '2026-06-27T10:00:00.000Z';

const legacySnapshot = {
  ts_jobs: [{ id: 'job-1', company: 'Example Co', role: 'Designer' }],
  ts_job_draft: { id: 'draft-1', company: 'Example Co', role: 'Designer' },
  ts_prep: [{ id: 'prep-1', topic: 'System design' }],
  ts_settings_notif: true,
  ts_settings_analytics: false,
  ts_extension_operational_analytics: [{ id: 'event-1', metadata: { event_count: 1 } }],
};

const legacyPatch = migrateExtensionStorageSnapshot(legacySnapshot, nowIso);
assert.equal(legacyPatch.changed, true);
assert.equal(legacyPatch.fromVersion, null);
assert.equal(legacyPatch.toVersion, EXTENSION_STORAGE_SCHEMA_VERSION);
assert.deepEqual(legacyPatch.remove, []);
assert.equal(legacyPatch.preservedKeys.length, 6);
assert.equal(legacyPatch.set[EXTENSION_STORAGE_SCHEMA_KEY].version, EXTENSION_STORAGE_SCHEMA_VERSION);
assert.equal(legacyPatch.set[EXTENSION_STORAGE_SCHEMA_KEY].migratedAt, nowIso);
assert.equal(JSON.stringify(legacyPatch).includes('Example Co'), false);
assert.equal(JSON.stringify(legacyPatch).includes('System design'), false);

const currentPatch = migrateExtensionStorageSnapshot({
  ...legacySnapshot,
  [EXTENSION_STORAGE_SCHEMA_KEY]: {
    version: EXTENSION_STORAGE_SCHEMA_VERSION,
    migratedAt: nowIso,
  },
}, nowIso);
assert.equal(currentPatch.changed, false);
assert.deepEqual(currentPatch.set, {});
assert.deepEqual(currentPatch.remove, []);

const newerPatch = migrateExtensionStorageSnapshot({
  [EXTENSION_STORAGE_SCHEMA_KEY]: {
    version: EXTENSION_STORAGE_SCHEMA_VERSION + 1,
    migratedAt: nowIso,
  },
}, nowIso);
assert.equal(newerPatch.changed, false);
assert.deepEqual(newerPatch.warnings, ['storage_schema_newer_than_runtime']);

const invalidShapePatch = migrateExtensionStorageSnapshot({
  ts_jobs: { not: 'an array' },
  ts_job_draft: 'raw draft text',
  ts_prep: 'raw prep text',
  ts_settings_notif: 'yes',
  ts_settings_analytics: 'no',
  ts_extension_operational_analytics: 'raw analytics text',
}, nowIso);
assert.equal(invalidShapePatch.changed, true);
assert.deepEqual(invalidShapePatch.warnings.sort(), [
  'ts_extension_operational_analytics_expected_array',
  'ts_job_draft_expected_object_or_null',
  'ts_jobs_expected_array',
  'ts_prep_expected_array',
  'ts_settings_analytics_expected_boolean',
  'ts_settings_notif_expected_boolean',
].sort());

const summary = summarizeExtensionStorageMigration(invalidShapePatch);
assert.equal(summary.changed, true);
assert.equal(summary.warningCount, 6);
assert.equal(JSON.stringify(summary).includes('raw draft text'), false);
assert.equal(JSON.stringify(summary).includes('raw analytics text'), false);

const storageSource = fs.readFileSync(storageSourcePath, 'utf8');
assert.match(storageSource, /migrateExtensionStorage/);
assert.match(storageSource, /migrateExtensionStorageSnapshot\(snapshot, nowIso\)/);
assert.match(storageSource, /chrome\.storage\.local\.get\(null/);
assert.match(storageSource, /localStorage\.setItem\(key, JSON\.stringify\(value\)\)/);

const backgroundSource = fs.readFileSync(backgroundSourcePath, 'utf8');
assert.match(backgroundSource, /runStorageMigration\(details\.reason\)/);
assert.match(backgroundSource, /storage_migration_checked/);
assert.match(backgroundSource, /storage_migration_failed/);
assert.doesNotMatch(backgroundSource, /ts_jobs|ts_job_draft|ts_prep/);

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('storage migration tests passed');
