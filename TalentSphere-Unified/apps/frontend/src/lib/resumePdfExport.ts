export interface ResumePdfSectionItem {
  title: string;
  subtitle?: string;
  meta?: string;
  description?: string;
}

export interface ResumePdfDocumentData {
  fullName?: string;
  headline?: string;
  contactParts?: string[];
  summary?: string;
  experiences?: ResumePdfSectionItem[];
  education?: ResumePdfSectionItem[];
  skills?: string[];
}

interface PdfTextLine {
  text: string;
  size: number;
  gapAfter?: number;
}

const pageWidth = 595;
const pageHeight = 842;
const marginX = 54;
const marginTop = 58;
const marginBottom = 54;
const maxBodyChars = 92;

const compact = (value?: string | number | null) => String(value ?? '').trim();

const normalizePdfText = (value?: string | number | null) => compact(value)
  .replace(/[\r\t]+/g, ' ')
  .replace(/\s+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .replace(/[<>]/g, '')
  .replace(/[^\x20-\x7E\n]/g, '?');

const escapePdfString = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapText = (value: string, maxChars = maxBodyChars) => {
  const normalized = normalizePdfText(value);
  if (!normalized) return [];

  return normalized.split('\n').flatMap((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];

    const lines: string[] = [];
    let line = '';

    for (const word of words) {
      if (word.length > maxChars) {
        if (line) {
          lines.push(line);
          line = '';
        }
        for (let index = 0; index < word.length; index += maxChars) {
          lines.push(word.slice(index, index + maxChars));
        }
        continue;
      }

      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxChars) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line) lines.push(line);
    return lines;
  });
};

const pushWrapped = (
  lines: PdfTextLine[],
  text: string | undefined,
  size = 10,
  maxChars = maxBodyChars,
  gapAfter = 4
) => {
  for (const line of wrapText(text || '', maxChars)) {
    lines.push({ text: line, size, gapAfter });
  }
};

const pushSection = (lines: PdfTextLine[], title: string) => {
  lines.push({ text: title.toUpperCase(), size: 12, gapAfter: 8 });
};

const pushItems = (lines: PdfTextLine[], items: ResumePdfSectionItem[] = []) => {
  if (items.length === 0) {
    lines.push({ text: 'No entries added yet.', size: 10, gapAfter: 8 });
    return;
  }

  items.forEach((item, index) => {
    const heading = [normalizePdfText(item.title), normalizePdfText(item.meta)].filter(Boolean).join(' | ');
    pushWrapped(lines, heading || 'Entry', 11, 86, 3);
    pushWrapped(lines, item.subtitle, 10, maxBodyChars, 3);
    pushWrapped(lines, item.description, 9, maxBodyChars, 7);
    if (index < items.length - 1) {
      lines.push({ text: '', size: 5, gapAfter: 4 });
    }
  });
};

export const createResumePdfTextLines = (data: ResumePdfDocumentData): PdfTextLine[] => {
  const lines: PdfTextLine[] = [];
  const name = normalizePdfText(data.fullName) || 'Resume';
  const headline = normalizePdfText(data.headline) || 'Professional';
  const contact = (data.contactParts || []).map(normalizePdfText).filter(Boolean).join(' | ');

  lines.push({ text: name, size: 18, gapAfter: 8 });
  lines.push({ text: headline, size: 11, gapAfter: 5 });
  if (contact) lines.push({ text: contact, size: 9, gapAfter: 14 });

  pushSection(lines, 'Summary');
  pushWrapped(lines, data.summary || 'No summary provided.', 10, maxBodyChars, 10);

  pushSection(lines, 'Experience');
  pushItems(lines, data.experiences);

  pushSection(lines, 'Education');
  pushItems(lines, data.education);

  pushSection(lines, 'Skills');
  pushWrapped(lines, (data.skills || []).map(normalizePdfText).filter(Boolean).join(', ') || 'No skills added yet.', 10, maxBodyChars, 0);

  return lines;
};

const paginateLines = (lines: PdfTextLine[]) => {
  const pages: PdfTextLine[][] = [[]];
  let y = pageHeight - marginTop;

  for (const line of lines) {
    const lineHeight = line.size + (line.gapAfter ?? 4);
    if (y - lineHeight < marginBottom && pages[pages.length - 1].length > 0) {
      pages.push([]);
      y = pageHeight - marginTop;
    }
    pages[pages.length - 1].push(line);
    y -= lineHeight;
  }

  return pages;
};

const buildPageContent = (lines: PdfTextLine[]) => {
  let y = pageHeight - marginTop;

  return lines.map((line) => {
    const output = `BT /F1 ${line.size} Tf ${marginX} ${Math.round(y)} Td (${escapePdfString(line.text)}) Tj ET`;
    y -= line.size + (line.gapAfter ?? 4);
    return output;
  }).join('\n');
};

export const buildResumePdfBytes = (data: ResumePdfDocumentData): Uint8Array => {
  const pages = paginateLines(createResumePdfTextLines(data));
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const pageRefs: string[] = [];
  pages.forEach((pageLines, pageIndex) => {
    const pageObjectId = 4 + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;
    pageRefs.push(`${pageObjectId} 0 R`);

    objects[pageObjectId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    const content = buildPageContent(pageLines);
    objects[contentObjectId - 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pages.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
};

export const buildResumePdfBlob = (data: ResumePdfDocumentData) => {
  const bytes = buildResumePdfBytes(data);
  const buffer = new Uint8Array(bytes.byteLength);
  buffer.set(bytes);

  return new Blob([buffer.buffer as ArrayBuffer], { type: 'application/pdf' });
};
