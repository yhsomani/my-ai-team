import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const alertsPath = path.join(repoRoot, 'infra', 'observability', 'alerts', 'critical-alerts.json');
const dashboardPath = path.join(repoRoot, 'infra', 'observability', 'dashboards', 'critical-flows-dashboard.json');
const runbookPath = path.join(repoRoot, 'docs', 'runbooks', 'INCIDENT_RUNBOOKS.md');
const packagePath = path.join(repoRoot, 'package.json');

const requiredCriticalFlows = [
  'api_contract',
  'openapi_payload_contract',
  'auth_gateway_contract',
  'security_contract',
  'file_upload_security',
  'scheduler_automations',
  'extension_contract',
  'data_ownership',
  'deployment_reference',
  'frontend_validation',
  'ci_security_scan',
  'admin_operational_degradation',
];

const allowedSeverities = new Set(['info', 'warning', 'critical']);
const allowedOwners = new Set(['platform', 'security', 'operations', 'extension', 'data', 'frontend']);

const fail = (message) => {
  console.error(`observability contract validation failed: ${message}`);
  process.exitCode = 1;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const assertExists = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    fail(`${label} is missing at ${path.relative(repoRoot, filePath)}`);
    return false;
  }
  return true;
};

const validateCatalogBasics = (catalog, label) => {
  if (catalog.schemaVersion !== 1) fail(`${label} must use schemaVersion 1`);
  if (catalog.status !== 'source-level') fail(`${label} must be marked source-level`);
  if (!Array.isArray(catalog.limitations) || catalog.limitations.length === 0) {
    fail(`${label} must document runtime limitations`);
  }
  const limitationText = (catalog.limitations || []).join(' ');
  if (!limitationText.includes('Not verified from the codebase')) {
    fail(`${label} limitations must use the exact Not verified from the codebase phrase`);
  }
};

const markdownAnchorForHeading = (heading) => heading
  .replace(/^##\s+/, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const extractRunbookAnchors = (runbookContent) => new Set(
  Array.from(runbookContent.matchAll(/^## Incident: .+$/gm), (match) => markdownAnchorForHeading(match[0])),
);

const validateRunbookLink = (runbookLink, label, runbookContent) => {
  if (!runbookLink?.startsWith('docs/runbooks/INCIDENT_RUNBOOKS.md#incident-')) {
    fail(`${label} must link to a current incident runbook anchor`);
    return;
  }
  const anchor = runbookLink.split('#')[1];
  const runbookAnchors = extractRunbookAnchors(runbookContent);
  if (!runbookAnchors.has(anchor)) {
    fail(`${label} links to missing runbook anchor ${anchor}`);
  }
};

const extractRootScript = (command) => {
  const match = command.match(/^npm run ([\w:-]+)/);
  return match?.[1] || null;
};

const main = () => {
  const haveAlerts = assertExists(alertsPath, 'critical alert catalog');
  const haveDashboard = assertExists(dashboardPath, 'critical dashboard catalog');
  const haveRunbook = assertExists(runbookPath, 'current incident runbook');
  const havePackage = assertExists(packagePath, 'root package.json');
  if (!haveAlerts || !haveDashboard || !haveRunbook || !havePackage) process.exit();

  const alerts = readJson(alertsPath);
  const dashboard = readJson(dashboardPath);
  const rootPackage = readJson(packagePath);
  const rootScripts = rootPackage.scripts || {};
  const runbookContent = fs.readFileSync(runbookPath, 'utf8');

  validateCatalogBasics(alerts, 'critical alert catalog');
  validateCatalogBasics(dashboard, 'critical dashboard catalog');

  const alertFlowSet = new Set();
  const dashboardFlowSet = new Set();
  const alertIds = new Set();
  const panelIds = new Set();

  for (const group of alerts.alertGroups || []) {
    if (!group.id) fail('alert group is missing id');
    if (!requiredCriticalFlows.includes(group.criticalFlow)) {
      fail(`alert group ${group.id || '<missing>'} has unknown criticalFlow ${group.criticalFlow}`);
    }
    alertFlowSet.add(group.criticalFlow);
    if (!allowedOwners.has(group.owner)) fail(`alert group ${group.id} has invalid owner ${group.owner}`);
    validateRunbookLink(group.runbook, `alert group ${group.id}`, runbookContent);

    if (!Array.isArray(group.alerts) || group.alerts.length === 0) {
      fail(`alert group ${group.id} must contain at least one alert`);
    }

    for (const alert of group.alerts || []) {
      if (!alert.id) fail(`alert in group ${group.id} is missing id`);
      if (alertIds.has(alert.id)) fail(`duplicate alert id ${alert.id}`);
      alertIds.add(alert.id);
      if (!allowedSeverities.has(alert.severity)) fail(`alert ${alert.id} has invalid severity ${alert.severity}`);
      if (!alert.summary) fail(`alert ${alert.id} is missing summary`);
      if (!alert.signal) fail(`alert ${alert.id} is missing signal`);
      if (!alert.response) fail(`alert ${alert.id} is missing response`);
      if (!alert.sourceCommand) {
        fail(`alert ${alert.id} is missing sourceCommand`);
      } else {
        const rootScript = extractRootScript(alert.sourceCommand);
        if (rootScript && !rootScripts[rootScript]) {
          fail(`alert ${alert.id} references missing root npm script ${rootScript}`);
        }
      }
    }
  }

  for (const panel of dashboard.panels || []) {
    if (!panel.id) fail('dashboard panel is missing id');
    if (panelIds.has(panel.id)) fail(`duplicate dashboard panel id ${panel.id}`);
    panelIds.add(panel.id);
    if (!panel.title) fail(`dashboard panel ${panel.id} is missing title`);
    if (!requiredCriticalFlows.includes(panel.criticalFlow)) {
      fail(`dashboard panel ${panel.id || '<missing>'} has unknown criticalFlow ${panel.criticalFlow}`);
    }
    dashboardFlowSet.add(panel.criticalFlow);
    if (!allowedOwners.has(panel.owner)) fail(`dashboard panel ${panel.id} has invalid owner ${panel.owner}`);
    validateRunbookLink(panel.runbook, `dashboard panel ${panel.id}`, runbookContent);
    if (!Array.isArray(panel.signals) || panel.signals.length < 2) {
      fail(`dashboard panel ${panel.id} must list at least two source/runtime signals`);
    }
  }

  for (const flow of requiredCriticalFlows) {
    if (!alertFlowSet.has(flow)) fail(`missing alert coverage for critical flow ${flow}`);
    if (!dashboardFlowSet.has(flow)) fail(`missing dashboard coverage for critical flow ${flow}`);
  }

  if (process.exitCode) {
    process.exit();
  }

  console.log(`observability contract validation passed (${alertIds.size} alerts, ${panelIds.size} dashboard panels, ${requiredCriticalFlows.length} critical flows)`);
};

main();
