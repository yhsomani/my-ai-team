import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const extensionRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-extension-messaging-'));

const transpileSource = (relativePath) => {
  const sourcePath = path.join(extensionRoot, relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  }).outputText.replaceAll("from './jobTypes'", "from './jobTypes.mjs'");
  const outputPath = path.join(tempDir, path.basename(relativePath).replace(/\.ts$/, '.mjs'));
  fs.writeFileSync(outputPath, transpiled);
  return outputPath;
};

transpileSource('src/lib/jobTypes.ts');
const contentModulePath = transpileSource('src/content/index.ts');
const draftModulePath = transpileSource('src/lib/pageScanDraft.ts');

const {
  buildScanMetadataFromPage,
  parseScanTitle,
  stripPortalSuffix,
} = await import(pathToFileURL(contentModulePath).href);
const {
  buildJobScanDraft,
  hostFromUrl,
  parsePageScanTitle,
} = await import(pathToFileURL(draftModulePath).href);

assert.deepEqual(parseScanTitle('Senior Product Engineer at Acme Labs | LinkedIn'), {
  role: 'Senior Product Engineer',
  company: 'Acme Labs',
});
assert.equal(stripPortalSuffix('Senior Product Engineer - LinkedIn'), 'Senior Product Engineer');

const metadata = buildScanMetadataFromPage({
  hostname: 'www.linkedin.com',
  href: 'https://www.linkedin.com/jobs/view/123',
  title: 'Senior Product Engineer at Acme Labs | LinkedIn',
  queryText(selectors) {
    if (selectors.some((selector) => selector.includes('job-title'))) return 'Senior Product Engineer';
    if (selectors.some((selector) => selector.includes('company-name'))) return 'Acme Labs';
    if (selectors.some((selector) => selector.includes('job-details'))) {
      return 'Build candidate workflow tools. '.repeat(40);
    }
    return '';
  },
  metaContent() {
    return '';
  },
});

assert.equal(metadata.status, 'success');
assert.equal(metadata.role, 'Senior Product Engineer');
assert.equal(metadata.company, 'Acme Labs');
assert.equal(metadata.source, 'linkedin.com');
assert.equal(metadata.url, 'https://www.linkedin.com/jobs/view/123');
assert.equal(metadata.confidence, 'high');
assert.equal(metadata.description.length, 600);

const fallbackMetadata = buildScanMetadataFromPage({
  hostname: 'careers.example.com',
  href: 'https://careers.example.com/jobs/456',
  title: 'Staff Designer - Example Careers',
  queryText() {
    return '';
  },
  metaContent(name) {
    if (name === 'og:site_name') return 'Example Careers';
    if (name === 'description') return 'Design role summary.';
    return '';
  },
});

assert.equal(fallbackMetadata.role, 'Staff Designer');
assert.equal(fallbackMetadata.company, 'Example Careers');
assert.equal(fallbackMetadata.confidence, 'high');

assert.deepEqual(parsePageScanTitle('Backend Engineer at TalentSphere - Glassdoor'), {
  role: 'Backend Engineer',
  company: 'TalentSphere',
});
assert.equal(hostFromUrl('https://www.indeed.com/viewjob?jk=1'), 'indeed.com');
assert.equal(hostFromUrl('not-a-url'), '');

const draft = buildJobScanDraft({
  metadata,
  tab: {
    title: 'Fallback title',
    url: 'https://fallback.example/jobs/1',
  },
  id: 'scan-1',
  scannedAt: '2026-06-27T10:00:00.000Z',
});

assert.equal(draft.id, 'scan-1');
assert.equal(draft.company, 'Acme Labs');
assert.equal(draft.role, 'Senior Product Engineer');
assert.equal(draft.status, 'Applied');
assert.equal(draft.url, 'https://www.linkedin.com/jobs/view/123');
assert.equal(draft.source, 'linkedin.com');
assert.equal(draft.confidence, 'high');
assert.equal(draft.notes.startsWith('Scanned page excerpt:'), true);
assert.ok(draft.notes.length <= 'Scanned page excerpt: '.length + 320);

const fallbackDraft = buildJobScanDraft({
  tab: {
    title: 'QA Engineer at Example Co',
    url: 'https://jobs.example.com/qa',
  },
  id: 'scan-2',
  scannedAt: '2026-06-27T10:05:00.000Z',
});

assert.equal(fallbackDraft.role, 'QA Engineer');
assert.equal(fallbackDraft.company, 'Example Co');
assert.equal(fallbackDraft.source, 'jobs.example.com');
assert.equal(fallbackDraft.confidence, 'medium');

const backgroundSource = fs.readFileSync(path.join(extensionRoot, 'src/background/index.ts'), 'utf8');
assert.match(backgroundSource, /chrome\.tabs\.sendMessage\(tabId,\s*\{\s*action:\s*'scrape_job_metadata'\s*\}/s);
assert.match(backgroundSource, /message\.action === 'ping'/);
assert.match(backgroundSource, /message\.action === 'analyze_page'/);
assert.match(backgroundSource, /sendResponse\(\{\s*status:\s*'unhandled'\s*\}\)/s);
assert.match(backgroundSource, /return true; \/\/ Keeps messaging port open for async handling/);

const contentSource = fs.readFileSync(path.join(extensionRoot, 'src/content/index.ts'), 'utf8');
assert.match(contentSource, /chrome\.runtime\.onMessage\.addListener/);
assert.match(contentSource, /message\.action === 'scrape_job_metadata'/);
assert.match(contentSource, /sendResponse\(buildScanMetadata\(\)\)/);
assert.match(contentSource, /return false; \/\/ Synchronous handler/);

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('extension messaging tests passed');
