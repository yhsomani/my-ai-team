import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const reportPath = path.join(repoRoot, 'docs', 'API_CONTRACT_MISMATCH_REPORT.md');
const manifestPath = path.join(repoRoot, 'module-manifest.json');

const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'target', 'coverage', '.turbo']);
const frontendRoot = path.join(repoRoot, 'apps', 'frontend', 'src');
const servicesRoot = path.join(repoRoot, 'services');
const gatewayConfigPath = path.join(servicesRoot, 'api-gateway', 'src', 'main', 'resources', 'application.yml');

const httpMethodByAnnotation = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
  Request: 'ANY',
};

const escapeMarkdown = (value) => String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const readJson = (filePath) => JSON.parse(readFile(filePath));

const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
const activeBackendModulePaths = new Set(manifest.backend?.mavenReactorModules || []);
const orphanedBackendModulePaths = new Set(
  (manifest.backend?.orphanedMavenModules || []).map((entry) => entry.path),
);

const relativePath = (filePath) => path.relative(repoRoot, filePath).replaceAll(path.sep, '/');

const walk = (dir, extensions) => {
  if (!fs.existsSync(dir)) return [];

  const results = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (skipDirs.has(entry.name)) continue;
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (extensions.some((extension) => entry.name.endsWith(extension))) {
        results.push(entryPath);
      }
    }
  }

  return results.sort();
};

const getLineNumber = (content, index) => content.slice(0, index).split('\n').length;

const dedupeByKey = (items, keyFn) => {
  const seen = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
};

const stripQuotes = (value) => value.slice(1, -1);

const normalizeRoutePath = (rawPath) => {
  if (!rawPath) return '/';

  let value = rawPath
    .trim()
    .replace(/\?.*$/, '')
    .replace(/\$\{[^}]+\}/g, '{param}')
    .replace(/\{(?!wildcard\})[^}/]+\}/g, '{param}')
    .replace(/:\w+/g, '{param}')
    .replace(/\/\*\*$/, '/{wildcard}')
    .replace(/\/\*/g, '/{wildcard}')
    .replace(/\/+/g, '/');

  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1) value = value.replace(/\/$/, '');
  return value;
};

const displayRoutePath = (rawPath) => {
  if (!rawPath) return '/';
  let value = rawPath
    .trim()
    .replace(/\?.*$/, '')
    .replace(/\$\{([^}]+)\}/g, '{$1}')
    .replace(/\/+/g, '/');
  if (!value.startsWith('/')) value = `/${value}`;
  if (value.length > 1) value = value.replace(/\/$/, '');
  return value;
};

