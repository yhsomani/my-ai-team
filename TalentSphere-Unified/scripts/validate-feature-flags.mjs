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

console.log(`feature-flag validation passed (${features.length} stable flags, runtime and BOM defaults aligned)`);
