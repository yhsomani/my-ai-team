import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const manifestPath = path.join(repoRoot, 'module-manifest.json');

const fail = (message) => {
  console.error(`docs lifecycle validation failed: ${message}`);
  process.exitCode = 1;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const resolveFromRepo = (relativePath) => path.resolve(repoRoot, relativePath);

const relativeToRepo = (absolutePath) => path.relative(repoRoot, absolutePath).replaceAll(path.sep, '/');

const walkMarkdown = (root) => {
  const results = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') continue;
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (entry.name.endsWith('.md')) {
        results.push(relativeToRepo(entryPath));
      }
    }
  }

  return results.sort();
};

const assertSameList = (label, actual, expected) => {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    fail(`${label} mismatch.\nExpected: ${expected.join(', ')}\nActual: ${actual.join(', ')}`);
  }
};

const firstLines = (filePath, count) => fs.readFileSync(filePath, 'utf8').split(/\r?\n/).slice(0, count).join('\n');

const manifest = readJson(manifestPath);
const developmentArtifactPaths = new Set((manifest.developmentArtifacts || []).map((entry) => entry.path));
const rootMarkdownDocs = fs.readdirSync(repoRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => entry.name);
const markdownDocs = [
  ...rootMarkdownDocs,
  ...walkMarkdown(path.join(repoRoot, 'docs')),
]
  .filter((docPath) => !developmentArtifactPaths.has(docPath))
  .sort();

const docs = manifest.documentation || [];
const classifiedMarkdownDocs = docs
  .map((entry) => entry.path)
  .sort();

const seenPaths = new Set();
const seenIds = new Set();

for (const entry of docs) {
  if (!entry.id) fail(`documentation entry is missing id for path ${entry.path || '<missing>'}`);
  if (!entry.path) fail(`documentation entry ${entry.id || '<missing>'} is missing path`);
  if (!entry.kind) fail(`documentation entry ${entry.id || entry.path} is missing kind`);
  if (!entry.status) fail(`documentation entry ${entry.id || entry.path} is missing status`);
  if (!entry.note) fail(`documentation entry ${entry.id || entry.path} is missing note`);

  if (seenIds.has(entry.id)) fail(`duplicate documentation id: ${entry.id}`);
  seenIds.add(entry.id);

  if (seenPaths.has(entry.path)) fail(`duplicate documentation path: ${entry.path}`);
  seenPaths.add(entry.path);

  const absolutePath = resolveFromRepo(entry.path);
  if (!fs.existsSync(absolutePath)) {
    fail(`documentation path is missing: ${entry.path}`);
    continue;
  }

  const banner = firstLines(absolutePath, 8);
  if (!/^>\s*Documentation status:/m.test(banner)) {
    fail(`documentation path is missing a top-level Documentation status banner: ${entry.path}`);
  }
}

assertSameList('Markdown documentation lifecycle classification', classifiedMarkdownDocs, markdownDocs);

if (process.exitCode) {
  process.exit();
}

console.log(`docs lifecycle validation passed (${docs.length} Markdown docs classified)`);
