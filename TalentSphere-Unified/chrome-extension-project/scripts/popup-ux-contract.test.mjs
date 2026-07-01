import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const extensionRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-extension-popup-ux-'));

const sourcePath = path.join(extensionRoot, 'src/lib/pageScanStatus.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const outputPath = path.join(tempDir, 'pageScanStatus.mjs');
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
  getPageScanDraftStatus,
  getPageScanFailureStatus,
  getScannedDraftReviewMessage,
  pageScanNoDraftStatus,
  pageScanStartedStatus,
} = await import(pathToFileURL(outputPath).href);

assert.equal(pageScanStartedStatus.tone, 'info');
assert.match(pageScanStartedStatus.message, /Review the draft before saving/);
assert.equal(getPageScanDraftStatus('high').tone, 'success');
assert.equal(getPageScanDraftStatus('medium').tone, 'warning');
assert.match(getPageScanDraftStatus('low').message, /limited tab details/i);
assert.equal(getScannedDraftReviewMessage('high'), '');
assert.match(getScannedDraftReviewMessage('medium'), /Review company, role, URL, and notes/);
assert.equal(getPageScanFailureStatus('active_tab_unavailable').title, 'No active tab to scan');
assert.equal(getPageScanFailureStatus('permission_denied').title, 'Scanning is not allowed on this tab');
assert.equal(getPageScanFailureStatus('messaging_unavailable').title, 'Page scan could not reach this tab');
assert.equal(getPageScanFailureStatus('unknown').title, 'Page scan could not run');

const publicCopy = JSON.stringify([
  pageScanStartedStatus,
  pageScanNoDraftStatus,
  getPageScanDraftStatus('high'),
  getPageScanDraftStatus('medium'),
  getPageScanFailureStatus('active_tab_unavailable'),
  getPageScanFailureStatus('permission_denied'),
  getPageScanFailureStatus('messaging_unavailable'),
  getPageScanFailureStatus('unknown'),
  getScannedDraftReviewMessage('medium'),
]);

assert.equal(/receiving end|service_role_token|QuotaExceededError|No active tab is available to scan|Chrome extension runtime/i.test(publicCopy), false);

const popupSource = fs.readFileSync(path.join(extensionRoot, 'src/popup/PopupApp.tsx'), 'utf8');
const localOnlyStatusSource = fs.readFileSync(path.join(extensionRoot, 'src/components/LocalOnlyStatus.tsx'), 'utf8');
assert.match(popupSource, /setPageScanStatus\(pageScanStartedStatus\)/);
assert.match(popupSource, /getPageScanDraftStatus\(response\.draft\.confidence\)/);
assert.match(popupSource, /getPageScanFailureStatus\(errorCategory\)/);
assert.match(popupSource, /jobsStorageIssue/);
assert.match(popupSource, /draftStorageIssue/);
assert.match(popupSource, /operationalEventsStorageIssue/);
assert.match(popupSource, /activeStorageIssue = jobsStorageIssue \?\? draftStorageIssue \?\? operationalEventsStorageIssue/);
assert.match(popupSource, /id="popup-storage-status"/);
assert.match(popupSource, /Local popup data could not load/);
assert.match(popupSource, /Local popup data may not persist/);
assert.match(popupSource, /Local storage needs attention/);
assert.match(popupSource, /id="popup-local-only-status"/);
assert.match(popupSource, /Local only - no cloud sync/);
assert.match(localOnlyStatusSource, /data-ui="extension-local-only-status"/);
assert.match(localOnlyStatusSource, /Cloud sync is not connected/);
assert.equal(/addLog\(`Page scan did not return a draft:/.test(popupSource), false);
assert.equal(/addLog\(`Page scan failed:/.test(popupSource), false);
assert.equal(/QuotaExceededError|chrome\.runtime\.lastError|service_role_token|activeStorageIssue\.key|jobsStorageIssue\.key|draftStorageIssue\.key|operationalEventsStorageIssue\.key/i.test(popupSource + localOnlyStatusSource), false);

const dashboardSource = fs.readFileSync(path.join(extensionRoot, 'src/popup/views/DashboardView.tsx'), 'utf8');
assert.match(dashboardSource, /id="page-scan-status"/);
assert.match(dashboardSource, /aria-live="polite"/);
assert.match(dashboardSource, /pageScanStatus\.tone === 'warning' \? 'alert' : 'status'/);

const jobsSource = fs.readFileSync(path.join(extensionRoot, 'src/popup/views/JobsView.tsx'), 'utf8');
assert.match(jobsSource, /id="scanned-draft-limited-review"/);
assert.match(jobsSource, /getScannedDraftReviewMessage\(draftForm\?\.confidence\)/);

fs.rmSync(tempDir, { recursive: true, force: true });

console.log('extension popup UX contract tests passed');
