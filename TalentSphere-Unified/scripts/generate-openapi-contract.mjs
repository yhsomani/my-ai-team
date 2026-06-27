import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const manifestPath = path.join(repoRoot, 'module-manifest.json');
const outputPath = path.join(repoRoot, 'docs', 'API_OPENAPI_CONTRACT.json');
const servicesRoot = path.join(repoRoot, 'services');
const packagePath = path.join(repoRoot, 'package.json');

const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'target', 'coverage', '.turbo']);

const httpMethodByAnnotation = {
  Get: 'get',
  Post: 'post',
  Put: 'put',
  Patch: 'patch',
  Delete: 'delete',
  Request: 'x-any',
};

const springMethodByAnnotation = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
  Request: 'ANY',
};

const primitiveTypes = new Set([
  'boolean',
  'byte',
  'short',
  'int',
  'long',
  'float',
  'double',
  'char',
]);

const simpleTypeSchemas = {
  String: { type: 'string' },
  char: { type: 'string', maxLength: 1 },
  Character: { type: 'string', maxLength: 1 },
  UUID: { type: 'string', format: 'uuid' },
  LocalDate: { type: 'string', format: 'date' },
  LocalDateTime: { type: 'string', format: 'date-time' },
  Instant: { type: 'string', format: 'date-time' },
  OffsetDateTime: { type: 'string', format: 'date-time' },
  Date: { type: 'string', format: 'date-time' },
  BigDecimal: { type: 'number' },
  Double: { type: 'number', format: 'double' },
  double: { type: 'number', format: 'double' },
  Float: { type: 'number', format: 'float' },
  float: { type: 'number', format: 'float' },
  Integer: { type: 'integer', format: 'int32' },
  int: { type: 'integer', format: 'int32' },
  Long: { type: 'integer', format: 'int64' },
  long: { type: 'integer', format: 'int64' },
  Short: { type: 'integer', format: 'int32' },
  short: { type: 'integer', format: 'int32' },
  Byte: { type: 'integer', format: 'int32' },
  byte: { type: 'integer', format: 'int32' },
  Boolean: { type: 'boolean' },
  boolean: { type: 'boolean' },
  Object: { type: 'object' },
  Void: { type: 'null' },
  void: { type: 'null' },
  MultipartFile: { type: 'string', format: 'binary' },
  Resource: { type: 'string', format: 'binary' },
};

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => JSON.parse(readFile(filePath));

const manifest = readJson(manifestPath);
const packageJson = readJson(packagePath);
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

const stripQuotes = (value) => value.slice(1, -1);

const getFirstStringLiteral = (value) => {
  if (!value) return '';
  const match = value.match(/(["'])(.*?)\1/);
  return match ? match[2] : '';
};

const normalizeRoutePath = (rawPath) => {
  if (!rawPath) return '/';

  let value = rawPath
    .trim()
    .replace(/\?.*$/, '')
    .replace(/\$\{[^}]+\}/g, '{param}')
    .replace(/\{([^}:]+):[^}]+\}/g, '{$1}')
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

const extractPackageName = (content) => content.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1] || '';

const extractImports = (content) => {
  const imports = new Map();
  for (const match of content.matchAll(/^\s*import\s+(?:static\s+)?([\w.*]+)\s*;/gm)) {
    const importPath = match[1];
    if (importPath.endsWith('.*')) continue;
    imports.set(importPath.split('.').at(-1), importPath);
  }
  return imports;
};

const extractBaseRequestMapping = (content, classIndex) => {
  const beforeClass = content.slice(0, classIndex);
  const requestMappings = Array.from(beforeClass.matchAll(/@RequestMapping\s*\(([\s\S]*?)\)/g));
  if (requestMappings.length === 0) return '';
  return getFirstStringLiteral(requestMappings.at(-1)[1]);
};

