import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const contractPath = path.join(repoRoot, 'docs', 'API_OPENAPI_CONTRACT.json');

const fail = (message) => {
  console.error(`openapi contract validation failed: ${message}`);
  process.exitCode = 1;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

if (!fs.existsSync(contractPath)) {
  fail('docs/API_OPENAPI_CONTRACT.json is missing. Run npm run report:api-openapi.');
  process.exit();
}

const contract = readJson(contractPath);

if (contract.openapi !== '3.1.0') {
  fail(`expected OpenAPI 3.1.0, found ${contract.openapi || '<missing>'}`);
}

if (!contract.paths || typeof contract.paths !== 'object') {
  fail('paths object is missing');
}

if (!contract.components?.schemas || typeof contract.components.schemas !== 'object') {
  fail('components.schemas object is missing');
}

const operations = [];
for (const [route, methods] of Object.entries(contract.paths || {})) {
  for (const [method, operation] of Object.entries(methods || {})) {
    if (!operation?.operationId) {
      fail(`${method.toUpperCase()} ${route} is missing operationId`);
      continue;
    }
    if (!operation?.responses?.['200']) {
      fail(`${method.toUpperCase()} ${route} is missing a 200 response contract`);
    }
    operations.push(`${method.toUpperCase()} ${route} ${operation.operationId}`);
  }
}

const declaredOperationCount = contract['x-talentsphere']?.activeOperationCount;
if (declaredOperationCount !== operations.length) {
  fail(`activeOperationCount ${declaredOperationCount} does not match generated path operations ${operations.length}`);
}

const missingRefs = [];
const parserWarnings = [];
const seenRefs = [];
const scan = (value, pointer = '') => {
  if (!value || typeof value !== 'object') return;
  if (value['x-contract-warning']) {
    parserWarnings.push(`${pointer}: ${value['x-java-type'] || '<unknown type>'}`);
  }
  if (value.$ref) {
    const prefix = '#/components/schemas/';
    if (!value.$ref.startsWith(prefix)) {
      missingRefs.push(`${pointer}: unsupported ref ${value.$ref}`);
    } else {
      const schemaName = value.$ref.slice(prefix.length);
      seenRefs.push(schemaName);
      if (!contract.components.schemas[schemaName]) {
        missingRefs.push(`${pointer}: missing schema ${schemaName}`);
      }
    }
  }

  for (const [key, child] of Object.entries(value)) {
    scan(child, `${pointer}/${key}`);
  }
};

scan(contract);

if (missingRefs.length > 0) {
  fail(`missing or unsupported schema refs:\n${missingRefs.slice(0, 20).join('\n')}`);
}

if (parserWarnings.length > 0) {
  fail(`parser warnings remain in the generated contract:\n${parserWarnings.slice(0, 20).join('\n')}`);
}

const duplicateOperations = operations.filter((operation, index) => operations.indexOf(operation) !== index);
if (duplicateOperations.length > 0) {
  fail(`duplicate OpenAPI operations found:\n${duplicateOperations.join('\n')}`);
}

if (process.exitCode) {
  process.exit();
}

console.log(
  `openapi contract validation passed (${operations.length} operations, ${Object.keys(contract.components.schemas).length} schemas, ${seenRefs.length} schema refs)`,
);
