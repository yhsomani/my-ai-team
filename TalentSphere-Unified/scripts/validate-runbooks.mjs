import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const runbookPath = path.join(repoRoot, 'docs', 'runbooks', 'INCIDENT_RUNBOOKS.md');

const requiredHeadings = [
  '## Incident: API Route Contract Drift',
  '## Incident: OpenAPI Payload Contract Drift',
  '## Incident: Auth Or Gateway Security Contract Regression',
  '## Incident: Production Secret Or Safe Error Contract Regression',
  '## Incident: File Upload Security Regression',
  '## Incident: Scheduler Automation Failure',
  '## Incident: Extension Regression',
  '## Incident: Data Ownership Or Schema Drift',
  '## Incident: Deployment Reference Drift',
  '## Incident: Observability Contract Drift',
  '## Incident: Frontend Validation Or Build Failure',
  '## Incident: CI Security Scan Failure',
  '## Incident: Admin Operational Dashboard Degraded Or Misleading',
];

const requiredCommands = [
  'npm run report:api-contracts',
  'npm run report:api-openapi',
  'npm run validate:api-openapi-contract',
  'npm run validate:module-manifest',
  'npm run validate:infrastructure-manifest',
  'npm run validate:docs-lifecycle',
  'npm run validate:observability-contract',
  'npm run validate:data-ownership',
  'npm run validate:auth-contract',
  'npm run validate:security-contract',
  'npm run test:scheduler-audit',
  'npm run test:saved-search-digest-discovery',
  'npm run test:notification-digests',
  'npm run test:networking-reminders',
  'npm run test:extension-messaging',
  'npm run test:extension-storage-migrations',
  'npm run test:extension-contract',
  'npm run lint',
  'npm run test:unit',
  'npm run build',
];

const forbiddenPatterns = [
  /PagerDuty:\s*\+?1-?555/i,
  /devops@talentsphere\.com/i,
  /security@talentsphere\.com/i,
  /raw resume text.*recorded/i,
  /raw job descriptions?.*recorded/i,
];

const fail = (message) => {
  console.error(`runbook validation failed: ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(runbookPath)) {
  fail('docs/runbooks/INCIDENT_RUNBOOKS.md is missing');
  process.exit();
}

const content = fs.readFileSync(runbookPath, 'utf8');
const firstLines = content.split(/\r?\n/).slice(0, 8).join('\n');

if (!/^>\s*Documentation status:/m.test(firstLines)) {
  fail('current incident runbook is missing a top-level Documentation status banner');
}

for (const heading of requiredHeadings) {
  if (!content.includes(heading)) {
    fail(`missing required incident section: ${heading}`);
  }
}

for (const command of requiredCommands) {
  if (!content.includes(command)) {
    fail(`missing required source command: ${command}`);
  }
}

for (const pattern of forbiddenPatterns) {
  if (pattern.test(content)) {
    fail(`forbidden placeholder or unsafe runbook content matched ${pattern}`);
  }
}

if (!content.includes('Not verified from the codebase')) {
  fail('runbook must explicitly mark runtime-only evidence as Not verified from the codebase');
}

if (process.exitCode) {
  process.exit();
}

console.log(`runbook validation passed (${requiredHeadings.length} incident sections, ${requiredCommands.length} source commands)`);
