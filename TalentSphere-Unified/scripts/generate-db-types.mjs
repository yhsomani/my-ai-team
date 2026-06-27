import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const migrationPath = path.join(repoRoot, 'infra', 'db', 'migrations', '0001_initial_baseline.sql');
const generatedPath = path.join(repoRoot, 'infra', 'db', 'generated', 'database.types.ts');

const SQL_KEYWORDS_THAT_END_TYPE = new Set([
  'PRIMARY',
  'NOT',
  'NULL',
  'DEFAULT',
  'REFERENCES',
  'UNIQUE',
  'CHECK',
  'COLLATE',
  'GENERATED',
  'CONSTRAINT',
]);

const splitTopLevel = (input) => {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const previous = input[index - 1];

    if ((char === "'" || char === '"') && previous !== '\\') {
      quote = quote === char ? null : quote || char;
    }

    if (!quote) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;

      if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
};

const extractCreateTableBlocks = (sql) => {
  const blocks = [];
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;
  let match;

  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const blockStart = tableRegex.lastIndex;
    let index = blockStart;
    let depth = 1;
    let quote = null;

    while (index < sql.length && depth > 0) {
      const char = sql[index];
      const previous = sql[index - 1];

      if ((char === "'" || char === '"') && previous !== '\\') {
        quote = quote === char ? null : quote || char;
      }

      if (!quote) {
        if (char === '(') depth += 1;
        if (char === ')') depth -= 1;
      }

      index += 1;
    }

    blocks.push({
      name: tableName,
      body: sql.slice(blockStart, index - 1),
    });
  }

  return blocks;
};

const parseColumnType = (definitionRemainder) => {
  const tokens = definitionRemainder.trim().split(/\s+/);
  const typeTokens = [];

  for (const token of tokens) {
    const normalized = token.replace(/[,(].*$/, '').toUpperCase();
    if (SQL_KEYWORDS_THAT_END_TYPE.has(normalized)) break;
    typeTokens.push(token);
  }

  return typeTokens.join(' ');
};

const parseEnums = (sql) => {
  const enums = new Map();
  const enumRegex = /CREATE\s+TYPE\s+([A-Za-z_][A-Za-z0-9_]*)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
  let match;

  while ((match = enumRegex.exec(sql)) !== null) {
    const values = Array.from(match[2].matchAll(/'([^']+)'/g), (valueMatch) => valueMatch[1]);
    enums.set(match[1], values);
  }

  return enums;
};

const normalizeIdentifier = (identifier) => identifier.trim().replace(/^"|"$/g, '');

const addUniqueColumnSet = (uniqueColumnSets, tableName, columns) => {
  if (!uniqueColumnSets.has(tableName)) {
    uniqueColumnSets.set(tableName, new Set());
  }

  uniqueColumnSets.get(tableName).add(columns.join(','));
};

const parseColumnList = (columnList) => splitTopLevel(columnList)
  .map((column) => normalizeIdentifier(column).replace(/\s+(ASC|DESC)\b[\s\S]*$/i, '').trim())
  .filter(Boolean);

const parseUniqueColumnSets = (sql, tableBlocks) => {
  const uniqueColumnSets = new Map();

  for (const block of tableBlocks) {
    for (const definition of splitTopLevel(block.body).map((item) => item.replace(/--.*$/gm, '').trim()).filter(Boolean)) {
      const columnMatch = definition.match(/^"?(?<name>[A-Za-z_][A-Za-z0-9_]*)"?\s+(?<rest>[\s\S]+)$/);
      if (columnMatch?.groups && /\bUNIQUE\b/i.test(columnMatch.groups.rest)) {
        addUniqueColumnSet(uniqueColumnSets, block.name, [columnMatch.groups.name]);
        continue;
      }

      const tableUniqueMatch = definition.match(/^UNIQUE\s*\((?<columns>[^)]+)\)/i);
      if (tableUniqueMatch?.groups) {
        addUniqueColumnSet(uniqueColumnSets, block.name, parseColumnList(tableUniqueMatch.groups.columns));
      }
    }
  }

  for (const match of sql.matchAll(/CREATE\s+UNIQUE\s+INDEX\s+[A-Za-z0-9_]+\s+ON\s+public\.([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)/gi)) {
    addUniqueColumnSet(uniqueColumnSets, match[1], parseColumnList(match[2]));
  }

  return uniqueColumnSets;
};

const parseColumnRelationship = (sourceTable, definition, uniqueColumnSets) => {
  const relationshipMatch = definition.match(
    /^"?(?<column>[A-Za-z_][A-Za-z0-9_]*)"?[\s\S]*?\bREFERENCES\s+public\.(?<referencedTable>[A-Za-z_][A-Za-z0-9_]*)\s*\((?<referencedColumns>[^)]+)\)/i
  );
  if (!relationshipMatch?.groups) return null;

  const columns = [relationshipMatch.groups.column];
  const referencedColumns = parseColumnList(relationshipMatch.groups.referencedColumns);

  return {
    foreignKeyName: `${sourceTable}_${columns.join('_')}_fkey`,
    columns,
    isOneToOne: uniqueColumnSets.get(sourceTable)?.has(columns.join(',')) || false,
    referencedRelation: relationshipMatch.groups.referencedTable,
    referencedColumns,
  };
};

