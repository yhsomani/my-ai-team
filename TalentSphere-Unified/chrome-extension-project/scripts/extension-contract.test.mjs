import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(scriptDir, '..');
const srcRoot = path.join(extensionRoot, 'src');

const readText = (relativePath) => fs.readFileSync(path.join(extensionRoot, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

const walkSourceFiles = (dir) => {
  const results = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (/\.(ts|tsx|json)$/.test(entry.name)) {
        results.push(entryPath);
      }
    }
  }

  return results.sort();
};

const manifest = readJson('public/manifest.json');

assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions.sort(), ['activeTab', 'scripting', 'storage'].sort());
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.oauth2, undefined);
assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'self';");
assert.deepEqual(Object.keys(manifest.action.default_icon).sort(), ['128', '16', '48']);
for (const [size, iconPath] of Object.entries(manifest.action.default_icon)) {
  const icon = fs.readFileSync(path.join(extensionRoot, 'public', iconPath));
  assert.equal(icon[0], 0x89, `${iconPath} should be a PNG file`);
  assert.equal(icon.toString('ascii', 1, 4), 'PNG', `${iconPath} should have a PNG signature`);
  assert.equal(icon.readUInt32BE(16), Number(size), `${iconPath} width should match manifest size`);
  assert.equal(icon.readUInt32BE(20), Number(size), `${iconPath} height should match manifest size`);
}
assert.deepEqual(manifest.content_scripts[0].matches.sort(), [
  '*://*.glassdoor.com/*',
  '*://*.indeed.com/*',
  '*://*.linkedin.com/*',
].sort());

const sourceFiles = walkSourceFiles(srcRoot);
const sourceByPath = new Map(sourceFiles.map((filePath) => [
  path.relative(extensionRoot, filePath).replaceAll(path.sep, '/'),
  fs.readFileSync(filePath, 'utf8'),
]));
const allSource = Array.from(sourceByPath.entries())
  .map(([relativePath, content]) => `\n// ${relativePath}\n${content}`)
  .join('\n');

assert.equal(/chrome\.storage\.sync|storage\.sync/.test(allSource), false);
assert.equal(/\bfetch\s*\(|XMLHttpRequest\b/.test(allSource), false);

const settingsView = sourceByPath.get('src/options/views/SettingsView.tsx');
assert.match(settingsView, /Cloud sync is not enabled yet/);
assert.match(settingsView, /extension data stays in this browser/);
assert.match(settingsView, /raw content is not stored/);

const operationalAnalytics = sourceByPath.get('src/lib/operationalAnalytics.ts');
assert.match(operationalAnalytics, /const MAX_LOCAL_EVENTS = 200;/);
assert.match(operationalAnalytics, /existingEvents\.slice\(-\(MAX_LOCAL_EVENTS - 1\)\)/);
assert.match(operationalAnalytics, /EXTENSION_OPERATIONAL_ANALYTICS_STORAGE_KEY = 'ts_extension_operational_analytics'/);
assert.match(operationalAnalytics, /EXTENSION_USAGE_DIAGNOSTICS_KEY = 'ts_settings_analytics'/);

const safeMetadataMatch = operationalAnalytics.match(/const SAFE_METADATA_KEYS = new Set\(\[([\s\S]*?)\]\);/);
assert.ok(safeMetadataMatch, 'SAFE_METADATA_KEYS must remain an explicit allowlist');
const safeMetadataKeys = new Set(Array.from(
  safeMetadataMatch[1].matchAll(/'([^']+)'/g),
  (match) => match[1]
));

for (const requiredKey of [
  'job_description_length_band',
  'resume_length_band',
  'job_keyword_count_band',
  'matched_keyword_count_band',
  'missing_keyword_count_band',
  'cloud_sync_enabled',
  'usage_diagnostics_enabled',
  'event_count',
  'source_category',
]) {
  assert.equal(safeMetadataKeys.has(requiredKey), true, `${requiredKey} should remain allowed`);
}

for (const forbiddenKey of [
  'jobDescription',
  'job_description',
  'resumeText',
  'resume_text',
  'description',
  'notes',
  'rawTitle',
  'message_body',
  'coverLetter',
  'cover_letter',
  'prompt',
  'email',
  'token',
  'password',
  'url',
  'posting_url',
]) {
  assert.equal(safeMetadataKeys.has(forbiddenKey), false, `${forbiddenKey} must not be diagnostics metadata`);
}

const optionsApp = sourceByPath.get('src/options/OptionsApp.tsx');
assert.match(optionsApp, /job_description_length_band: textLengthBand\(jobDescription\)/);
assert.match(optionsApp, /resume_length_band: textLengthBand\(resumeText\)/);
assert.doesNotMatch(optionsApp, /metadata:\s*\{[^}]*jobDescription\s*:/s);
assert.doesNotMatch(optionsApp, /metadata:\s*\{[^}]*resumeText\s*:/s);

const popupApp = sourceByPath.get('src/popup/PopupApp.tsx');
assert.match(popupApp, /events: safeEvents/);
assert.match(popupApp, /eventCount: safeEvents\.length/);
assert.doesNotMatch(popupApp, /events:\s*logs/);
assert.doesNotMatch(popupApp, /resumeText|jobDescription/);

console.log('extension contract tests passed');
