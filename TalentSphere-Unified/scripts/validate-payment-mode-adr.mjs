import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const adrPath = path.join(repoRoot, 'docs', 'adr', 'ADR-005-payment-mode.md');
const manifestPath = path.join(repoRoot, 'module-manifest.json');
const planPath = path.resolve(repoRoot, '..', 'PLAN.md');
const architectureIndexPath = path.join(repoRoot, 'docs', 'ARCHITECTURE_STATUS_INDEX.md');
const moduleManifestDocPath = path.join(repoRoot, 'docs', 'MODULE_MANIFEST.md');
const packageJsonPath = path.join(repoRoot, 'package.json');
const apiReportPath = path.join(repoRoot, 'docs', 'API_CONTRACT_MISMATCH_REPORT.md');
const openApiPath = path.join(repoRoot, 'docs', 'API_OPENAPI_CONTRACT.json');
const frontendPaymentServicePath = path.join(repoRoot, 'apps', 'frontend', 'src', 'services', 'paymentService.ts');
const billingPagePath = path.join(repoRoot, 'apps', 'frontend', 'src', 'pages', 'billing', 'BillingPage.tsx');
const paymentServicePath = path.join(repoRoot, 'services', 'payment-service', 'src', 'main', 'java', 'com', 'talentsphere', 'payment', 'service', 'PaymentService.java');
const stripeConfigPath = path.join(repoRoot, 'services', 'payment-service', 'src', 'main', 'java', 'com', 'talentsphere', 'payment', 'config', 'StripeConfig.java');

const requiredAdrPhrases = [
  'Status: Accepted',
  'explicit demo billing mode',
  'provider-backed checkout',
  'provider-owned subscription/payment state',
  'billingMode',
  'providerBacked: false',
  'services/payment-service',
  'create-checkout-session',
  'create-subscription',
  'Not verified from the codebase',
  'npm run validate:payment-mode-adr',
];

const fail = (message) => {
  console.error(`payment mode ADR validation failed: ${message}`);
  process.exitCode = 1;
};

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readFile(filePath));

const assertExists = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    fail(`${label} is missing at ${path.relative(repoRoot, filePath)}`);
    return false;
  }
  return true;
};

const requiredFiles = [
  [adrPath, 'ADR-005'],
  [manifestPath, 'module manifest'],
  [planPath, 'PLAN.md'],
  [architectureIndexPath, 'architecture status index'],
  [moduleManifestDocPath, 'module manifest docs'],
  [packageJsonPath, 'package.json'],
  [apiReportPath, 'API contract report'],
  [openApiPath, 'OpenAPI contract'],
  [frontendPaymentServicePath, 'frontend payment service'],
  [billingPagePath, 'billing page'],
  [paymentServicePath, 'backend payment service'],
  [stripeConfigPath, 'Stripe config'],
];

let missing = false;
for (const [filePath, label] of requiredFiles) {
  if (!assertExists(filePath, label)) missing = true;
}
if (missing) process.exit();

const adr = readFile(adrPath);
const manifest = readJson(manifestPath);
const plan = readFile(planPath);
const architectureIndex = readFile(architectureIndexPath);
const moduleManifestDoc = readFile(moduleManifestDocPath);
const packageJson = readJson(packageJsonPath);
const apiReport = readFile(apiReportPath);
const openApi = readJson(openApiPath);
const frontendPaymentService = readFile(frontendPaymentServicePath);
const billingPage = readFile(billingPagePath);
const backendPaymentService = readFile(paymentServicePath);
const stripeConfig = readFile(stripeConfigPath);

const firstLines = adr.split(/\r?\n/).slice(0, 8).join('\n');
if (!/^>\s*Documentation status:/m.test(firstLines)) {
  fail('ADR-005 is missing a top-level Documentation status banner');
}

for (const phrase of requiredAdrPhrases) {
  if (!adr.includes(phrase)) {
    fail(`ADR-005 is missing required phrase: ${phrase}`);
  }
}

