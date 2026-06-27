import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const failures = [];

const fail = (message) => {
  failures.push(message);
};

const readFile = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readFile(relativePath));
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));
const basename = (modulePath) => path.basename(modulePath);

const manifest = readJson('module-manifest.json');
const packageJson = readJson('package.json');

const activeDeployables = new Set(
  (manifest.backend?.mavenReactorModules || [])
    .map(basename)
    .filter((moduleName) => moduleName === 'api-gateway' || moduleName.endsWith('-service')),
);

const orphanedDeployables = new Set(
  (manifest.backend?.orphanedMavenModules || []).map((entry) => basename(entry.path)),
);

const validateDeployableRef = (moduleName, source) => {
  if (activeDeployables.has(moduleName)) return;
  if (orphanedDeployables.has(moduleName)) {
    fail(`${source} references orphaned module ${moduleName}; resolve it before deployment`);
    return;
  }
  fail(`${source} references missing or unclassified deployable module ${moduleName}`);
};

const getDockerComposeFiles = () => (manifest.infrastructure || [])
  .filter((entry) => entry.kind === 'docker-compose')
  .map((entry) => entry.path);

const findTopLevelComposeServices = (content) => {
  const serviceNames = new Set();
  const lines = content.split('\n');
  let inServices = false;

  for (const line of lines) {
    if (/^services:\s*$/.test(line)) {
      inServices = true;
      continue;
    }

    if (inServices && /^[A-Za-z_][\w-]*:\s*$/.test(line)) {
      break;
    }

    const serviceMatch = inServices ? line.match(/^  ([A-Za-z0-9_-]+):\s*$/) : null;
    if (serviceMatch) {
      serviceNames.add(serviceMatch[1]);
    }
  }

  return serviceNames;
};

const validateComposeDependsOn = (relativePath, content, serviceNames) => {
  const lines = content.split('\n');
  let dependsIndent = null;

  for (const line of lines) {
    const indent = line.match(/^ */)?.[0].length ?? 0;
    if (dependsIndent !== null && line.trim() && indent <= dependsIndent) {
      dependsIndent = null;
    }

    if (/^\s+depends_on:\s*$/.test(line)) {
      dependsIndent = indent;
      continue;
    }

    if (dependsIndent === null || !line.trim()) {
      continue;
    }

    const listMatch = line.match(/^\s+-\s+([A-Za-z0-9_-]+)\s*$/);
    const mapMatch = line.match(/^\s+([A-Za-z0-9_-]+):\s*$/);
    const dependencyName = listMatch?.[1] || mapMatch?.[1];
    if (dependencyName && !serviceNames.has(dependencyName)) {
      fail(`${relativePath} depends_on missing service ${dependencyName}`);
    }
  }
};

const validateDockerCompose = (relativePath) => {
  if (!exists(relativePath)) {
    fail(`docker compose file is missing: ${relativePath}`);
    return;
  }

  const content = readFile(relativePath);
  const serviceNames = findTopLevelComposeServices(content);

  for (const match of content.matchAll(/SERVICE_NAME:\s*([A-Za-z0-9_-]+)/g)) {
    validateDeployableRef(match[1], `${relativePath} SERVICE_NAME`);
  }

  for (const match of content.matchAll(/MODULE:\s*services\/([A-Za-z0-9_-]+)/g)) {
    validateDeployableRef(match[1], `${relativePath} MODULE`);
  }

  for (const staleMount of ['./src:/app/src', './public:/app/public']) {
    if (content.includes(staleMount)) {
      fail(`${relativePath} uses stale frontend bind mount ${staleMount}`);
    }
  }

  validateComposeDependsOn(relativePath, content, serviceNames);
};

const parseKustomizeServiceResources = (relativePath) => {
  const content = readFile(relativePath);
  return Array.from(content.matchAll(/^\s*-\s+services\/([A-Za-z0-9_-]+)\.yaml\s*$/gm), (match) => match[1]);
};

const validateKubernetes = () => {
  const kustomizationPath = 'infra/k8s/base/kustomization.yaml';
  if (!exists(kustomizationPath)) {
    fail(`${kustomizationPath} is missing`);
    return;
  }

  const kustomizeServices = new Set(parseKustomizeServiceResources(kustomizationPath));
  for (const moduleName of activeDeployables) {
    if (!kustomizeServices.has(moduleName)) {
      fail(`${kustomizationPath} is missing active deployable resource services/${moduleName}.yaml`);
    }
  }

  for (const moduleName of kustomizeServices) {
    validateDeployableRef(moduleName, `${kustomizationPath} resource`);
    const resourcePath = `infra/k8s/base/services/${moduleName}.yaml`;
    if (!exists(resourcePath)) {
      fail(`${kustomizationPath} references missing resource ${resourcePath}`);
    }
  }

  const servicesDir = path.join(repoRoot, 'infra/k8s/base/services');
  for (const entry of fs.readdirSync(servicesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.yaml')) continue;
    const moduleName = entry.name.replace(/\.yaml$/, '');
    validateDeployableRef(moduleName, `infra/k8s/base/services/${entry.name}`);
    if (!kustomizeServices.has(moduleName)) {
      fail(`infra/k8s/base/services/${entry.name} is not listed in ${kustomizationPath}`);
    }
  }
};

const validateSchedulerCronJobs = () => {
  const cronPath = 'infra/k8s/base/notification-digest-cronjobs.yaml';
  if (!exists(cronPath)) {
    fail(`${cronPath} is missing`);
    return;
  }

  const scripts = packageJson.scripts || {};
  const content = readFile(cronPath);
  for (const match of content.matchAll(/command:\s*\["npm",\s*"run",\s*"([^"]+)"/g)) {
    const scriptName = match[1];
    if (!scripts[scriptName]) {
      fail(`${cronPath} references missing npm script ${scriptName}`);
    }
  }
};

const validateGatewayRoutes = () => {
  const gatewayPath = 'services/api-gateway/src/main/resources/application.yml';
  if (!exists(gatewayPath)) {
    fail(`${gatewayPath} is missing`);
    return;
  }

  const content = readFile(gatewayPath);
  for (const match of content.matchAll(/uri:\s*lb:\/\/([A-Za-z0-9_-]+)/g)) {
    validateDeployableRef(match[1], `${gatewayPath} gateway URI`);
  }
};

for (const composePath of getDockerComposeFiles()) {
  validateDockerCompose(composePath);
}

validateKubernetes();
validateSchedulerCronJobs();
validateGatewayRoutes();

if (failures.length > 0) {
  console.error('infrastructure manifest validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`infrastructure manifest validation passed (${getDockerComposeFiles().length} compose files, ${activeDeployables.size} active deployable modules)`);
