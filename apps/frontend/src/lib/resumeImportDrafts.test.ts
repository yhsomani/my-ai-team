import { describe, expect, it } from 'vitest';
import {
  extractTextFromDocx,
  extractTextFromPdf,
  getResumeImportFileType,
  getImportDraftEntries,
  getResumeImportEducationSuggestions,
  getResumeImportExperienceSuggestions,
  getResumeImportSkillSuggestions,
  isSupportedResumeImportFile,
  parseResumeImportDraft,
  readResumeImportFileText,
} from './resumeImportDrafts';
import { buildResumePdfBytes } from './resumePdfExport';

const writeUint16 = (bytes: number[], value: number) => {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
};

const writeUint32 = (bytes: number[], value: number) => {
  bytes.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
};

const appendBytes = (target: number[], value: Uint8Array) => {
  target.push(...Array.from(value));
};

const buildUncompressedZip = (fileName: string, content: string) => {
  const encoder = new TextEncoder();
  const fileNameBytes = encoder.encode(fileName);
  const contentBytes = encoder.encode(content);
  const bytes: number[] = [];

  const localHeaderOffset = bytes.length;
  writeUint32(bytes, 0x04034b50);
  writeUint16(bytes, 20);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint32(bytes, 0);
  writeUint32(bytes, contentBytes.length);
  writeUint32(bytes, contentBytes.length);
  writeUint16(bytes, fileNameBytes.length);
  writeUint16(bytes, 0);
  appendBytes(bytes, fileNameBytes);
  appendBytes(bytes, contentBytes);

  const centralDirectoryOffset = bytes.length;
  writeUint32(bytes, 0x02014b50);
  writeUint16(bytes, 20);
  writeUint16(bytes, 20);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint32(bytes, 0);
  writeUint32(bytes, contentBytes.length);
  writeUint32(bytes, contentBytes.length);
  writeUint16(bytes, fileNameBytes.length);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint32(bytes, 0);
  writeUint32(bytes, localHeaderOffset);
  appendBytes(bytes, fileNameBytes);

  const centralDirectorySize = bytes.length - centralDirectoryOffset;
  writeUint32(bytes, 0x06054b50);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, 1);
  writeUint16(bytes, 1);
  writeUint32(bytes, centralDirectorySize);
  writeUint32(bytes, centralDirectoryOffset);
  writeUint16(bytes, 0);

  return new Uint8Array(bytes).buffer;
};