const combinePaths = (basePath, childPath) => {
  if (!basePath && !childPath) return '/';
  if (childPath?.startsWith('/api/')) return childPath;
  const base = basePath || '';
  const child = childPath || '';
  return `${base}/${child}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
};

const routeSegments = (routePath) => normalizeRoutePath(routePath).split('/').filter(Boolean);

const routeMatches = (candidatePath, controllerPath) => {
  const candidate = routeSegments(candidatePath);
  const controller = routeSegments(controllerPath);

  for (let index = 0; index < controller.length; index += 1) {
    const controllerSegment = controller[index];
    const candidateSegment = candidate[index];

    if (controllerSegment === '{wildcard}') return candidate.length >= index;
    if (candidateSegment === undefined) return false;
    if (controllerSegment === '{param}') continue;
    if (candidateSegment === '{param}') return false;
    if (controllerSegment !== candidateSegment) return false;
  }

  return candidate.length === controller.length;
};

const methodMatches = (frontendMethod, backendMethod) => backendMethod === 'ANY' || frontendMethod === backendMethod;

const routeKey = ({ method, normalizedPath }) => `${method} ${normalizedPath}`;

const getFirstStringLiteral = (value) => {
  if (!value) return '';
  const match = value.match(/(["'])(.*?)\1/);
  return match ? match[2] : '';
};

const extractFrontendCalls = () => {
  const files = walk(frontendRoot, ['.ts', '.tsx'])
    .filter((filePath) => !/[.]test[.]|[.]spec[.]/.test(filePath));
  const calls = [];
  const apiCallRegex = /\b(?:apiClient|axios)\.(get|post|put|patch|delete)\s*\(\s*(`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/gs;

  for (const filePath of files) {
    const content = readFile(filePath);
    let match;

    while ((match = apiCallRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const literal = stripQuotes(match[2]);
      if (!literal.includes('/api/')) continue;

      const afterLiteral = content.slice(match.index + match[0].length, match.index + match[0].length + 80);
      let pathValue = literal;
      if (pathValue.endsWith('/') && /^\s*\+/.test(afterLiteral)) {
        pathValue = `${pathValue}{param}`;
      }

      calls.push({
        method,
        path: displayRoutePath(pathValue),
        normalizedPath: normalizeRoutePath(pathValue),
        file: relativePath(filePath),
        line: getLineNumber(content, match.index),
        source: match[0].replace(/\s+/g, ' '),
      });
    }
  }

  return dedupeByKey(calls, (call) => `${routeKey(call)} ${call.file}:${call.line}`);
};

const extractSupabaseTables = () => {
  const files = walk(frontendRoot, ['.ts', '.tsx'])
    .filter((filePath) => !/[.]test[.]|[.]spec[.]/.test(filePath));
  const tablesByName = new Map();
  const tableRegex = /\.from\s*\(\s*(['"`])([^'"`]+)\1\s*\)/g;

  for (const filePath of files) {
    const content = readFile(filePath);
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const table = match[2];
      if (!tablesByName.has(table)) tablesByName.set(table, new Set());
      tablesByName.get(table).add(relativePath(filePath));
    }
  }

  return Array.from(tablesByName.entries())
    .map(([table, filesForTable]) => ({
      table,
      files: Array.from(filesForTable).sort(),
    }))
    .sort((a, b) => a.table.localeCompare(b.table));
};

const extractBaseRequestMapping = (content, classIndex) => {
  const beforeClass = content.slice(0, classIndex);
  const requestMappings = Array.from(beforeClass.matchAll(/@RequestMapping\s*\(([\s\S]*?)\)/g));
  if (requestMappings.length === 0) return '';
  return getFirstStringLiteral(requestMappings.at(-1)[1]);
};

const extractMethodName = (contentAfterAnnotation) => {
  const signature = contentAfterAnnotation.match(/\bpublic\s+[\w<>, ?\[\].]+\s+(\w+)\s*\(/);
  return signature ? signature[1] : 'unknown';
};

const classifyBackendModule = (relativeFilePath) => {
  const match = relativeFilePath.match(/^(services\/[^/]+)\//);
  const modulePath = match?.[1] || '';
  if (activeBackendModulePaths.has(modulePath)) {
    return { modulePath, moduleStatus: 'active' };
  }
  if (orphanedBackendModulePaths.has(modulePath)) {
    return { modulePath, moduleStatus: 'orphaned' };
  }
  return { modulePath, moduleStatus: modulePath ? 'unclassified' : 'unknown' };
};

const extractBackendRoutes = () => {
  const controllerFiles = walk(servicesRoot, ['.java'])
    .filter((filePath) => filePath.includes('/src/main/java/') && filePath.includes('/controller/') && filePath.endsWith('.java'));
  const routes = [];
  const mappingRegex = /@(Get|Post|Put|Patch|Delete|Request)Mapping(?:\s*\(([\s\S]*?)\))?/g;

  for (const filePath of controllerFiles) {
    const content = readFile(filePath);
    const classIndex = content.search(/\bclass\s+\w+/);
    if (classIndex < 0) continue;

    const file = relativePath(filePath);
    const moduleInfo = classifyBackendModule(file);
    const basePath = extractBaseRequestMapping(content, classIndex);
    const classContent = content.slice(classIndex);
    let match;

    while ((match = mappingRegex.exec(classContent)) !== null) {
      const annotation = match[1];
      const args = match[2] || '';
      const method = httpMethodByAnnotation[annotation];
      const methodPath = getFirstStringLiteral(args);
      const fullPath = combinePaths(basePath, methodPath);
      if (!fullPath.startsWith('/api/')) continue;

      routes.push({
        method,
        path: displayRoutePath(fullPath),
        normalizedPath: normalizeRoutePath(fullPath),
        file,
        ...moduleInfo,
        line: getLineNumber(content, classIndex + match.index),
        handler: extractMethodName(classContent.slice(match.index + match[0].length)),
      });
    }
  }

  return dedupeByKey(routes, (route) => `${routeKey(route)} ${route.file}:${route.line}`);
};

const extractGatewayRoutes = () => {
  if (!fs.existsSync(gatewayConfigPath)) return [];

  const content = readFile(gatewayConfigPath);
  const routes = [];
  const pathRegex = /Path=(\/api\/v1\/[^\s,\]]+)/g;
  let match;

  while ((match = pathRegex.exec(content)) !== null) {
    routes.push({
      path: displayRoutePath(match[1]),
      normalizedPath: normalizeRoutePath(match[1]),
      file: relativePath(gatewayConfigPath),
      line: getLineNumber(content, match.index),
    });
  }

  return dedupeByKey(routes, (route) => route.normalizedPath);
};

const extractSecurityMatchers = () => {
  const javaFiles = walk(servicesRoot, ['.java'])
    .filter((filePath) => /SecurityConfig[.]java$|RouteValidator[.]java$|SharedSecurityConfig[.]java$/.test(filePath));
  const matchers = [];
  const stringRegex = /(["'])(\/api\/[^"']+)\1/g;

  for (const filePath of javaFiles) {
    const content = readFile(filePath);
    let match;

    while ((match = stringRegex.exec(content)) !== null) {
      matchers.push({
        path: displayRoutePath(match[2]),
        normalizedPath: normalizeRoutePath(match[2]),
        file: relativePath(filePath),
        line: getLineNumber(content, match.index),
        isLegacyPrefix: !match[2].startsWith('/api/v1/'),
      });
    }
  }

  return dedupeByKey(matchers, (matcher) => `${matcher.normalizedPath} ${matcher.file}:${matcher.line}`);
};

const findMatchingBackendRoute = (frontendCall, backendRoutes) => backendRoutes.find((backendRoute) => (
  methodMatches(frontendCall.method, backendRoute.method) &&
  routeMatches(frontendCall.normalizedPath, backendRoute.normalizedPath)
));

const findMatchingGatewayRoute = (route, gatewayRoutes) => gatewayRoutes.find((gatewayRoute) => (
  routeMatches(route.normalizedPath, gatewayRoute.normalizedPath)
));

const makeMarkdownTable = (headers, rows, emptyMessage) => {
  if (rows.length === 0) return `${emptyMessage}\n`;

  const header = `| ${headers.map(escapeMarkdown).join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map(escapeMarkdown).join(' | ')} |`).join('\n');
  return `${header}\n${divider}\n${body}\n`;
};

const formatLocation = (item) => `${item.file}:${item.line}`;

const getGeneratedAt = () => {
  if (process.env.API_CONTRACT_REPORT_GENERATED_AT) {
    return process.env.API_CONTRACT_REPORT_GENERATED_AT;
  }

  if (fs.existsSync(reportPath)) {
    const existing = readFile(reportPath).match(/^Generated: (.+)$/m);
    if (existing) return existing[1];
  }

  return new Date().toISOString();
};

const main = () => {
  const frontendCalls = extractFrontendCalls();
  const backendRoutes = extractBackendRoutes();
  const activeBackendRoutes = backendRoutes.filter((route) => route.moduleStatus === 'active');
  const nonActiveBackendRoutes = backendRoutes.filter((route) => route.moduleStatus !== 'active');
  const gatewayRoutes = extractGatewayRoutes();
  const securityMatchers = extractSecurityMatchers();
  const supabaseTables = extractSupabaseTables();

  const frontendCoverage = frontendCalls.map((call) => {
    const backendRoute = findMatchingBackendRoute(call, activeBackendRoutes);
    const nonActiveBackendRoute = findMatchingBackendRoute(call, nonActiveBackendRoutes);
    const gatewayRoute = findMatchingGatewayRoute(call, gatewayRoutes);
    return {
      ...call,
      backendRoute,
      nonActiveBackendRoute,
      gatewayRoute,
      status: backendRoute
        ? 'Matched active controller'
        : nonActiveBackendRoute
          ? `Matched ${nonActiveBackendRoute.moduleStatus} controller only`
          : gatewayRoute
            ? 'Gateway route only'
            : 'No matching active controller',
    };
  });

  const unmatchedFrontendCalls = frontendCoverage.filter((call) => !call.backendRoute);
  const backendWithoutGateway = activeBackendRoutes.filter((route) => !findMatchingGatewayRoute(route, gatewayRoutes));
  const unusedBackendRoutes = activeBackendRoutes.filter((route) => (
    !frontendCalls.some((call) => methodMatches(call.method, route.method) && routeMatches(call.normalizedPath, route.normalizedPath))
  ));
  const legacySecurityMatchers = securityMatchers.filter((matcher) => matcher.isLegacyPrefix);
  const followUpPriorities = [
    unmatchedFrontendCalls.length > 0
      ? 'Fix or remove frontend API calls listed under unmatched controller coverage before relying on API Gateway fallback paths.'
      : 'Keep unmatched frontend API client calls at zero as new gateway fallbacks are added.',
    backendWithoutGateway.length > 0
      ? 'Add API Gateway path predicates for controller routes listed without gateway coverage.'
      : 'Keep controller route gateway coverage at 100% as services add new `/api/v1/*` controllers.',
    legacySecurityMatchers.length > 0
      ? 'Align legacy `/api/*` security matcher paths with `/api/v1/*` controllers, or document why the matcher intentionally protects a different surface.'
      : 'Keep legacy `/api/*` security matcher paths at zero.',
    nonActiveBackendRoutes.length > 0
      ? 'Resolve orphaned or unclassified backend controller routes before treating them as deployable API surface.'
      : 'Keep orphaned or unclassified backend controller routes at zero.',
    'Decide which direct Supabase data paths should remain client-owned and which should move behind audited service APIs.',
    'Use `docs/API_OPENAPI_CONTRACT.json` as input to typed API-client generation and add runtime Springdoc/OpenAPI smoke tests when backend execution is available.',
  ];

  const generatedAt = getGeneratedAt();
  const lines = [
    '# API Contract Mismatch Report',
    '',
    '> Documentation status: Generated current report. Regenerate with `npm run report:api-contracts`; do not hand-edit route inventory tables.',
    '',
    `Generated: ${generatedAt}`,
    '',
    'Source: `npm run report:api-contracts` scans frontend `apiClient` calls, Spring controller mappings, API Gateway path predicates, security matcher strings, direct Supabase table access, and `module-manifest.json` backend module classification.',
    '',
    'This is a static analysis report. It is intentionally conservative: dynamic routes, service-to-service calls, Supabase direct access, runtime service discovery, and runtime serialization still need manual review or integration coverage. Request/response payload shapes are covered by the source-derived `docs/API_OPENAPI_CONTRACT.json` companion contract.',
    '',
    'The `Generated` value is preserved between runs unless `API_CONTRACT_REPORT_GENERATED_AT` is set, so CI can verify report drift deterministically.',
    '',
    '## Summary',
    '',
    makeMarkdownTable(
      ['Metric', 'Count'],
      [
        ['Frontend API client calls', frontendCalls.length],
        ['Active backend controller routes', activeBackendRoutes.length],
        ['Non-active backend controller routes', nonActiveBackendRoutes.length],
        ['Total backend controller routes scanned', backendRoutes.length],
        ['Gateway route prefixes', gatewayRoutes.length],
        ['Security matcher paths', securityMatchers.length],
        ['Direct Supabase tables used by frontend', supabaseTables.length],
        ['Frontend calls without matching active controller', unmatchedFrontendCalls.length],
        ['Active controller routes without gateway prefix', backendWithoutGateway.length],
        ['Legacy `/api/*` security matcher paths', legacySecurityMatchers.length],
      ],
      'No summary metrics found.'
    ),
    '',
    '## Frontend Calls Without Matching Controller',
    '',
    makeMarkdownTable(
      ['Method', 'Path', 'Status', 'Frontend location', 'Contract evidence'],
      unmatchedFrontendCalls.map((call) => [
        call.method,
        call.path,
        call.status,
        formatLocation(call),
        call.nonActiveBackendRoute
          ? `${call.nonActiveBackendRoute.method} ${call.nonActiveBackendRoute.path} (${call.nonActiveBackendRoute.moduleStatus}; ${formatLocation(call.nonActiveBackendRoute)})`
          : call.gatewayRoute
            ? `${call.gatewayRoute.path} (${formatLocation(call.gatewayRoute)})`
            : 'None',
      ]),
      'No unmatched frontend API client calls were found against active controller routes.'
    ),
    '',
    '## Matched Frontend Calls',
    '',
    makeMarkdownTable(
      ['Method', 'Frontend path', 'Controller path', 'Frontend location', 'Controller location'],
      frontendCoverage
        .filter((call) => call.backendRoute)
        .map((call) => [
          call.method,
          call.path,
          `${call.backendRoute.method} ${call.backendRoute.path}`,
          formatLocation(call),
          `${call.backendRoute.handler} (${formatLocation(call.backendRoute)})`,
        ]),
      'No matched frontend API client calls were found.'
    ),
    '',
    '## Controller Routes Without Gateway Prefix',
    '',
    makeMarkdownTable(
      ['Method', 'Controller path', 'Controller location'],
      backendWithoutGateway.map((route) => [
        route.method,
        route.path,
        `${route.handler} (${formatLocation(route)})`,
      ]),
      'Every scanned controller route is covered by an API Gateway path prefix.'
    ),
    '',
    '## Non-Active Backend Controller Routes',
    '',
    makeMarkdownTable(
      ['Status', 'Module', 'Method', 'Controller path', 'Controller location'],
      nonActiveBackendRoutes.map((route) => [
        route.moduleStatus,
        route.modulePath || 'unknown',
        route.method,
        route.path,
        `${route.handler} (${formatLocation(route)})`,
      ]),
      'No orphaned or unclassified backend controller routes were found.'
    ),
    '',
    '## Controller Routes Not Used By Frontend API Client',
    '',
    makeMarkdownTable(
      ['Method', 'Controller path', 'Controller location'],
      unusedBackendRoutes.map((route) => [
        route.method,
        route.path,
        `${route.handler} (${formatLocation(route)})`,
      ]),
      'Every scanned controller route is referenced by the frontend API client.'
    ),
    '',
    '## Legacy Security Matcher Paths',
    '',
    makeMarkdownTable(
      ['Path', 'Location'],
      legacySecurityMatchers.map((matcher) => [
        matcher.path,
        formatLocation(matcher),
      ]),
      'No legacy `/api/*` security matcher paths were found.'
    ),
    '',
    '## Direct Supabase Tables Used By Frontend',
    '',
    makeMarkdownTable(
      ['Table', 'Frontend files'],
      supabaseTables.map((entry) => [
        entry.table,
        entry.files.join(', '),
      ]),
      'No direct frontend Supabase table access was found.'
    ),
    '',
    '## Follow-Up Priorities',
    '',
    ...followUpPriorities.map((priority, index) => `${index + 1}. ${priority}`),
    '',
  ];

  fs.writeFileSync(reportPath, `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`);

  console.log(`API contract report generated: ${relativePath(reportPath)}`);
  console.log(`Frontend calls: ${frontendCalls.length}`);
  console.log(`Active backend routes: ${activeBackendRoutes.length}`);
  console.log(`Non-active backend routes: ${nonActiveBackendRoutes.length}`);
  console.log(`Unmatched frontend calls: ${unmatchedFrontendCalls.length}`);
  console.log(`Legacy security matchers: ${legacySecurityMatchers.length}`);
};

main();