const splitTopLevel = (value, delimiter = ',') => {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = '';

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const previous = value[index - 1];
    if (quote) {
      current += char;
      if (char === quote && previous !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '<' || char === '(' || char === '[') depth += 1;
    if (char === '>' || char === ')' || char === ']') depth -= 1;
    if (char === delimiter && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
};

const extractBalancedBlock = (content, openingBraceIndex) => {
  if (openingBraceIndex < 0 || content[openingBraceIndex] !== '{') return '';
  let depth = 0;
  let quote = '';
  for (let index = openingBraceIndex; index < content.length; index += 1) {
    const char = content[index];
    const previous = content[index - 1];
    if (quote) {
      if (char === quote && previous !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return content.slice(openingBraceIndex, index + 1);
  }
  return content.slice(openingBraceIndex);
};

const stripAnnotations = (value) => value
  .replace(/@[\w.]+(?:\s*\([^)]*\))?\s*/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const parseAnnotationValue = (parameter, annotationName) => {
  const regex = new RegExp(`@(?:[\\w.]+\\.)?${annotationName}(?:\\s*\\(([\\s\\S]*?)\\))?`);
  const match = parameter.match(regex);
  if (!match) return {};
  const args = match[1] || '';
  const positional = getFirstStringLiteral(args);
  const namedValue = args.match(/\b(?:value|name)\s*=\s*(["'])(.*?)\1/)?.[2];
  const requiredFalse = /\brequired\s*=\s*false\b/.test(args);
  const hasDefault = /\bdefaultValue\s*=/.test(args);
  return {
    name: namedValue || positional || '',
    required: !(requiredFalse || hasDefault),
    raw: args,
  };
};

const parseParameter = (parameter) => {
  const cleaned = stripAnnotations(parameter);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const name = tokens.at(-1).replace(/\.\.\.$/, '');
  const type = tokens.slice(0, -1).join(' ').replace(/\s+/g, '');
  return { name, type };
};

const parseParameters = (rawParameters) => splitTopLevel(rawParameters)
  .map((parameter) => {
    const parsed = parseParameter(parameter);
    if (!parsed) return null;

    const pathVariable = parseAnnotationValue(parameter, 'PathVariable');
    const requestParam = parseAnnotationValue(parameter, 'RequestParam');
    const requestHeader = parseAnnotationValue(parameter, 'RequestHeader');
    const requestBody = /@(?:[\w.]+\.)?RequestBody\b/.test(parameter);
    const valid = /@(?:[\w.]+\.)?Valid\b/.test(parameter);

    let source = 'unknown';
    let name = parsed.name;
    let required = true;
    if (requestBody) {
      source = 'body';
    } else if (/@(?:[\w.]+\.)?PathVariable\b/.test(parameter)) {
      source = 'path';
      name = pathVariable.name || name;
    } else if (/@(?:[\w.]+\.)?RequestParam\b/.test(parameter)) {
      source = parsed.type === 'MultipartFile' ? 'multipart' : 'query';
      name = requestParam.name || name;
      required = requestParam.required;
    } else if (/@(?:[\w.]+\.)?RequestHeader\b/.test(parameter)) {
      source = 'header';
      name = requestHeader.name || name;
      required = requestHeader.required;
    }

    return {
      name,
      javaName: parsed.name,
      javaType: parsed.type,
      source,
      required,
      valid,
    };
  })
  .filter(Boolean);

const parseMethodSignature = (contentAfterAnnotation) => {
  const match = contentAfterAnnotation.match(/\bpublic\s+([\s\S]*?)\s+(\w+)\s*\(([\s\S]*?)\)\s*\{/);
  if (!match) return null;
  return {
    returnType: match[1].replace(/\s+/g, ' ').trim(),
    methodName: match[2],
    parameters: parseParameters(match[3]),
  };
};

const extractOperationAnnotations = (contentAfterMapping, signatureIndex) => contentAfterMapping.slice(0, signatureIndex);

const normalizeOperationId = (className, methodName) => `${className}.${methodName}`;

const extractOperations = () => {
  const controllerFiles = walk(servicesRoot, ['.java'])
    .filter((filePath) => filePath.includes('/src/main/java/') && filePath.includes('/controller/') && filePath.endsWith('.java'));
  const operations = [];
  const mappingRegex = /@(Get|Post|Put|Patch|Delete|Request)Mapping(?:\s*\(([\s\S]*?)\))?/g;

  for (const filePath of controllerFiles) {
    const content = readFile(filePath);
    const classMatch = content.match(/\bclass\s+(\w+)/);
    const classIndex = classMatch ? content.indexOf(classMatch[0]) : -1;
    if (classIndex < 0) continue;

    const file = relativePath(filePath);
    const moduleInfo = classifyBackendModule(file);
    const packageName = extractPackageName(content);
    const imports = extractImports(content);
    const basePath = extractBaseRequestMapping(content, classIndex);
    const classContent = content.slice(classIndex);
    let match;

    while ((match = mappingRegex.exec(classContent)) !== null) {
      const annotation = match[1];
      const args = match[2] || '';
      const methodPath = getFirstStringLiteral(args);
      const fullPath = combinePaths(basePath, methodPath);
      if (!fullPath.startsWith('/api/')) continue;

      const afterMapping = classContent.slice(match.index + match[0].length);
      const signatureMatch = afterMapping.match(/\bpublic\s+[\s\S]*?\s+\w+\s*\([\s\S]*?\)\s*\{/);
      const signatureIndex = signatureMatch ? afterMapping.indexOf(signatureMatch[0]) : -1;
      const signature = signatureMatch ? parseMethodSignature(afterMapping.slice(signatureIndex)) : null;
      if (!signature) continue;

      const operationAnnotations = extractOperationAnnotations(afterMapping, signatureIndex);
      const operationSummary = operationAnnotations.match(/@Operation\s*\(([\s\S]*?)\)/)?.[1]
        ?.match(/\bsummary\s*=\s*(["'])(.*?)\1/)?.[2];
      const authorization = operationAnnotations.match(/@PreAuthorize\s*\((["'])(.*?)\1\)/)?.[2] || null;

      operations.push({
        ...moduleInfo,
        file,
        line: getLineNumber(content, classIndex + match.index),
        className: classMatch[1],
        packageName,
        imports,
        method: springMethodByAnnotation[annotation],
        openApiMethod: httpMethodByAnnotation[annotation],
        path: displayRoutePath(fullPath),
        normalizedPath: normalizeRoutePath(fullPath),
        handler: signature.methodName,
        operationId: normalizeOperationId(classMatch[1], signature.methodName),
        returnType: signature.returnType,
        parameters: signature.parameters,
        authorization,
        summary: operationSummary || `${springMethodByAnnotation[annotation]} ${displayRoutePath(fullPath)}`,
      });
    }
  }

  return operations.sort((a, b) => `${a.path} ${a.method} ${a.operationId}`.localeCompare(`${b.path} ${b.method} ${b.operationId}`));
};

const scanJavaTypes = () => {
  const files = walk(servicesRoot, ['.java'])
    .filter((filePath) => filePath.includes('/src/main/java/'));
  const byFqn = new Map();
  const simpleNameIndex = new Map();

  const addEntry = (entry) => {
    byFqn.set(entry.fqn, entry);
    if (!simpleNameIndex.has(entry.simpleName)) simpleNameIndex.set(entry.simpleName, []);
    simpleNameIndex.get(entry.simpleName).push(entry.fqn);
  };

  for (const filePath of files) {
    const content = readFile(filePath);
    const packageName = extractPackageName(content);
    const classMatch = content.match(/\b(?:class|record|enum|interface)\s+(\w+)/);
    if (!packageName || !classMatch) continue;

    const file = relativePath(filePath);
    const moduleInfo = classifyBackendModule(file);
    const simpleName = classMatch[1];
    const fqn = `${packageName}.${simpleName}`;
    addEntry({
      fqn,
      simpleName,
      packageName,
      file,
      moduleStatus: moduleInfo.moduleStatus,
      content,
      imports: extractImports(content),
      kind: content.match(new RegExp(`\\benum\\s+${simpleName}\\b`))
        ? 'enum'
        : content.match(new RegExp(`\\brecord\\s+${simpleName}\\b`))
          ? 'record'
          : 'class',
    });

    for (const recordMatch of content.matchAll(/\b(?:public|private|protected)?\s*(?:static\s+)?record\s+(\w+)\s*\(([\s\S]*?)\)\s*\{/g)) {
      const nestedName = recordMatch[1];
      if (nestedName === simpleName) continue;
      addEntry({
        fqn: `${packageName}.${simpleName}.${nestedName}`,
        simpleName: nestedName,
        packageName,
        file,
        moduleStatus: moduleInfo.moduleStatus,
        content,
        imports: extractImports(content),
        kind: 'record',
        recordComponents: splitTopLevel(recordMatch[2])
          .map((component) => ({
            raw: component,
            ...parseParameter(component),
          }))
          .filter((component) => component.name && component.type),
      });
    }

    for (const nestedClassMatch of content.matchAll(/\b(?:public|private|protected)?\s*static\s+class\s+(\w+)\s*\{/g)) {
      const nestedName = nestedClassMatch[1];
      const openingBraceIndex = content.indexOf('{', nestedClassMatch.index);
      addEntry({
        fqn: `${packageName}.${simpleName}.${nestedName}`,
        simpleName: nestedName,
        packageName,
        file,
        moduleStatus: moduleInfo.moduleStatus,
        content: extractBalancedBlock(content, openingBraceIndex),
        imports: extractImports(content),
        kind: 'class',
      });
    }

    for (const nestedEnumMatch of content.matchAll(/\b(?:public|private|protected)?\s*(?:static\s+)?enum\s+(\w+)\s*\{/g)) {
      const nestedName = nestedEnumMatch[1];
      if (nestedName === simpleName) continue;
      const openingBraceIndex = content.indexOf('{', nestedEnumMatch.index);
      addEntry({
        fqn: `${packageName}.${simpleName}.${nestedName}`,
        simpleName: nestedName,
        packageName,
        file,
        moduleStatus: moduleInfo.moduleStatus,
        content: `enum ${nestedName} ${extractBalancedBlock(content, openingBraceIndex)}`,
        imports: extractImports(content),
        kind: 'enum',
      });
    }
  }

  return { byFqn, simpleNameIndex };
};

const typeCatalog = scanJavaTypes();

const resolveSimpleType = (typeName, imports, packageName) => {
  const cleanType = typeName.replace(/\[\]$/, '').replace(/\?.*$/, '').trim();
  if (!cleanType || simpleTypeSchemas[cleanType] || primitiveTypes.has(cleanType)) return cleanType;
  if (cleanType.includes('.')) {
    const [outerType, ...nestedParts] = cleanType.split('.');
    if (imports?.has(outerType)) {
      return [imports.get(outerType), ...nestedParts].join('.');
    }
    const samePackageNested = `${packageName}.${cleanType}`;
    if (typeCatalog.byFqn.has(samePackageNested)) return samePackageNested;
    if (typeCatalog.byFqn.has(cleanType)) return cleanType;
    return cleanType;
  }
  if (imports?.has(cleanType)) return imports.get(cleanType);
  const samePackage = `${packageName}.${cleanType}`;
  if (typeCatalog.byFqn.has(samePackage)) return samePackage;
  const indexed = typeCatalog.simpleNameIndex.get(cleanType) || [];
  if (indexed.length === 1) return indexed[0];
  return cleanType;
};

const parseGeneric = (javaType) => {
  const normalized = javaType.replace(/\s+/g, '');
  const match = normalized.match(/^([\w.]+)<([\s\S]+)>$/);
  if (!match) return null;
  return {
    outer: match[1],
    inner: splitTopLevel(match[2]).map((part) => part.trim()),
  };
};

const schemaForJavaType = (javaType, context = {}) => {
  const cleanType = javaType
    .replace(/\bfinal\b/g, '')
    .replace(/\s+/g, '')
    .replace(/\?extends/g, '')
    .replace(/\?super/g, '')
    .replace(/^\?$/, 'Object');

  if (!cleanType) return { type: 'object', 'x-java-type': javaType || 'unknown' };
  if (cleanType.endsWith('[]')) {
    return {
      type: 'array',
      items: schemaForJavaType(cleanType.slice(0, -2), context),
      'x-java-type': javaType,
    };
  }

  const generic = parseGeneric(cleanType);
  if (generic) {
    const outer = generic.outer.split('.').at(-1);
    if (outer === 'ResponseEntity') {
      return schemaForJavaType(generic.inner[0] || 'Object', context);
    }
    if (outer === 'ApiResponse') {
      return apiResponseSchemaFor(generic.inner[0] || 'Object', context, javaType);
    }
    if (['List', 'Set', 'Collection', 'Iterable'].includes(outer)) {
      return {
        type: 'array',
        items: schemaForJavaType(generic.inner[0] || 'Object', context),
        'x-java-type': javaType,
      };
    }
    if (outer === 'Map') {
      return {
        type: 'object',
        additionalProperties: schemaForJavaType(generic.inner[1] || 'Object', context),
        'x-java-type': javaType,
      };
    }
    return {
      type: 'object',
      'x-java-type': javaType,
      'x-generic-arguments': generic.inner,
    };
  }

  const simpleName = cleanType.split('.').at(-1);
  if (simpleTypeSchemas[cleanType]) return { ...simpleTypeSchemas[cleanType], 'x-java-type': javaType };
  if (simpleTypeSchemas[simpleName]) return { ...simpleTypeSchemas[simpleName], 'x-java-type': javaType };

  const resolved = resolveSimpleType(cleanType, context.imports, context.packageName);
  if (typeCatalog.byFqn.has(resolved)) {
    return { $ref: `#/components/schemas/${resolved}`, 'x-java-type': javaType };
  }

  return {
    type: 'object',
    'x-java-type': javaType,
    'x-contract-warning': 'Java type was not resolved to a scanned source class.',
  };
};

const apiResponseSchemaFor = (dataType, context, javaType) => ({
  type: 'object',
  required: ['success', 'message', 'timestamp'],
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: schemaForJavaType(dataType, context),
    timestamp: { type: 'string', format: 'date-time' },
  },
  'x-java-type': javaType || `ApiResponse<${dataType}>`,
});

const fieldSchemaFromAnnotations = (schema, annotations) => {
  const sizeMatch = annotations.match(/@Size\s*\(([\s\S]*?)\)/);
  if (sizeMatch) {
    const max = sizeMatch[1].match(/\bmax\s*=\s*(\d+)/)?.[1];
    const min = sizeMatch[1].match(/\bmin\s*=\s*(\d+)/)?.[1];
    if (max && schema.type === 'string') schema.maxLength = Number(max);
    if (min && schema.type === 'string') schema.minLength = Number(min);
  }
  if (/@Email\b/.test(annotations) && schema.type === 'string') schema.format = 'email';
  if (/@Positive\b/.test(annotations) && ['number', 'integer'].includes(schema.type)) schema.minimum = 1;
  if (/@PositiveOrZero\b/.test(annotations) && ['number', 'integer'].includes(schema.type)) schema.minimum = 0;
  if (/@Min\s*\(\s*(\d+)/.test(annotations) && ['number', 'integer'].includes(schema.type)) {
    schema.minimum = Number(annotations.match(/@Min\s*\(\s*(\d+)/)[1]);
  }
  if (/@Max\s*\(\s*(\d+)/.test(annotations) && ['number', 'integer'].includes(schema.type)) {
    schema.maximum = Number(annotations.match(/@Max\s*\(\s*(\d+)/)[1]);
  }
  return schema;
};

const schemaForJavaClass = (entry) => {
  if (entry.kind === 'enum') {
    const body = entry.content.match(/\benum\s+\w+\s*\{([\s\S]*?)\}/)?.[1] || '';
    const values = splitTopLevel(body.replace(/;[\s\S]*$/, ''))
      .map((value) => value.trim().split(/\s|\(/)[0])
      .filter((value) => /^[A-Z0-9_]+$/.test(value));
    return {
      type: 'string',
      enum: values,
      'x-java-type': entry.fqn,
      'x-source': entry.file,
    };
  }

  if (entry.kind === 'record') {
    const required = [];
    const properties = {};
    for (const component of entry.recordComponents || []) {
      const schema = fieldSchemaFromAnnotations(
        schemaForJavaType(component.type, { imports: entry.imports, packageName: entry.packageName }),
        component.raw,
      );
      properties[component.name] = schema;
      if (/@(?:[\w.]+\.)?(NotBlank|NotEmpty|NotNull)\b/.test(component.raw) || primitiveTypes.has(component.type)) {
        required.push(component.name);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length ? { required: required.sort() } : {}),
      'x-java-type': entry.fqn,
      'x-source': entry.file,
    };
  }

  const required = [];
  const properties = {};
  const lines = entry.content.split('\n');
  let annotations = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@')) {
      annotations += `${trimmed}\n`;
      continue;
    }

    const fieldMatch = trimmed.match(/^(?:private|protected|public)\s+(?!(?:static)\b)(?:(?:final|volatile|transient)\s+)*([\w<>, ?.]+(?:\[\])?)\s+(\w+)\s*(?:=.*)?;/);
    if (!fieldMatch) {
      if (trimmed && !trimmed.startsWith('//')) annotations = '';
      continue;
    }

    const [, fieldType, fieldName] = fieldMatch;
    const fieldSchema = fieldSchemaFromAnnotations(
      schemaForJavaType(fieldType, { imports: entry.imports, packageName: entry.packageName }),
      annotations,
    );
    properties[fieldName] = fieldSchema;
    if (
      /@(?:[\w.]+\.)?(NotBlank|NotEmpty|NotNull)\b/.test(annotations) ||
      primitiveTypes.has(fieldType.trim())
    ) {
      required.push(fieldName);
    }
    annotations = '';
  }

  return {
    type: 'object',
    properties,
    ...(required.length ? { required: required.sort() } : {}),
    'x-java-type': entry.fqn,
    'x-source': entry.file,
  };
};

const collectJavaTypeReferences = (javaType, context, references) => {
  const cleanType = javaType
    .replace(/\bfinal\b/g, '')
    .replace(/\s+/g, '')
    .replace(/\?extends/g, '')
    .replace(/\?super/g, '')
    .replace(/^\?$/, 'Object');
  if (!cleanType || simpleTypeSchemas[cleanType] || simpleTypeSchemas[cleanType.split('.').at(-1)] || primitiveTypes.has(cleanType)) {
    return;
  }
  if (cleanType.endsWith('[]')) {
    collectJavaTypeReferences(cleanType.slice(0, -2), context, references);
    return;
  }
  const generic = parseGeneric(cleanType);
  if (generic) {
    for (const inner of generic.inner) {
      collectJavaTypeReferences(inner, context, references);
    }
    const outer = generic.outer.split('.').at(-1);
    if (!['ResponseEntity', 'ApiResponse', 'List', 'Set', 'Collection', 'Iterable', 'Map'].includes(outer)) {
      collectJavaTypeReferences(generic.outer, context, references);
    }
    return;
  }

  const resolved = resolveSimpleType(cleanType, context.imports, context.packageName);
  if (typeCatalog.byFqn.has(resolved)) {
    references.add(resolved);
  }
};

const collectEntryReferences = (entry, references) => {
  const context = { imports: entry.imports, packageName: entry.packageName };
  if (entry.kind === 'record') {
    for (const component of entry.recordComponents || []) {
      collectJavaTypeReferences(component.type, context, references);
    }
    return;
  }

  const lines = entry.content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const fieldMatch = trimmed.match(/^(?:private|protected|public)\s+(?!(?:static)\b)(?:(?:final|volatile|transient)\s+)*([\w<>, ?.]+(?:\[\])?)\s+(\w+)\s*(?:=.*)?;/);
    if (fieldMatch) {
      collectJavaTypeReferences(fieldMatch[1], context, references);
    }
  }
};

const isPayloadSourceClass = (entry) => (
  /\/(?:entity|dto)\//.test(entry.file)
);

const collectComponentSchemaNames = (operations) => {
  const references = new Set();
  for (const operation of operations) {
    const context = { imports: operation.imports, packageName: operation.packageName };
    collectJavaTypeReferences(operation.returnType, context, references);
    for (const parameter of operation.parameters) {
      collectJavaTypeReferences(parameter.javaType, context, references);
    }
  }

  for (const entry of typeCatalog.byFqn.values()) {
    if (entry.moduleStatus === 'active' && isPayloadSourceClass(entry)) {
      references.add(entry.fqn);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const fqn of Array.from(references)) {
      const entry = typeCatalog.byFqn.get(fqn);
      if (!entry) continue;
      const before = references.size;
      collectEntryReferences(entry, references);
      if (references.size > before) changed = true;
    }
  }

  return references;
};

const parameterObjectFor = (parameter, context) => ({
  name: parameter.name,
  in: parameter.source,
  required: parameter.source === 'path' ? true : parameter.required,
  schema: schemaForJavaType(parameter.javaType, context),
  'x-java-name': parameter.javaName,
  'x-java-type': parameter.javaType,
});

const requestBodyFor = (operation) => {
  const context = { imports: operation.imports, packageName: operation.packageName };
  const bodyParameter = operation.parameters.find((parameter) => parameter.source === 'body');
  if (bodyParameter) {
    return {
      required: bodyParameter.required,
      content: {
        'application/json': {
          schema: schemaForJavaType(bodyParameter.javaType, context),
        },
      },
      'x-java-name': bodyParameter.javaName,
      'x-java-type': bodyParameter.javaType,
      ...(bodyParameter.valid ? { 'x-validation': '@Valid' } : {}),
    };
  }

  const multipartParameters = operation.parameters.filter((parameter) => parameter.source === 'multipart');
  if (multipartParameters.length === 0) return undefined;
  const required = multipartParameters.filter((parameter) => parameter.required).map((parameter) => parameter.name);
  return {
    required: required.length > 0,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          properties: Object.fromEntries(
            multipartParameters.map((parameter) => [
              parameter.name,
              schemaForJavaType(parameter.javaType, context),
            ]),
          ),
          ...(required.length ? { required } : {}),
        },
      },
    },
  };
};

const responseFor = (operation) => {
  const context = { imports: operation.imports, packageName: operation.packageName };
  const schema = schemaForJavaType(operation.returnType, context);
  const returnType = operation.returnType.replace(/\s+/g, '');
  const isBinary = /ResponseEntity<Resource>|Resource/.test(returnType);

  if (isBinary) {
    return {
      description: 'Successful binary response derived from controller return type.',
      content: {
        'application/octet-stream': {
          schema,
        },
      },
      'x-java-type': operation.returnType,
    };
  }

  return {
    description: 'Successful response derived from controller return type.',
    content: {
      'application/json': {
        schema,
      },
    },
    'x-java-type': operation.returnType,
  };
};

const openApiOperationFor = (operation) => {
  const context = { imports: operation.imports, packageName: operation.packageName };
  const queryHeaderPathParameters = operation.parameters
    .filter((parameter) => ['query', 'header', 'path'].includes(parameter.source))
    .map((parameter) => parameterObjectFor(parameter, context));
  const requestBody = requestBodyFor(operation);

  return {
    operationId: operation.operationId,
    summary: operation.summary,
    tags: [operation.modulePath.replace(/^services\//, '')],
    parameters: queryHeaderPathParameters,
    ...(requestBody ? { requestBody } : {}),
    responses: {
      200: responseFor(operation),
    },
    'x-source': {
      file: operation.file,
      line: operation.line,
      module: operation.modulePath,
      handler: operation.handler,
    },
    ...(operation.authorization ? { 'x-authorization': operation.authorization } : {}),
  };
};

const buildOpenApi = () => {
  const operations = extractOperations();
  const activeOperations = operations.filter((operation) => operation.moduleStatus === 'active');
  const nonActiveOperations = operations.filter((operation) => operation.moduleStatus !== 'active');
  const paths = {};

  for (const operation of activeOperations) {
    if (!paths[operation.path]) paths[operation.path] = {};
    paths[operation.path][operation.openApiMethod] = openApiOperationFor(operation);
  }

  const componentSchemaNames = collectComponentSchemaNames(activeOperations);
  const schemaEntries = Array.from(typeCatalog.byFqn.values())
    .filter((entry) => entry.moduleStatus === 'active' && /^com\.talentsphere\./.test(entry.fqn) && componentSchemaNames.has(entry.fqn))
    .sort((a, b) => a.fqn.localeCompare(b.fqn));
  const schemas = {};
  for (const entry of schemaEntries) {
    schemas[entry.fqn] = schemaForJavaClass(entry);
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'TalentSphere Source-Derived API Contract',
      version: packageJson.version || '0.0.0',
      description: 'Deterministic OpenAPI contract generated from active Spring controller source. Runtime service discovery and Springdoc output are not verified by this artifact.',
    },
    servers: [{ url: '/' }],
    paths,
    components: {
      schemas,
    },
    'x-talentsphere': {
      generatedBy: 'scripts/generate-openapi-contract.mjs',
      source: 'Static scan of services/* Spring controller, entity, DTO, and shared contract Java source.',
      activeBackendModules: Array.from(activeBackendModulePaths).sort(),
      activeOperationCount: activeOperations.length,
      nonActiveOperationCount: nonActiveOperations.length,
      nonActiveOperations: nonActiveOperations.map((operation) => ({
        moduleStatus: operation.moduleStatus,
        module: operation.modulePath,
        method: operation.method,
        path: operation.path,
        source: `${operation.file}:${operation.line}`,
      })),
      limitations: [
        'Does not execute Spring Boot or fetch /v3/api-docs.',
        'Does not prove runtime serialization, validation groups, service discovery, auth propagation, or database behavior.',
        'Dynamic routes and values built outside controller annotations require manual review.',
        'OpenAPI schemas are derived from Java field declarations and controller signatures, not from runtime Jackson metadata.',
      ],
    },
  };
};

const main = () => {
  const openApi = buildOpenApi();
  fs.writeFileSync(outputPath, `${JSON.stringify(openApi, null, 2)}\n`);
  console.log(`OpenAPI contract generated: ${relativePath(outputPath)}`);
  console.log(`Active operations: ${openApi['x-talentsphere'].activeOperationCount}`);
  console.log(`Schemas: ${Object.keys(openApi.components.schemas).length}`);
  console.log(`Non-active operations excluded: ${openApi['x-talentsphere'].nonActiveOperationCount}`);
};

main();