const buildDocxBuffer = (paragraphs: string[]) => buildUncompressedZip(
  'word/document.xml',
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
      ${paragraphs.map(paragraph => `<w:p><w:r><w:t>${paragraph}</w:t></w:r></w:p>`).join('')}
    </w:body>
  </w:document>`
);

describe('resumeImportDrafts', () => {
  it('parses supported profile fields from resume text', () => {
    const draft = parseResumeImportDraft(`
Ada Lovelace
Senior Frontend Engineer
London, UK
ada@example.com | https://ada.dev | +44 20 1234 5678

Summary: Builds accessible product experiences.
Skills: React, TypeScript, Node.js
    `);

    expect(draft).toMatchObject({
      headline: 'Senior Frontend Engineer',
      location: 'London, UK',
      website: 'https://ada.dev',
      phone: '+44 20 1234 5678',
      summary: 'Builds accessible product experiences.',
    });
    expect(getImportDraftEntries(draft).map(entry => entry.key)).toEqual([
      'headline',
      'phone',
      'location',
      'website',
      'summary',
    ]);
  });

  it('extracts reviewed skill suggestions and removes existing skills', () => {
    const draft = parseResumeImportDraft(`
Skills
React, TypeScript, GraphQL, React, Docker

Experience
Built GraphQL platforms.
    `);

    expect(draft.skills).toEqual(['React', 'TypeScript', 'GraphQL', 'Docker']);
    expect(getResumeImportSkillSuggestions(draft, [{ name: 'React' }, 'Docker'])).toEqual([
      'TypeScript',
      'GraphQL',
    ]);
  });

  it('infers known skills from resume body when the skill section is missing', () => {
    const draft = parseResumeImportDraft(`
Jordan Smith
Data Analyst
I use Python, SQL, and machine learning to explain business performance.
    `);

    expect(draft.skills).toEqual(['Python', 'SQL', 'Machine Learning']);
  });

  it('extracts reviewed experience and education row suggestions', () => {
    const draft = parseResumeImportDraft(`
Ada Lovelace
Principal Engineer

Experience
Principal Engineer | Analytical Engines | Remote | Jan 2020 - Present
- Led accessible analytics platform delivery.
Product Engineer
Numbers Co
Feb 2018 - Dec 2019
Shipped reporting tools.

Education
University of London
B.S. Computer Science
2014 - 2018
    `);

    expect(draft.experiences).toEqual([
      {
        id: 'experience-principal-engineer-analytical-engines-2020-01-01-true',
        title: 'Principal Engineer',
        company: 'Analytical Engines',
        location: 'Remote',
        startDate: '2020-01-01',
        endDate: undefined,
        current: true,
        description: 'Led accessible analytics platform delivery.',
      },
      {
        id: 'experience-product-engineer-numbers-co-2018-02-01-2019-12-01-false',
        title: 'Product Engineer',
        company: 'Numbers Co',
        location: undefined,
        startDate: '2018-02-01',
        endDate: '2019-12-01',
        current: false,
        description: 'Shipped reporting tools.',
      },
    ]);
    expect(draft.education).toEqual([
      {
        id: 'education-university-of-london-b-s-computer-science-2014-01-01-2018-12-01',
        institution: 'University of London',
        degree: 'B.S.',
        fieldOfStudy: 'Computer Science',
        startDate: '2014-01-01',
        endDate: '2018-12-01',
      },
    ]);
  });

  it('removes existing profile rows from import suggestions', () => {
    const draft = parseResumeImportDraft(`
Experience
Principal Engineer at Analytical Engines
Jan 2020 - Present

Education
University of London
B.S. Computer Science
2014 - 2018
    `);

    expect(getResumeImportExperienceSuggestions(draft, [{ title: 'Principal Engineer', company: 'Analytical Engines' }])).toEqual([]);
    expect(getResumeImportEducationSuggestions(draft, [{ institution: 'University of London', degree: 'B.S.', fieldOfStudy: 'Computer Science' }])).toEqual([]);
  });

  it('accepts plain text, markdown, and DOCX imports', () => {
    expect(isSupportedResumeImportFile({ name: 'resume.md', type: '' })).toBe(true);
    expect(isSupportedResumeImportFile({ name: 'resume.txt', type: 'text/plain' })).toBe(true);
    expect(isSupportedResumeImportFile({ name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe(true);
    expect(isSupportedResumeImportFile({ name: 'resume.pdf', type: 'application/pdf' })).toBe(true);
    expect(getResumeImportFileType({ name: 'resume.docx', type: '' })).toBe('docx');
    expect(getResumeImportFileType({ name: 'resume.pdf', type: '' })).toBe('pdf');
  });

  it('extracts readable text from DOCX document XML', async () => {
    const text = await extractTextFromDocx(buildDocxBuffer([
      'Ada Lovelace',
      'Principal Engineer',
      'Summary: Builds accessible platforms.',
      'Skills: React, TypeScript, Kubernetes',
    ]));

    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Summary: Builds accessible platforms.');
    expect(parseResumeImportDraft(text)).toMatchObject({
      headline: 'Principal Engineer',
      summary: 'Builds accessible platforms.',
      skills: ['React', 'TypeScript', 'Kubernetes'],
    });
  });

  it('reads DOCX files into import text', async () => {
    const file = new File([buildDocxBuffer([
      'Grace Hopper',
      'Engineering Leader',
      'Summary: Leads compiler teams.',
    ])], 'resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await expect(readResumeImportFileText(file)).resolves.toContain('Engineering Leader');
  });

  it('extracts readable text from local searchable PDFs', async () => {
    const pdf = buildResumePdfBytes({
      fullName: 'Ada Lovelace',
      headline: 'Principal Engineer',
      contactParts: ['London', 'ada@example.test'],
      summary: 'Builds accessible platforms.',
      experiences: [
        {
          title: 'Principal Engineer',
          subtitle: 'Analytical Engines',
          meta: 'Jan 2020 - Present',
          description: 'Builds TypeScript and React platforms.',
        },
      ],
      education: [
        {
          title: 'B.S. Computer Science',
          subtitle: 'University of London',
          meta: '2014 - 2018',
        },
      ],
      skills: ['React', 'TypeScript', 'Kubernetes'],
    });

    const text = await extractTextFromPdf(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer);

    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('SUMMARY');
    expect(text).toContain('Builds accessible platforms.');
    expect(parseResumeImportDraft(text)).toMatchObject({
      headline: 'Principal Engineer',
      summary: 'Builds accessible platforms.',
      skills: ['React', 'TypeScript', 'Kubernetes'],
    });
  });

  it('reads PDF files into import text', async () => {
    const pdf = buildResumePdfBytes({
      fullName: 'Grace Hopper',
      headline: 'Engineering Leader',
      summary: 'Leads compiler teams.',
    });
    const pdfBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    const file = new File([pdfBuffer], 'resume.pdf', { type: 'application/pdf' });

    await expect(readResumeImportFileText(file)).resolves.toContain('Engineering Leader');
  });

  it('rejects PDFs without readable text streams', async () => {
    const unreadablePdf = new TextEncoder().encode('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');

    await expect(extractTextFromPdf(unreadablePdf.buffer as ArrayBuffer))
      .rejects.toThrow('PDF file did not contain readable resume text.');
  });

  it('rejects DOCX files without a readable document body', async () => {
    await expect(extractTextFromDocx(buildUncompressedZip('word/styles.xml', '<xml />')))
      .rejects.toThrow('DOCX file does not include a readable document body.');
  });
});
