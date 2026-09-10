import { describe, expect, it } from 'vitest';
import {
  buildAuditLogExportFilename,
  escapeCsvField,
  serializeRecordsToCsv,
} from './csvExport';

describe('csvExport', () => {
  it('serializes a header plus rows in RFC-4180 style', () => {
    const csv = serializeRecordsToCsv(
      ['id', 'action', 'actor'],
      [
        ['audit-1', 'user.role.promoted', 'admin-user'],
        ['audit-2', 'system.setting.updated', 'admin-user'],
      ],
    );

    expect(csv).toBe(
      [
        'id,action,actor',
        'audit-1,user.role.promoted,admin-user',
        'audit-2,system.setting.updated,admin-user',
      ].join('\n'),
    );
  });

  it('quotes fields containing commas, quotes, or line breaks and doubles embedded quotes', () => {
    const csv = serializeRecordsToCsv(
      ['id', 'context'],
      [
        ['audit-1', 'note, with comma'],
        ['audit-2', 'said "hello"'],
        ['audit-3', 'multi\nline'],
      ],
    );

    expect(csv).toBe(
      [
        'id,context',
        'audit-1,"note, with comma"',
        'audit-2,"said ""hello"""',
        'audit-3,"multi\nline"',
      ].join('\n'),
    );
  });

  it('escapes null and undefined fields to empty cells', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
    expect(escapeCsvField(0)).toBe('0');
    expect(escapeCsvField('  padded  ')).toBe('padded');
  });

  it('produces a header-only CSV when there are no rows', () => {
    expect(serializeRecordsToCsv(['id', 'action'], [])).toBe('id,action');
  });

  it('builds a filename with a stable, sortable timestamp', () => {
    const name = buildAuditLogExportFilename(new Date('2026-09-06T12:30:45.000Z'));
    expect(name).toBe('talentsphere-audit-log-2026-09-06-12-30-45.csv');
  });
});