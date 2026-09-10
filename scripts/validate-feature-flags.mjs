import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const files = {
  featureEnum: 'services/shared/src/main/java/com/talentsphere/shared/config/Feature.java',
  runtimeYaml: 'services/shared/src/main/resources/feature-flags.yml',
  bomYaml: 'services/bom/application-feature-flags.yml',
  serviceTest: 'services/shared/src/test/java/com/talentsphere/shared/config/FeatureFlagServiceTest.java',
  controllerTest: 'services/api-gateway/src/test/java/com/talentsphere/gateway/controller/FeatureFlagControllerTest.java',
  governanceSchema: 'supabase-schema.sql',
  seedData: 'seed-data.sql',
};

const fail = (message) => {
  console.error(`feature-flag validation failed: ${message}`);
  process.exitCode = 1;
};

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const assertExists = (relativePath) => {
  if (!fs.existsSync(path.join(repoRoot, relativePath))) {
    fail(`required feature-flag source is missing: ${relativePath}`);
  }
};

const assertUnique = (label, values) => {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      fail(`${label} contains duplicate entry: ${value}`);
    }
    seen.add(value);
  }
};

const featureNamePattern = /^enable_[a-z][a-z0-9_]*$/;

// Governance contract keys persisted in the system_settings table.
const GOVERNANCE_FLAGS_KEY = 'feature_flags';
const GOVERNANCE_DESCRIPTIONS_KEY = 'feature_flag_descriptions';

// Parse a single `('key', '<json>', '<description>')` row literal from a SQL seed file.
const parseSystemSettingRow = (content, key) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`\\('${escapedKey}',\\s*'((?:[^']|'')*)'\\s*,\\s*'((?:[^']|'')*)'\\)`, 'g');
  const rows = [];
  let match;
  while ((match = matcher.exec(content)) !== null) {
    rows.push({
      key,
      value: match[1].replace(/''/g, "'"),
      description: match[2].replace(/''/g, "'"),
    });
  }
  return rows;
};

const parseJson = (text, label) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
};

const assertExactKeySet = (label, actualKeys, expectedKeys) => {
  const expected = [...expectedKeys].sort();
  const actual = [...actualKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter((name) => !actual.includes(name));
    const extra = actual.filter((name) => !expected.includes(name));
    const details = [
      missing.length ? `missing: ${missing.join(', ')}` : '',
      extra.length ? `extra: ${extra.join(', ')}` : '',
    ].filter(Boolean).join('; ');
    fail(`${label} does not mirror the canonical Feature.java flag set (${details})`);
    return false;
  }
  return true;
};

// Verify a SQL seed file carries canonical feature-flag governance rows mirroring Feature.java.
const verifyGovernanceInSeed = (relativePath, featuresByName) => {
  const content = read(relativePath);
  const canonicalNames = new Set(featuresByName.keys());

  const flagsRows = parseSystemSettingRow(content, GOVERNANCE_FLAGS_KEY);
  if (flagsRows.length !== 1) {
    fail(`${relativePath} must seed exactly one system_settings '${GOVERNANCE_FLAGS_KEY}' row, found ${flagsRows.length}`);
    return;
  }
  const flagsJson = parseJson(flagsRows[0].value, `${relativePath} ${GOVERNANCE_FLAGS_KEY}`);
  if (flagsJson === null) return;

  if (!Number.isInteger(flagsJson.version) || (flagsJson.version || 0) < 1) {
    fail(`${relativePath} ${GOVERNANCE_FLAGS_KEY} must declare a positive integer version`);
  }

  if (typeof flagsJson.defaults !== 'object' || flagsJson.defaults === null || Array.isArray(flagsJson.defaults)) {
    fail(`${relativePath} ${GOVERNANCE_FLAGS_KEY} must declare a 'defaults' object`);
    return;
  }
  if (!assertExactKeySet(`${relativePath} ${GOVERNANCE_FLAGS_KEY}.defaults`, Object.keys(flagsJson.defaults), canonicalNames)) {
    return;
  }
  for (const [name, feature] of featuresByName) {
    if (flagsJson.defaults[name] !== feature.enabled) {
      fail(`${relativePath} ${GOVERNANCE_FLAGS_KEY}.defaults.${name} must match Feature.java default (${feature.enabled})`);
    }
  }

  if (typeof flagsJson.overrides !== 'object' || flagsJson.overrides === null || Array.isArray(flagsJson.overrides)) {
    fail(`${relativePath} ${GOVERNANCE_FLAGS_KEY} must declare an 'overrides' object`);
    return;
  }
  for (const overrideName of Object.keys(flagsJson.overrides)) {
    if (!canonicalNames.has(overrideName)) {
      fail(`${relativePath} ${GOVERNANCE_FLAGS_KEY}.overrides declares non-canonical flag ${overrideName}`);
    }
  }
  if (Object.keys(flagsJson.overrides).length !== 0) {
    fail(`${relativePath} ${GOVERNANCE_FLAGS_KEY}.overrides must be empty in the canonical baseline seed`);
  }

  const descriptionRows = parseSystemSettingRow(content, GOVERNANCE_DESCRIPTIONS_KEY);
  if (descriptionRows.length !== 1) {
    fail(`${relativePath} must seed exactly one system_settings '${GOVERNANCE_DESCRIPTIONS_KEY}' row, found ${descriptionRows.length}`);
    return;
  }
  const descriptionsJson = parseJson(descriptionRows[0].value, `${relativePath} ${GOVERNANCE_DESCRIPTIONS_KEY}`);
  if (descriptionsJson === null) return;
  if (!assertExactKeySet(`${relativePath} ${GOVERNANCE_DESCRIPTIONS_KEY}`, Object.keys(descriptionsJson), canonicalNames)) {
    return;
  }
  for (const [name, feature] of featuresByName) {
    if (descriptionsJson[name] !== feature.description) {
      fail(`${relativePath} ${GOVERNANCE_DESCRIPTIONS_KEY}.${name} must match Feature.java description ('${feature.description}')`);
    }
  }
};