const adrManifestEntry = (manifest.documentation || []).find((entry) => entry.path === 'docs/adr/ADR-005-payment-mode.md');
if (!adrManifestEntry) {
  fail('module-manifest.json does not classify docs/adr/ADR-005-payment-mode.md');
} else {
  if (adrManifestEntry.status !== 'current') fail('ADR-005 manifest status must be current');
  if (adrManifestEntry.kind !== 'accepted-adr') fail('ADR-005 manifest kind must be accepted-adr');
}

const validatorEntry = (manifest.tooling || []).find((entry) => entry.path === 'scripts/validate-payment-mode-adr.mjs');
if (!validatorEntry) {
  fail('module-manifest.json does not classify scripts/validate-payment-mode-adr.mjs');
} else {
  if (validatorEntry.status !== 'active') fail('payment mode validator manifest status must be active');
  if (validatorEntry.kind !== 'node-script') fail('payment mode validator manifest kind must be node-script');
}

if (packageJson.scripts?.['validate:payment-mode-adr'] !== 'node scripts/validate-payment-mode-adr.mjs') {
  fail('package.json is missing validate:payment-mode-adr script');
}

if (plan.includes('| ADR-005 Payment mode | Proposed |')) {
  fail('PLAN.md still lists ADR-005 as Proposed');
}
if (!plan.includes('| ADR-005 Payment mode | Accepted |')) {
  fail('PLAN.md must list ADR-005 as Accepted');
}
if (!plan.includes('- [x] Payment mode ADR accepted and demo billing mode is explicit.')) {
  fail('PLAN.md security checklist must mark payment mode/demo billing complete');
}
if (!plan.includes('Live Stripe integration, signed webhook execution, provider-owned subscription/payment state, and provider runtime tests remain Not verified from the codebase.')) {
  fail('PLAN.md must keep payment provider runtime limits explicit');
}

if (!architectureIndex.includes('ADR-005 accepts explicit demo billing mode')) {
  fail('ARCHITECTURE_STATUS_INDEX.md must summarize the accepted payment mode decision');
}
if (!moduleManifestDoc.includes('npm run validate:payment-mode-adr')) {
  fail('docs/MODULE_MANIFEST.md must document the payment mode ADR validator');
}

if (!frontendPaymentService.includes("mode: 'demo'")) fail('frontend payment service must expose demo mode');
if (!frontendPaymentService.includes('providerBacked: false')) fail('frontend payment service must mark providerBacked false');
if (!frontendPaymentService.includes('create-checkout-session')) fail('frontend payment service must still evidence repo-external checkout handoff');
if (!frontendPaymentService.includes('create-subscription')) fail('frontend payment service must still evidence repo-external subscription handoff');
if (!billingPage.includes('Demo billing mode')) fail('billing page must display demo billing mode');
if (!billingPage.includes('provider webhooks are implemented')) fail('billing page must keep webhook-owned state limitation visible');

if (!backendPaymentService.includes('"sess_"')) fail('backend payment service must still evidence synthetic session IDs');
if (!backendPaymentService.includes('STRIPE_PAYMENT_URL_BASE')) fail('backend payment service must still evidence synthetic URL base configuration');
if (backendPaymentService.includes('stripeConfig.createCheckoutSession')) fail('backend payment service unexpectedly creates provider checkout sessions; update ADR-005 validator');
if (!stripeConfig.includes('Session.create')) fail('Stripe config scaffold is missing expected provider helper evidence');

if (!apiReport.includes('| POST | /api/v1/payments/checkout |')) fail('API report must include active payment checkout route');
if (/\/api\/v1\/payments\/[^|\n]*webhook/i.test(apiReport)) {
  fail('API report exposes a payment webhook route; update ADR-005 once provider mode is implemented');
}

const deployablePaths = Object.keys(openApi.paths || {});
if (!deployablePaths.includes('/api/v1/payments/checkout')) {
  fail('OpenAPI contract must include active payment checkout route');
}
const webhookPaths = deployablePaths.filter((apiPath) => /payment|billing|stripe/i.test(apiPath) && /webhook/i.test(apiPath));
if (webhookPaths.length > 0) {
  fail(`OpenAPI contract exposes payment webhook paths before provider mode is accepted: ${webhookPaths.join(', ')}`);
}

if (process.exitCode) {
  process.exit();
}

console.log('payment mode ADR validation passed (demo billing mode explicit; no active payment webhook route)');
