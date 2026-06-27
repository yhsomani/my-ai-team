import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const manifestPath = path.join(repoRoot, 'module-manifest.json');

const fail = (message) => {
  console.error(`module-manifest validation failed: ${message}`);
  process.exitCode = 1;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const resolveFromRepo = (relativePath) => path.resolve(repoRoot, relativePath);

const relativeToRepo = (absolutePath) => path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');

const assertExists = (entry) => {
  if (entry.required === false) return;
  const absolutePath = resolveFromRepo(entry.path);
  if (!fs.existsSync(absolutePath)) {
    fail(`required path is missing: ${entry.path}`);
  }
};

const assertPackageName = (entry) => {
  if (!entry.packageName) return;
  const packagePath = resolveFromRepo(path.join(entry.path, 'package.json'));
  if (!fs.existsSync(packagePath)) {
    fail(`package module ${entry.id} is missing package.json at ${path.join(entry.path, 'package.json')}`);
    return;
  }

  const packageJson = readJson(packagePath);
  if (packageJson.name !== entry.packageName) {
    fail(`package module ${entry.id} expected package name ${entry.packageName}, found ${packageJson.name || '<missing>'}`);
  }
};

const extractPomModules = (pomFile) => {
  const content = fs.readFileSync(pomFile, 'utf8');
  return Array.from(content.matchAll(/<module>\s*([^<\s]+)\s*<\/module>/g), (match) => match[1]);
};

const findServicePomModules = () => {
  const servicesRoot = path.join(repoRoot, 'services');
  return fs.readdirSync(servicesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(servicesRoot, entry.name, 'pom.xml'))
    .filter((pomPath) => fs.existsSync(pomPath))
    .map((pomPath) => relativeToRepo(path.dirname(pomPath)))
    .sort();
};

const assertSameList = (label, actual, expected) => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    fail(`${label} mismatch.\nExpected: ${expected.join(', ')}\nActual: ${actual.join(', ')}`);
  }
};

const manifest = readJson(manifestPath);

if (manifest.schemaVersion !== 1) {
  fail(`unsupported schemaVersion ${manifest.schemaVersion}`);
}

for (const entry of [
  ...(manifest.applications || []),
  ...(manifest.infrastructure || []),
  ...(manifest.tooling || []),
  ...(manifest.legacySources || []),
  ...(manifest.documentation || []),
  ...(manifest.developmentArtifacts || []),
  ...(manifest.generatedOrExternal || []),
]) {
  assertExists(entry);
  assertPackageName(entry);
}

const rootPackageJson = readJson(path.join(repoRoot, 'package.json'));
const manifestWorkspaces = (manifest.applications || [])
  .filter((entry) => entry.workspacePackage)
  .map((entry) => entry.path)
  .sort();
const packageWorkspaces = [...(rootPackageJson.workspaces || [])].sort();
assertSameList('npm workspaces', packageWorkspaces, manifestWorkspaces);

const reactorPomPath = resolveFromRepo(manifest.backend?.reactorPom || 'pom.xml');
const pomModules = extractPomModules(reactorPomPath);
assertSameList('Maven reactor modules', pomModules, manifest.backend.mavenReactorModules);

for (const modulePath of manifest.backend.mavenReactorModules) {
  const pomPath = resolveFromRepo(path.join(modulePath, 'pom.xml'));
  if (!fs.existsSync(pomPath)) {
    fail(`Maven reactor module is missing pom.xml: ${modulePath}`);
  }
}

const classifiedServiceModules = [
  ...manifest.backend.mavenReactorModules,
  ...(manifest.backend.orphanedMavenModules || []).map((entry) => entry.path),
].sort();
const servicePomModules = findServicePomModules();
assertSameList('classified services/* modules with pom.xml', servicePomModules, classifiedServiceModules);

for (const stalePath of manifest.removedStalePaths || []) {
  if (fs.existsSync(resolveFromRepo(stalePath.path))) {
    fail(`stale path should not exist: ${stalePath.path}`);
  }
}

if (process.exitCode) {
  process.exit();
}

const orphaned = manifest.backend.orphanedMavenModules?.length || 0;
const documentation = manifest.documentation?.length || 0;
const developmentArtifacts = manifest.developmentArtifacts?.length || 0;
const generatedOrExternal = manifest.generatedOrExternal?.length || 0;
console.log(`module-manifest validation passed (${manifest.backend.mavenReactorModules.length} Maven reactor modules, ${orphaned} orphaned Maven module classified, ${documentation} documentation paths classified, ${developmentArtifacts} development artifacts classified, ${generatedOrExternal} generated/external paths classified)`);
