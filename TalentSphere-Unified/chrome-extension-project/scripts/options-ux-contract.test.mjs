import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const extensionRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-extension-options-ux-'));

const sourcePath = path.join(extensionRoot, 'src/lib/resumeMatchStatus.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const outputPath = path.join(tempDir, 'resumeMatchStatus.mjs');
fs.writeFileSync(
  outputPath,
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
  }).outputText,
);

const {
  RESUME_MATCH_LARGE_TEXT_WARNING_CHARS,
  getResumeMatchInputStatus,
  getResumeMatchProgressStatus,
} = await import(pathToFileURL(outputPath).href);

assert.equal(
  getResumeMatchInputStatus({
    jobDescription: '',
    resumeText: '',
    hasSubmitted: false,
  }),
  null,
);

assert.equal(
  getResumeMatchInputStatus({
    jobDescription: '',
    resumeText: '',
    hasSubmitted: true,
  }).title,
  'Comparison needs both text areas',
);

assert.equal(
  getResumeMatchInputStatus({
    jobDescription: '',
    resumeText: 'Resume text with enough context to avoid the short-text warning.'.repeat(4),
    hasSubmitted: true,
  }).title,
  'Target job description is missing',
);

assert.equal(
  getResumeMatchInputStatus({
    jobDescription: 'Target job description with enough context to avoid the short-text warning.'.repeat(4),
    resumeText: '',
    hasSubmitted: true,
  }).title,
  'Resume text is missing',
);

assert.equal(
  getResumeMatchInputStatus({
    jobDescription: 'short',
    resumeText: 'also short',
    hasSubmitted: true,
  }).title,
  'Short text may limit the preview',
);

assert.equal(
  getResumeMatchInputStatus({
    jobDescription: 'Role '.repeat(RESUME_MATCH_LARGE_TEXT_WARNING_CHARS / 5 + 1),
    resumeText: 'Resume text with enough context to avoid the short-text warning.'.repeat(4),
    hasSubmitted: true,
  }).title,
  'Large local comparison',
);

assert.equal(getResumeMatchProgressStatus({ optimizing: true, optimized: false }).title, 'Comparing locally');
assert.equal(getResumeMatchProgressStatus({ optimizing: false, optimized: true }).tone, 'success');
assert.equal(getResumeMatchProgressStatus({ optimizing: false, optimized: false }), null);

const publicCopy = JSON.stringify([
  getResumeMatchInputStatus({ jobDescription: '', resumeText: '', hasSubmitted: true }),
  getResumeMatchInputStatus({
    jobDescription: 'Role '.repeat(RESUME_MATCH_LARGE_TEXT_WARNING_CHARS / 5 + 1),
    resumeText: 'Resume text with enough context to avoid the short-text warning.'.repeat(4),
    hasSubmitted: true,
  }),
  getResumeMatchProgressStatus({ optimizing: true, optimized: false }),
  getResumeMatchProgressStatus({ optimizing: false, optimized: true }),
]);

assert.equal(/service_role_token|QuotaExceededError|receiving end|resumeText|jobDescription|Chrome extension runtime/i.test(publicCopy), false);

