/**
 * Safe CSV serialization helpers for admin data exports (audit log CSV export).
 *
 * These helpers are pure (no DOM) so they are trivially unit-testable. They emit
 * RFC-4180-style quoting: fields containing a comma, double-quote, or line break
 * are wrapped in double quotes with embedded quotes doubled. Raw JSON value
 * payloads (old/new values, user agents) are intentionally NOT serialized by the
 * audit-log map — exports carry only the safe, curated columns shown in the admin
 * console.
 */

const quoteCsvField = (value: string): string => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const escapeCsvField = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return quoteCsvField(String(value).trim());
};

export const serializeRecordsToCsv = (columns: string[], rows: Array<Array<unknown>>): string => {
  const header = columns.map(escapeCsvField).join(',');
  const body = rows.map((row) => row.map(escapeCsvField).join(','));
  return [header, ...body].join('\n');
};

export const buildAuditLogExportFilename = (date = new Date()): string => {
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `talentsphere-audit-log-${stamp}.csv`;
};