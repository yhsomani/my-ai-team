import { describe, expect, it } from 'vitest';
import {
  buildResumePdfBytes,
  createResumePdfTextLines,
} from './resumePdfExport';

const decodePdf = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe('resumePdfExport', () => {
  it('builds a native PDF document from reviewed resume data', () => {
    const pdf = decodePdf(buildResumePdfBytes({
      fullName: 'Ada Lovelace',
      headline: 'Computing Pioneer',
      contactParts: ['London', 'ada@example.test'],
      summary: 'Built analytical engine programs.',
      experiences: [
        {
          title: 'Mathematician',
          subtitle: 'Analytical Engine Lab',
          meta: '1842 - 1843',
          description: 'Translated and annotated the engine notes.',
        },
      ],
      education: [
        {
          title: 'Mathematics',
          subtitle: 'Private Tutoring',
          meta: '1832',
        },
      ],
      skills: ['Algorithms', 'Mathematics'],
    }));

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Type /Catalog');
    expect(pdf).toContain('/BaseFont /Helvetica');
    expect(pdf).toContain('(Ada Lovelace) Tj');
    expect(pdf).toContain('(Algorithms, Mathematics) Tj');
    expect(pdf).toContain('%%EOF');
  });

  it('escapes PDF string control characters and excludes HTML markup', () => {
    const pdf = decodePdf(buildResumePdfBytes({
      fullName: 'A(da) \\ Test',
      headline: '<script>alert(1)</script>',
      summary: 'Summary with (parentheses) and \\slashes\\.',
    }));

    expect(pdf).toContain('(A\\(da\\) \\\\ Test) Tj');
    expect(pdf).toContain('(scriptalert\\(1\\)/script) Tj');
    expect(pdf).toContain('(Summary with \\(parentheses\\) and \\\\slashes\\\\.) Tj');
    expect(pdf).not.toContain('<script>');
  });

  it('wraps long content into bounded PDF text lines', () => {
    const lines = createResumePdfTextLines({
      fullName: 'Resume',
      summary: 'A '.repeat(120),
    });

    expect(lines.some(line => line.text.length > 92)).toBe(false);
    expect(lines.filter(line => line.text.includes('A A A')).length).toBeGreaterThan(1);
  });
});