const postgresTypeToTypescript = (postgresType, enums) => {
  const normalized = postgresType
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\([^)]*\)/g, '')
    .toUpperCase();

  if (normalized.endsWith('[]')) {
    const itemType = postgresTypeToTypescript(normalized.slice(0, -2), enums);
    return `${itemType}[]`;
  }

  const enumName = Array.from(enums.keys()).find((name) => name.toUpperCase() === normalized);
  if (enumName) {
    return `Database['public']['Enums']['${enumName}']`;
  }

  if (
    normalized.includes('CHAR') ||
    normalized === 'TEXT' ||
    normalized === 'UUID' ||
    normalized === 'DATE' ||
    normalized.startsWith('TIME') ||
    normalized === 'INET'
  ) {
    return 'string';
  }

  if (
    normalized === 'INTEGER' ||
    normalized === 'INT' ||
    normalized === 'BIGINT' ||
    normalized === 'SMALLINT' ||
    normalized === 'DECIMAL' ||
    normalized === 'NUMERIC' ||
    normalized === 'DOUBLE PRECISION' ||
    normalized === 'REAL'
  ) {
    return 'number';
  }

  if (normalized === 'BOOLEAN' || normalized === 'BOOL') {
    return 'boolean';
  }

  if (normalized === 'JSON' || normalized === 'JSONB') {
    return 'Json';
  }

  return 'Json';
};

const parseTables = (sql, enums) => {
  const tableBlocks = extractCreateTableBlocks(sql);
  const uniqueColumnSets = parseUniqueColumnSets(sql, tableBlocks);

  return tableBlocks.map((block) => {
    const definitions = splitTopLevel(block.body)
    .map((definition) => definition.replace(/--.*$/gm, '').trim())
    .filter(Boolean);
  const columns = definitions
    .filter((definition) => !/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|EXCLUDE)\b/i.test(definition))
    .map((definition) => {
      const columnMatch = definition.match(/^"?(?<name>[A-Za-z_][A-Za-z0-9_]*)"?\s+(?<rest>[\s\S]+)$/);
      if (!columnMatch?.groups) return null;

      const rest = columnMatch.groups.rest.trim();
      const postgresType = parseColumnType(rest);
      const hasDefault = /\bDEFAULT\b/i.test(rest);
      const required = /\bNOT\s+NULL\b/i.test(rest) || /\bPRIMARY\s+KEY\b/i.test(rest);

      return {
        name: columnMatch.groups.name,
        tsType: postgresTypeToTypescript(postgresType, enums),
        nullable: !required,
        optionalOnInsert: !required || hasDefault,
      };
    })
    .filter(Boolean);
  const relationships = definitions
    .map((definition) => parseColumnRelationship(block.name, definition, uniqueColumnSets))
    .filter(Boolean);

  return {
    name: block.name,
    columns,
    relationships,
  };
  });
};

const renderField = (column, mode) => {
  const optional = mode === 'update' || (mode === 'insert' && column.optionalOnInsert);
  const nullability = column.nullable ? ' | null' : '';
  return `          ${column.name}${optional ? '?' : ''}: ${column.tsType}${nullability}`;
};

const renderStringTuple = (values) => `[${values.map((value) => `"${value}"`).join(', ')}]`;

const renderRelationship = (relationship) => `          {
            foreignKeyName: "${relationship.foreignKeyName}"
            columns: ${renderStringTuple(relationship.columns)}
            isOneToOne: ${relationship.isOneToOne}
            referencedRelation: "${relationship.referencedRelation}"
            referencedColumns: ${renderStringTuple(relationship.referencedColumns)}
          }`;

const renderRelationships = (relationships) => {
  if (relationships.length === 0) return '[]';

  return `[
${relationships.map(renderRelationship).join(',\n')}
        ]`;
};

const renderTable = (table) => {
  const rowFields = table.columns.map((column) => renderField(column, 'row')).join('\n');
  const insertFields = table.columns.map((column) => renderField(column, 'insert')).join('\n');
  const updateFields = table.columns.map((column) => renderField(column, 'update')).join('\n');

  return `      ${table.name}: {
        Row: {
${rowFields}
        }
        Insert: {
${insertFields}
        }
        Update: {
${updateFields}
        }
        Relationships: ${renderRelationships(table.relationships)}
      }`;
};

const renderFunctions = (sql) => {
  if (!sql.includes('public.get_mutual_connection_counts')) {
    return '      [_ in never]: never';
  }

  return `      get_mutual_connection_counts: {
        Args: {
          p_current_user_id: string
          p_candidate_ids: string[]
        }
        Returns: {
          suggested_user_id: string
          mutual_count: number
        }[]
      }`;
};

const renderEnums = (enums) => {
  if (enums.size === 0) {
    return '      [_ in never]: never';
  }

  return Array.from(enums.entries())
    .map(([name, values]) => `      ${name}: ${values.map((value) => `'${value}'`).join(' | ')}`)
    .join('\n');
};

export const generateDatabaseTypes = (sql) => {
  const enums = parseEnums(sql);
  const tables = parseTables(sql, enums);
  const renderedTables = tables.map(renderTable).join('\n');

  return `// Generated by npm run report:db-types from infra/db/migrations/0001_initial_baseline.sql.
// Do not edit this file by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
${renderedTables}
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
${renderFunctions(sql)}
    }
    Enums: {
${renderEnums(enums)}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;
};

export const getDatabaseTypePaths = () => ({
  migrationPath,
  generatedPath,
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const generated = generateDatabaseTypes(sql);
  fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
  fs.writeFileSync(generatedPath, generated);
  console.log(`generated ${path.relative(repoRoot, generatedPath)} from ${path.relative(repoRoot, migrationPath)}`);
}