const aiViewSource = fs.readFileSync(path.join(extensionRoot, 'src/options/views/AIView.tsx'), 'utf8');
assert.match(aiViewSource, /getResumeMatchInputStatus\(\{/);
assert.match(aiViewSource, /getResumeMatchProgressStatus\(\{ optimizing, optimized \}\)/);
assert.match(aiViewSource, /id="resume-match-input-status"/);
assert.match(aiViewSource, /aria-live="polite"/);
assert.match(aiViewSource, /role=\{activeStatus\.tone === 'warning' \? 'alert' : 'status'\}/);
assert.match(aiViewSource, /<label htmlFor="job-desc-textarea"/);
assert.match(aiViewSource, /<label htmlFor="resume-textarea"/);
assert.match(aiViewSource, /onInvalid=\{\(\) => setHasFieldValidationAttempt\(true\)\}/);
assert.match(aiViewSource, /aria-invalid=\{jobDescriptionMissing\}/);
assert.match(aiViewSource, /aria-invalid=\{resumeTextMissing\}/);
assert.match(aiViewSource, /formatCharacterCount\(jobDescription\)/);
assert.match(aiViewSource, /formatCharacterCount\(resumeText\)/);
assert.match(aiViewSource, /aria-busy=\{optimizing\}/);

const prepViewSource = fs.readFileSync(path.join(extensionRoot, 'src/options/views/PrepView.tsx'), 'utf8');
assert.match(prepViewSource, /<label htmlFor="prep-topic-input"/);
assert.match(prepViewSource, /<label htmlFor="prep-category-select"/);
assert.match(prepViewSource, /id="prep-topic-validation"/);
assert.match(prepViewSource, /aria-live="polite"/);
assert.match(prepViewSource, /aria-invalid=\{topicMissing\}/);
assert.match(prepViewSource, /aria-describedby=\{topicDescribedBy\}/);
assert.match(prepViewSource, /role="list"/);
assert.match(prepViewSource, /role="listitem"/);
assert.match(prepViewSource, /aria-pressed=\{item\.completed\}/);
assert.doesNotMatch(prepViewSource, /role="button"/);

const settingsViewSource = fs.readFileSync(path.join(extensionRoot, 'src/options/views/SettingsView.tsx'), 'utf8');
assert.match(settingsViewSource, /aria-controls="settings-prep-clear-review"/);
assert.match(settingsViewSource, /aria-expanded=\{isPrepClearReviewOpen\}/);
assert.match(settingsViewSource, /id="settings-prep-clear-review"/);
assert.match(settingsViewSource, /role="alert"/);
assert.match(settingsViewSource, /id="settings-storage-status"/);
assert.match(settingsViewSource, /activeStorageIssue/);
assert.match(settingsViewSource, /Local settings may not persist/);

const storageHookSource = fs.readFileSync(path.join(extensionRoot, 'src/hooks/useChromeStorage.ts'), 'utf8');
assert.match(storageHookSource, /export interface ChromeStorageIssue/);
assert.match(storageHookSource, /operation: ChromeStorageOperation/);
assert.match(storageHookSource, /setStorageIssue\(\{/);
assert.match(storageHookSource, /initialValueRef = useRef<T>\(initialValue\)/);
assert.match(storageHookSource, /newValue === undefined \? initialValueRef\.current : newValue/);
assert.match(storageHookSource, /return \[storedValue, setValue, loading, storageIssue\]/);

const storageSource = fs.readFileSync(path.join(extensionRoot, 'src/lib/storage.ts'), 'utf8');
assert.match(storageSource, /localStorage\.setItem\(key, JSON\.stringify\(value\)\)/);
assert.match(storageSource, /throw err/);

const optionsSource = fs.readFileSync(path.join(extensionRoot, 'src/options/OptionsApp.tsx'), 'utf8');
const localOnlyStatusSource = fs.readFileSync(path.join(extensionRoot, 'src/components/LocalOnlyStatus.tsx'), 'utf8');
assert.match(optionsSource, /job_description_length_band: textLengthBand\(jobDescription\)/);
assert.match(optionsSource, /resume_length_band: textLengthBand\(resumeText\)/);
assert.match(optionsSource, /prepStorageIssue/);
assert.match(optionsSource, /notificationsStorageIssue/);
assert.match(optionsSource, /analyticsStorageIssue/);
assert.match(optionsSource, /id="options-local-only-status"/);
assert.match(localOnlyStatusSource, /Tracked jobs, scanned drafts, prep cards, settings, and diagnostics stay in this browser/);
assert.match(localOnlyStatusSource, /Cloud sync is not connected/);
assert.doesNotMatch(optionsSource, /metadata:\s*\{[^}]*jobDescription\s*:/s);
assert.doesNotMatch(optionsSource, /metadata:\s*\{[^}]*resumeText\s*:/s);
assert.doesNotMatch(optionsSource, /metadata:\s*\{[^}]*newTopic\s*:/s);
assert.doesNotMatch(optionsSource, /metadata:\s*\{[^}]*topic\s*:/s);

assert.match(prepViewSource, /id="prep-storage-status"/);
assert.match(prepViewSource, /Preparation cards may not persist/);
assert.equal(/QuotaExceededError|chrome\.runtime\.lastError|service_role_token|storageIssue\.key/i.test(prepViewSource + settingsViewSource), false);

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('extension options UX contract tests passed');
