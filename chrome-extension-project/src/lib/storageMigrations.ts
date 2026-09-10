export const EXTENSION_STORAGE_SCHEMA_VERSION = 1;
export const EXTENSION_STORAGE_SCHEMA_KEY = 'ts_extension_storage_schema';

export interface ExtensionStorageSchemaState {
  version: number;
  migratedAt: string;
}

export interface ExtensionStorageMigrationPatch {
  changed: boolean;
  fromVersion: number | null;
  toVersion: number;
  set: Record<string, unknown>;
  remove: string[];
  warnings: string[];
  preservedKeys: string[];
}

export type ExtensionStorageSnapshot = Record<string, unknown>;

const knownCurrentKeys = [
  'ts_jobs',
  'ts_job_draft',
  'ts_prep',
  'ts_settings_notif',
  'ts_settings_analytics',
  'ts_extension_operational_analytics',
];

const getStoredVersion = (snapshot: ExtensionStorageSnapshot): number | null => {
  const schema = snapshot[EXTENSION_STORAGE_SCHEMA_KEY];

  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return null;
  }

  const version = Number((schema as ExtensionStorageSchemaState).version);
  return Number.isInteger(version) && version > 0 ? version : null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const getPreservedKeys = (snapshot: ExtensionStorageSnapshot) => knownCurrentKeys
  .filter((key) => snapshot[key] !== undefined);

export const buildExtensionStorageSchemaState = (migratedAt: string): ExtensionStorageSchemaState => ({
  version: EXTENSION_STORAGE_SCHEMA_VERSION,
  migratedAt,
});

export const migrateExtensionStorageSnapshot = (
  snapshot: ExtensionStorageSnapshot,
  nowIso = new Date().toISOString()
): ExtensionStorageMigrationPatch => {
  const fromVersion = getStoredVersion(snapshot);
  const warnings: string[] = [];
  const preservedKeys = getPreservedKeys(snapshot);

  if (fromVersion !== null && fromVersion > EXTENSION_STORAGE_SCHEMA_VERSION) {
    return {
      changed: false,
      fromVersion,
      toVersion: EXTENSION_STORAGE_SCHEMA_VERSION,
      set: {},
      remove: [],
      warnings: ['storage_schema_newer_than_runtime'],
      preservedKeys,
    };
  }

  if (fromVersion === EXTENSION_STORAGE_SCHEMA_VERSION) {
    return {
      changed: false,
      fromVersion,
      toVersion: EXTENSION_STORAGE_SCHEMA_VERSION,
      set: {},
      remove: [],
      warnings,
      preservedKeys,
    };
  }

  for (const key of ['ts_jobs', 'ts_prep', 'ts_extension_operational_analytics']) {
    if (snapshot[key] !== undefined && !Array.isArray(snapshot[key])) {
      warnings.push(`${key}_expected_array`);
    }
  }

  if (snapshot.ts_job_draft !== undefined && snapshot.ts_job_draft !== null && !isPlainObject(snapshot.ts_job_draft)) {
    warnings.push('ts_job_draft_expected_object_or_null');
  }

  for (const key of ['ts_settings_notif', 'ts_settings_analytics']) {
    if (snapshot[key] !== undefined && typeof snapshot[key] !== 'boolean') {
      warnings.push(`${key}_expected_boolean`);
    }
  }

  return {
    changed: true,
    fromVersion,
    toVersion: EXTENSION_STORAGE_SCHEMA_VERSION,
    set: {
      [EXTENSION_STORAGE_SCHEMA_KEY]: buildExtensionStorageSchemaState(nowIso),
    },
    remove: [],
    warnings,
    preservedKeys,
  };
};

export const summarizeExtensionStorageMigration = (patch: ExtensionStorageMigrationPatch) => ({
  changed: patch.changed,
  fromVersion: patch.fromVersion,
  toVersion: patch.toVersion,
  setKeyCount: Object.keys(patch.set).length,
  removeKeyCount: patch.remove.length,
  warningCount: patch.warnings.length,
  preservedKeyCount: patch.preservedKeys.length,
});