const parseFeatureEnum = (content) => {
  const enumBlock = content.slice(
    content.indexOf('public enum Feature'),
    content.indexOf('private final boolean defaultEnabled;'),
  );

  const features = [];
  const matcher = /^\s*(enable_[a-zA-Z0-9_]+)\((true|false),\s*"([^"]+)"\)\s*,?/gm;
  let match;

  while ((match = matcher.exec(enumBlock)) !== null) {
    const [, name, enabled, description] = match;
    features.push({ name, enabled: enabled === 'true', description });
  }

  return features;
};

const parseYamlFlags = (content, relativePath) => {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === 'feature-flags:');
  if (startIndex < 0) {
    fail(`${relativePath} is missing top-level feature-flags section`);
    return new Map();
  }

  const flags = new Map();

  for (const line of lines.slice(startIndex + 1)) {
    if (/^[A-Za-z0-9_-]+:\s*$/.test(line) && !line.startsWith(' ')) break;
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const match = line.match(/^ {2}([A-Za-z0-9_ -]+):\s*(true|false)\s*$/);
    if (!match) {
      fail(`${relativePath} has an invalid feature flag line: ${line}`);
      continue;
    }

    const [, name, enabled] = match;
    if (flags.has(name)) {
      fail(`${relativePath} contains duplicate flag: ${name}`);
    }
    flags.set(name, enabled === 'true');
  }

  return flags;
};

const compareYamlToEnum = (label, flags, features) => {
  const enumNames = new Set(features.map((feature) => feature.name));

  for (const feature of features) {
    if (!flags.has(feature.name)) {
      fail(`${label} is missing enum flag ${feature.name}`);
      continue;
    }

    if (flags.get(feature.name) !== feature.enabled) {
      fail(`${label} default for ${feature.name} does not match Feature.java`);
    }
  }

  for (const name of flags.keys()) {
    if (!enumNames.has(name)) {
      fail(`${label} declares non-canonical flag ${name}`);
    }
  }
};

for (const relativePath of Object.values(files)) {
  assertExists(relativePath);
}

const featureEnum = read(files.featureEnum);
const features = parseFeatureEnum(featureEnum);

if (features.length !== 40) {
  fail(`Feature.java must declare exactly 40 stable flags, found ${features.length}`);
}

assertUnique('Feature.java', features.map((feature) => feature.name));

for (const feature of features) {
  if (!featureNamePattern.test(feature.name)) {
    fail(`Feature.java flag must use stable lower-snake enable_* naming: ${feature.name}`);
  }

  if (!feature.description.trim()) {
    fail(`Feature.java flag is missing description: ${feature.name}`);
  }
}

const coreMatch = featureEnum.match(/getCoreFeatures\(\)[\s\S]+?Arrays\.asList\(([^)]+)\)/);
if (!coreMatch) {
  fail('Feature.java is missing getCoreFeatures Arrays.asList definition');
} else {
  const coreFeatures = coreMatch[1].split(',').map((value) => value.trim()).filter(Boolean);
  const expectedCore = ['enable_auth', 'enable_user_management', 'enable_profile_management'];
  if (JSON.stringify(coreFeatures) !== JSON.stringify(expectedCore)) {
    fail(`core feature set drifted. Expected ${expectedCore.join(', ')}, found ${coreFeatures.join(', ')}`);
  }

  const featureDefaults = new Map(features.map((feature) => [feature.name, feature.enabled]));
  for (const coreFeature of coreFeatures) {
    if (featureDefaults.get(coreFeature) !== true) {
      fail(`core feature must be enabled by default: ${coreFeature}`);
    }
  }
}

const runtimeFlags = parseYamlFlags(read(files.runtimeYaml), files.runtimeYaml);
const bomFlags = parseYamlFlags(read(files.bomYaml), files.bomYaml);

compareYamlToEnum(files.runtimeYaml, runtimeFlags, features);
compareYamlToEnum(files.bomYaml, bomFlags, features);

// Governance: system_settings feature-flag store must mirror Feature.java in every seed source.
const featuresByName = new Map(features.map((feature) => [feature.name, feature]));
verifyGovernanceInSeed(files.governanceSchema, featuresByName);
verifyGovernanceInSeed(files.seedData, featuresByName);

const serviceTest = read(files.serviceTest);
const controllerTest = read(files.controllerTest);

for (const requiredText of [
  'getAllFlagsWithStatus',
  'enable_job_recommendations',
  'resetAllFeatures',
]) {
  if (!serviceTest.includes(requiredText) && !controllerTest.includes(requiredText)) {
    fail(`feature flag tests do not cover ${requiredText}`);
  }
}

if (process.exitCode) {
  process.exit();
}

console.log(`feature-flag validation passed (${features.length} stable flags, runtime and BOM defaults aligned, system_settings governance canonical in ${files.governanceSchema} and ${files.seedData})`);
