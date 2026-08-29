export interface ResumeImportDraft {
  headline?: string;
  phone?: string;
  location?: string;
  website?: string;
  summary?: string;
  skills?: string[];
  experiences?: ResumeImportExperienceSuggestion[];
  education?: ResumeImportEducationSuggestion[];
}

export interface ResumeImportExperienceSuggestion {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface ResumeImportEducationSuggestion {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
}

export type ResumeImportField = 'headline' | 'phone' | 'location' | 'website' | 'summary';
export type ResumeImportFileType = 'text' | 'markdown' | 'docx' | 'pdf' | 'unsupported';

const RESUME_IMPORT_SECTION_HEADINGS = [
  'summary',
  'professional summary',
  'profile',
  'about',
  'experience',
  'work experience',
  'employment',
  'education',
  'skills',
  'technical skills',
  'core skills',
  'projects',
  'certifications',
  'languages'
];

const KNOWN_SKILL_ALIASES = [
  { name: 'React', aliases: ['react', 'react.js'] },
  { name: 'TypeScript', aliases: ['typescript'] },
  { name: 'JavaScript', aliases: ['javascript'] },
  { name: 'Node.js', aliases: ['node.js', 'nodejs'] },
  { name: 'Python', aliases: ['python'] },
  { name: 'Java', aliases: ['java'] },
  { name: 'Spring Boot', aliases: ['spring boot'] },
  { name: 'SQL', aliases: ['sql'] },
  { name: 'GraphQL', aliases: ['graphql'] },
  { name: 'AWS', aliases: ['aws'] },
  { name: 'Docker', aliases: ['docker'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'Machine Learning', aliases: ['machine learning'] },
  { name: 'Data Analysis', aliases: ['data analysis', 'analytics'] },
  { name: 'Product Strategy', aliases: ['product strategy'] },
];

const getResumeImportLines = (text: string) => text
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean);

const normalizeHeading = (line: string) => line.toLowerCase().replace(/[:|]/g, '').trim();
const isResumeImportHeading = (line: string) => RESUME_IMPORT_SECTION_HEADINGS.includes(normalizeHeading(line));
const hasPhoneLikeText = (line: string) => /\+?\d[\d\s().-]{7,}\d/.test(line);
const hasUrlLikeText = (line: string) => /(https?:\/\/[^\s]+|www\.[^\s]+|[\w.-]+\.(?:com|io|dev|net|org|co)(?:\/[^\s]*)?)/i.test(line);
const hasEmailLikeText = (line: string) => /\S+@\S+\.\S+/.test(line);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeListPrefix = (value: string) => value.replace(/^[-*•·]\s*/, '').trim();

const MONTH_LOOKUP: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  sept: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};
const MONTH_TOKEN = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE_TOKEN = `(?:${MONTH_TOKEN}\\.?\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4})`;
const DATE_RANGE_PATTERN = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(present|current|${DATE_TOKEN})`, 'i');

const cleanProfileRowValue = (value: string) => normalizeListPrefix(value)
  .replace(/\s+/g, ' ')
  .replace(/^[|,;:-]+|[|,;:-]+$/g, '')
  .trim();

const buildSuggestionId = (prefix: string, values: Array<string | boolean | undefined>) => {
  const slug = values
    .map(value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('-')
    .slice(0, 90);

  return `${prefix}-${slug || 'row'}`;
};

const parseResumeDateToken = (value: string, useEndMonth = false) => {
  const normalized = value.toLowerCase().replace(/\./g, '').trim();
  const numericMonthYear = normalized.match(/^(\d{1,2})\/(\d{4})$/);
  if (numericMonthYear) {
    const month = numericMonthYear[1].padStart(2, '0');
    return `${numericMonthYear[2]}-${month}-01`;
  }

  const monthYear = normalized.match(new RegExp(`^(${MONTH_TOKEN})\\s+(\\d{4})$`, 'i'));
  if (monthYear) {
    const month = MONTH_LOOKUP[monthYear[1].toLowerCase().replace(/\./g, '')];
    return month ? `${monthYear[2]}-${month}-01` : undefined;
  }

  const year = normalized.match(/^(\d{4})$/);
  if (year) return `${year[1]}-${useEndMonth ? '12' : '01'}-01`;

  return undefined;
};

const extractDateRange = (value: string) => {
  const match = value.match(DATE_RANGE_PATTERN);
  if (!match) return null;

  const startDate = parseResumeDateToken(match[1]);
  const current = /present|current/i.test(match[2]);
  const endDate = current ? undefined : parseResumeDateToken(match[2], true);
  if (!startDate || (!current && !endDate)) return null;

  return {
    label: match[0],
    startDate,
    endDate,
    current,
  };
};

const removeDateRange = (value: string) => cleanProfileRowValue(value.replace(DATE_RANGE_PATTERN, ''));

const extractWebsite = (text: string) => {
  const explicitUrl = text.match(/https?:\/\/[^\s|,]+|www\.[^\s|,]+/i)?.[0]?.trim();
  if (explicitUrl) return explicitUrl;

  return text
    .split(/[\s|,]+/)
    .map(token => token.trim())
    .find(token => token && !hasEmailLikeText(token) && hasUrlLikeText(token));
};

const getInlineSectionValue = (line: string, headings: string[]) => {
  const match = headings.find(heading => new RegExp(`^${escapeRegExp(heading)}\\s*[:|-]\\s+`, 'i').test(line));
  if (!match) return '';

  return line.replace(new RegExp(`^${escapeRegExp(match)}\\s*[:|-]\\s+`, 'i'), '').trim();
};

const getResumeImportSection = (lines: string[], headings: string[]) => {
  const startIndex = lines.findIndex(line =>
    headings.includes(normalizeHeading(line)) ||
    Boolean(getInlineSectionValue(line, headings))
  );
  if (startIndex === -1) return '';

  const sectionLines: string[] = [];
  const inlineValue = getInlineSectionValue(lines[startIndex], headings);
  if (inlineValue) sectionLines.push(inlineValue);

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (isResumeImportHeading(lines[index]) || getInlineSectionValue(lines[index], RESUME_IMPORT_SECTION_HEADINGS)) break;
    sectionLines.push(lines[index]);
  }

  return sectionLines.join(' ').trim();
};

const getResumeImportSectionLines = (lines: string[], headings: string[]) => {
  const startIndex = lines.findIndex(line =>
    headings.includes(normalizeHeading(line)) ||
    Boolean(getInlineSectionValue(line, headings))
  );
  if (startIndex === -1) return [];

  const sectionLines: string[] = [];
  const inlineValue = getInlineSectionValue(lines[startIndex], headings);
  if (inlineValue) sectionLines.push(inlineValue);

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (isResumeImportHeading(lines[index]) || getInlineSectionValue(lines[index], RESUME_IMPORT_SECTION_HEADINGS)) break;
    sectionLines.push(lines[index]);
  }

  return sectionLines;
};

const normalizeSkillName = (value: string) => value
  .replace(/^[-*•·]\s*/, '')
  .replace(/\([^)]*\)/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const isLikelySkill = (value: string) => {
  if (value.length < 2 || value.length > 40) return false;
  if (hasEmailLikeText(value) || hasPhoneLikeText(value) || hasUrlLikeText(value)) return false;
  if (/^\d{4}/.test(value)) return false;
  if (value.split(/\s+/).length > 4) return false;
  return true;
};

const dedupeSkills = (skills: string[]) => {
  const seen = new Set<string>();
  return skills.reduce<string[]>((acc, skill) => {
    const normalized = normalizeSkillName(skill);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key) || !isLikelySkill(normalized)) return acc;
    seen.add(key);
    acc.push(normalized);
    return acc;
  }, []);
};

const parseSkillsSection = (section: string) => dedupeSkills(
  section
    .split(/[,;|/]|(?:\s+[•·]\s+)|(?:\s+-\s+)/)
    .flatMap(part => part.split(/\s{2,}/))
);

const inferKnownSkills = (text: string) => {
  const lowerText = text.toLowerCase();
  return KNOWN_SKILL_ALIASES
    .filter(skill => skill.aliases.some(alias => new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`).test(lowerText)))
    .map(skill => skill.name);
};

const isUsableProfileRowValue = (value?: string) => {
  if (!value) return false;
  if (value.length < 2 || value.length > 120) return false;
  if (hasEmailLikeText(value) || hasPhoneLikeText(value) || hasUrlLikeText(value)) return false;
  if (/^\d{4}/.test(value)) return false;
  return true;
};

const looksLikeJobTitle = (value: string) => (
  /\b(engineer|developer|designer|analyst|manager|director|lead|architect|consultant|specialist|coordinator|administrator|intern|associate|officer|product|project|program|data|software|frontend|backend|full[-\s]?stack|marketing|sales|operations)\b/i.test(value)
);

const splitRowParts = (value: string) => cleanProfileRowValue(value)
  .split(/\s+\|\s+|\s+[–—-]\s+/)
  .map(cleanProfileRowValue)
  .filter(Boolean);

const parseExperienceHeader = (headerLines: string[]) => {
  const cleanedLines = headerLines.map(removeDateRange).map(cleanProfileRowValue).filter(Boolean);
  if (cleanedLines.length === 0) return null;

  const inlineHeader = cleanedLines.find(line => /\bat\b/i.test(line) || splitRowParts(line).length >= 2);
  if (inlineHeader) {
    const atMatch = inlineHeader.match(/^(.+?)\s+at\s+(.+)$/i);
    if (atMatch) {
      const companyParts = atMatch[2].split(/\s+\|\s+|,\s+/).map(cleanProfileRowValue).filter(Boolean);
      return {
        title: cleanProfileRowValue(atMatch[1]),
        company: companyParts[0],
        location: companyParts[1],
      };
    }

    const parts = splitRowParts(inlineHeader);
    return {
      title: parts[0],
      company: parts[1],
      location: parts[2],
    };
  }

  if (cleanedLines.length >= 2) {
    const [first, second, third] = cleanedLines;
    const firstIsTitle = looksLikeJobTitle(first);
    const secondIsTitle = looksLikeJobTitle(second);
    return {
      title: secondIsTitle && !firstIsTitle ? second : first,
      company: secondIsTitle && !firstIsTitle ? first : second,
      location: third,
    };
  }

  return null;
};

const parseExperienceSection = (sectionLines: string[]): ResumeImportExperienceSuggestion[] => {
  const lines = sectionLines.map(cleanProfileRowValue).filter(Boolean);
  const dateLineIndexes = lines.reduce<number[]>((acc, line, index) => {
    if (extractDateRange(line)) acc.push(index);
    return acc;
  }, []);
  const seen = new Set<string>();

  return dateLineIndexes.reduce<ResumeImportExperienceSuggestion[]>((acc, dateLineIndex, rangeIndex) => {
    const dateRange = extractDateRange(lines[dateLineIndex]);
    if (!dateRange) return acc;

    const currentLineHeader = removeDateRange(lines[dateLineIndex]);
    const headerStart = Math.max(0, dateLineIndex - 2);
    const headerLines = currentLineHeader
      ? [currentLineHeader]
      : lines.slice(headerStart, dateLineIndex).filter(line => !extractDateRange(line));
    const header = parseExperienceHeader(headerLines);
    if (!header || !isUsableProfileRowValue(header.title) || !isUsableProfileRowValue(header.company)) return acc;

    const nextDateLineIndex = dateLineIndexes[rangeIndex + 1];
    const nextHeaderStart = typeof nextDateLineIndex === 'number'
      ? Math.max(dateLineIndex + 1, nextDateLineIndex - 2)
      : lines.length;
    const description = lines
      .slice(dateLineIndex + 1, nextHeaderStart)
      .map(normalizeListPrefix)
      .filter(line => line && !extractDateRange(line))
      .join('\n')
      .slice(0, 1000);
    const key = `${header.title.toLowerCase()}|${header.company.toLowerCase()}`;
    if (seen.has(key)) return acc;
    seen.add(key);

    acc.push({
      id: buildSuggestionId('experience', [header.title, header.company, dateRange.startDate, dateRange.endDate, dateRange.current]),
      title: header.title,
      company: header.company,
      location: isUsableProfileRowValue(header.location) ? header.location : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      current: dateRange.current,
      description,
    });
    return acc;
  }, []).slice(0, 3);
};

const looksLikeInstitution = (value: string) => (
  /\b(university|college|school|institute|academy|polytechnic|bootcamp)\b/i.test(value)
);

const splitDegreeField = (value: string) => {
  const normalized = cleanProfileRowValue(value);
  const degreeMatch = normalized.match(/(B\.?S\.?|BSc|B\.?A\.?|Bachelor(?: of [A-Za-z ]+)?|M\.?S\.?|MSc|M\.?A\.?|Master(?: of [A-Za-z ]+)?|MBA|Ph\.?D\.?|Doctorate|Associate(?: of [A-Za-z ]+)?|Diploma|Certificate)(?=\s|$|,)/i);
  if (!degreeMatch) return { degree: normalized, fieldOfStudy: '' };

  const degree = cleanProfileRowValue(degreeMatch[0]);
  const fieldOfStudy = cleanProfileRowValue(
    normalized
      .replace(degreeMatch[0], '')
      .replace(/^[\s.,:;-]+/, '')
      .replace(/^in\s+/i, '')
  );

  return { degree, fieldOfStudy };
};

const parseEducationHeader = (headerLines: string[]) => {
  const cleanedLines = headerLines.map(removeDateRange).map(cleanProfileRowValue).filter(Boolean);
  const parts = cleanedLines.flatMap(line => splitRowParts(line));
  if (parts.length === 0) return null;

  const institution = parts.find(looksLikeInstitution) || parts[0];
  const degreeLine = parts.find(part => part !== institution) || '';
  const { degree, fieldOfStudy } = splitDegreeField(degreeLine);

  return {
    institution,
    degree,
    fieldOfStudy,
  };
};

const parseEducationSection = (sectionLines: string[]): ResumeImportEducationSuggestion[] => {
  const lines = sectionLines.map(cleanProfileRowValue).filter(Boolean);
  const dateLineIndexes = lines.reduce<number[]>((acc, line, index) => {
    if (extractDateRange(line)) acc.push(index);
    return acc;
  }, []);
  const seen = new Set<string>();

  return dateLineIndexes.reduce<ResumeImportEducationSuggestion[]>((acc, dateLineIndex) => {
    const dateRange = extractDateRange(lines[dateLineIndex]);
    if (!dateRange) return acc;

    const currentLineHeader = removeDateRange(lines[dateLineIndex]);
    const headerLines = currentLineHeader
      ? [currentLineHeader]
      : lines.slice(Math.max(0, dateLineIndex - 2), dateLineIndex).filter(line => !extractDateRange(line));
    const header = parseEducationHeader(headerLines);
    if (!header || !isUsableProfileRowValue(header.institution)) return acc;

    const key = `${header.institution.toLowerCase()}|${header.degree.toLowerCase()}|${header.fieldOfStudy.toLowerCase()}`;
    if (seen.has(key)) return acc;
    seen.add(key);

    acc.push({
      id: buildSuggestionId('education', [header.institution, header.degree, header.fieldOfStudy, dateRange.startDate, dateRange.endDate]),
      institution: header.institution,
      degree: header.degree,
      fieldOfStudy: header.fieldOfStudy,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
    return acc;
  }, []).slice(0, 3);
};

export const parseResumeImportDraft = (text: string): ResumeImportDraft => {
  const lines = getResumeImportLines(text);
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0]?.trim();
  const website = extractWebsite(text);
  const summary = getResumeImportSection(lines, ['summary', 'professional summary', 'profile', 'about']);
  const skillsSection = getResumeImportSection(lines, ['skills', 'technical skills', 'core skills']);
  const experienceSectionLines = getResumeImportSectionLines(lines, ['experience', 'work experience', 'employment']);
  const educationSectionLines = getResumeImportSectionLines(lines, ['education']);
  const headline = lines.find((line, index) =>
    index > 0 &&
    line.length <= 90 &&
    !isResumeImportHeading(line) &&
    !getInlineSectionValue(line, RESUME_IMPORT_SECTION_HEADINGS) &&
    !hasPhoneLikeText(line) &&
    !hasUrlLikeText(line) &&
    !hasEmailLikeText(line)
  );
  const location = lines.slice(0, 8).find(line =>
    line.includes(',') &&
    line.length <= 80 &&
    !hasPhoneLikeText(line) &&
    !hasUrlLikeText(line) &&
    !hasEmailLikeText(line)
  );

  return {
    headline,
    phone,
    location,
    website,
    summary,
    skills: dedupeSkills([
      ...parseSkillsSection(skillsSection),
      ...inferKnownSkills(skillsSection || text),
    ]).slice(0, 12),
    experiences: parseExperienceSection(experienceSectionLines),
    education: parseEducationSection(educationSectionLines),
  };
};

export const getImportDraftEntries = (draft: ResumeImportDraft) => [
  { key: 'headline' as const, label: 'Headline', value: draft.headline },
  { key: 'phone' as const, label: 'Phone', value: draft.phone },
  { key: 'location' as const, label: 'Location', value: draft.location },
  { key: 'website' as const, label: 'Website', value: draft.website },
  { key: 'summary' as const, label: 'Summary', value: draft.summary }
].filter(entry => Boolean(entry.value));

const getExistingSkillName = (skill: Record<string, any> | string) => (
  typeof skill === 'string' ? skill : skill.name || ''
);

export const getResumeImportSkillSuggestions = (
  draft: ResumeImportDraft,
  existingSkills: Array<Record<string, any> | string>
) => {
  const existingNames = new Set(existingSkills.map(skill => getExistingSkillName(skill).toLowerCase()).filter(Boolean));
  return dedupeSkills(draft.skills || []).filter(skill => !existingNames.has(skill.toLowerCase()));
};

export const getResumeImportExperienceSuggestions = (
  draft: ResumeImportDraft,
  existingExperiences: Array<Record<string, any>>
) => {
  const existingKeys = new Set(existingExperiences
    .map(experience => `${String(experience.title || '').toLowerCase()}|${String(experience.company || '').toLowerCase()}`)
    .filter(key => key !== '|'));

  return (draft.experiences || []).filter(experience =>
    !existingKeys.has(`${experience.title.toLowerCase()}|${experience.company.toLowerCase()}`)
  );
};

export const getResumeImportEducationSuggestions = (
  draft: ResumeImportDraft,
  existingEducation: Array<Record<string, any>>
) => {
  const existingKeys = new Set(existingEducation
    .map(education => {
      const fieldOfStudy = education.fieldOfStudy || education.field_of_study || '';
      return `${String(education.institution || '').toLowerCase()}|${String(education.degree || '').toLowerCase()}|${String(fieldOfStudy).toLowerCase()}`;
    })
    .filter(key => key !== '||'));

  return (draft.education || []).filter(education =>
    !existingKeys.has(`${education.institution.toLowerCase()}|${education.degree.toLowerCase()}|${education.fieldOfStudy.toLowerCase()}`)
  );
};

export const isSupportedResumeImportFile = (file: Pick<File, 'name' | 'type'>) => {
  return getResumeImportFileType(file) !== 'unsupported';
};

export const getResumeImportFileType = (file: Pick<File, 'name' | 'type'>): ResumeImportFileType => {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  if (fileName.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (fileName.endsWith('.md') || fileName.endsWith('.markdown') || mimeType.includes('markdown')) return 'markdown';
  if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) return 'text';
  return 'unsupported';
};

const readUint16 = (view: DataView, offset: number) => view.getUint16(offset, true);
const readUint32 = (view: DataView, offset: number) => view.getUint32(offset, true);

const findEndOfCentralDirectoryOffset = (bytes: Uint8Array) => {
  const minOffset = Math.max(0, bytes.length - 0xffff - 22);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }

  return -1;
};

const inflateRaw = async (data: Uint8Array) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Compressed DOCX import requires browser decompression support.');
  }

  const source = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const stream = new Blob([source]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const extractZipEntry = async (arrayBuffer: ArrayBuffer, entryName: string) => {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const eocdOffset = findEndOfCentralDirectoryOffset(bytes);
  if (eocdOffset < 0) throw new Error('DOCX file is missing ZIP directory data.');

  const centralDirectorySize = readUint32(view, eocdOffset + 12);
  const centralDirectoryOffset = readUint32(view, eocdOffset + 16);
  let offset = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  const decoder = new TextDecoder();

  while (offset < centralDirectoryEnd) {
    if (readUint32(view, offset) !== 0x02014b50) break;

    const compressionMethod = readUint16(view, offset + 10);
    const compressedSize = readUint32(view, offset + 20);
    const fileNameLength = readUint16(view, offset + 28);
    const extraLength = readUint16(view, offset + 30);
    const commentLength = readUint16(view, offset + 32);
    const localHeaderOffset = readUint32(view, offset + 42);
    const fileNameBytes = bytes.slice(offset + 46, offset + 46 + fileNameLength);
    const fileName = decoder.decode(fileNameBytes);

    if (fileName === entryName) {
      if (readUint32(view, localHeaderOffset) !== 0x04034b50) {
        throw new Error('DOCX file entry is invalid.');
      }

      const localFileNameLength = readUint16(view, localHeaderOffset + 26);
      const localExtraLength = readUint16(view, localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize);

      if (compressionMethod === 0) return compressedData;
      if (compressionMethod === 8) return inflateRaw(compressedData);
      throw new Error('DOCX file uses an unsupported compression method.');
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error('DOCX file does not include a readable document body.');
};

const decodeXmlEntities = (value: string) => value
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'");

export const extractTextFromDocx = async (arrayBuffer: ArrayBuffer) => {
  const documentXmlBytes = await extractZipEntry(arrayBuffer, 'word/document.xml');
  const xml = new TextDecoder().decode(documentXmlBytes);
  const text = decodeXmlEntities(
    xml
      .replace(/<w:tab\b[^>]*\/>/g, '\t')
      .replace(/<w:br\b[^>]*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  if (!text) {
    throw new Error('DOCX file did not contain readable resume text.');
  }

  return text;
};

const decodePdfBinary = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

const inflatePdfStream = async (data: Uint8Array) => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Compressed PDF import requires browser decompression support.');
  }

  const source = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const inflate = async (format: 'deflate' | 'deflate-raw') => {
    const stream = new Blob([source]).stream().pipeThrough(new DecompressionStream(format));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };

  try {
    return await inflate('deflate');
  } catch {
    return inflate('deflate-raw');
  }
};

const readPdfLiteralString = (source: string, startIndex: number) => {
  let index = startIndex + 1;
  let depth = 1;
  let value = '';

  while (index < source.length && depth > 0) {
    const char = source[index];

    if (char === '\\') {
      const next = source[index + 1];
      if (next === undefined) break;

      if (/[0-7]/.test(next)) {
        const octal = source.slice(index + 1, index + 4).match(/^[0-7]{1,3}/)?.[0] || next;
        value += String.fromCharCode(parseInt(octal, 8));
        index += 1 + octal.length;
        continue;
      }

      if (next === '\r' || next === '\n') {
        index += next === '\r' && source[index + 2] === '\n' ? 3 : 2;
        continue;
      }

      const escaped: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
        '(': '(',
        ')': ')',
        '\\': '\\',
      };
      value += escaped[next] ?? next;
      index += 2;
      continue;
    }

    if (char === '(') {
      depth += 1;
      value += char;
      index += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth > 0) value += char;
      index += 1;
      continue;
    }

    value += char;
    index += 1;
  }

  return { value, endIndex: index };
};

const readPdfHexString = (source: string, startIndex: number) => {
  const endIndex = source.indexOf('>', startIndex + 1);
  if (endIndex < 0) return { value: '', endIndex: startIndex + 1 };

  const hex = source.slice(startIndex + 1, endIndex).replace(/\s+/g, '');
  const normalizedHex = hex.length % 2 === 0 ? hex : `${hex}0`;
  const bytes: number[] = [];
  for (let index = 0; index < normalizedHex.length; index += 2) {
    const value = parseInt(normalizedHex.slice(index, index + 2), 16);
    if (Number.isFinite(value)) bytes.push(value);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let value = '';
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      value += String.fromCharCode((bytes[index] << 8) + bytes[index + 1]);
    }
    return { value, endIndex: endIndex + 1 };
  }

  return { value: new TextDecoder().decode(new Uint8Array(bytes)), endIndex: endIndex + 1 };
};

const extractPdfTextLinesFromContent = (content: string) => {
  const textObjects = Array.from(content.matchAll(/BT([\s\S]*?)ET/g), match => match[1]);
  const sources = textObjects.length > 0 ? textObjects : [content];
  const lines: string[] = [];

  sources.forEach((source) => {
    const fragments: string[] = [];
    let index = 0;

    while (index < source.length) {
      const char = source[index];

      if (char === '(') {
        const literal = readPdfLiteralString(source, index);
        if (literal.value.trim()) fragments.push(literal.value);
        index = literal.endIndex;
        continue;
      }

      if (char === '<' && source[index + 1] !== '<') {
        const hex = readPdfHexString(source, index);
        if (hex.value.trim()) fragments.push(hex.value);
        index = hex.endIndex;
        continue;
      }

      index += 1;
    }

    const line = fragments.join(' ').replace(/\s+/g, ' ').trim();
    if (line) lines.push(line);
  });

  return lines;
};

const extractPdfStreams = (arrayBuffer: ArrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  const pdf = decodePdfBinary(bytes);
  const streams: Array<{ dictionary: string; data: Uint8Array }> = [];
  let searchIndex = 0;

  while (searchIndex < pdf.length) {
    const streamIndex = pdf.indexOf('stream', searchIndex);
    if (streamIndex < 0) break;

    let dataStart = streamIndex + 'stream'.length;
    if (pdf[dataStart] === '\r' && pdf[dataStart + 1] === '\n') dataStart += 2;
    else if (pdf[dataStart] === '\n' || pdf[dataStart] === '\r') dataStart += 1;

    const endIndex = pdf.indexOf('endstream', dataStart);
    if (endIndex < 0) break;

    let dataEnd = endIndex;
    if (pdf[dataEnd - 2] === '\r' && pdf[dataEnd - 1] === '\n') dataEnd -= 2;
    else if (pdf[dataEnd - 1] === '\n' || pdf[dataEnd - 1] === '\r') dataEnd -= 1;

    const dictionaryStart = Math.max(0, pdf.lastIndexOf('<<', streamIndex));
    streams.push({
      dictionary: pdf.slice(dictionaryStart, streamIndex),
      data: bytes.slice(dataStart, dataEnd),
    });
    searchIndex = endIndex + 'endstream'.length;
  }

  return { pdf, streams };
};

const decodePdfStreamText = async (stream: { dictionary: string; data: Uint8Array }) => {
  if (/\/FlateDecode\b/.test(stream.dictionary)) {
    return decodePdfBinary(await inflatePdfStream(stream.data));
  }

  return decodePdfBinary(stream.data);
};

const replacePdfControlCharacters = (value: string) => Array.from(value)
  .map(char => (char.charCodeAt(0) < 32 ? ' ' : char))
  .join('');

export const extractTextFromPdf = async (arrayBuffer: ArrayBuffer) => {
  const { pdf, streams } = extractPdfStreams(arrayBuffer);
  if (!pdf.startsWith('%PDF-')) {
    throw new Error('PDF import requires a valid PDF file.');
  }

  const lines: string[] = [];
  for (const stream of streams) {
    try {
      lines.push(...extractPdfTextLinesFromContent(await decodePdfStreamText(stream)));
    } catch {
      // Ignore unreadable binary streams and keep looking for text-layer content.
    }
  }

  const text = lines
    .map(line => replacePdfControlCharacters(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  if (!text) {
    throw new Error('PDF file did not contain readable resume text.');
  }

  return text;
};

export const readResumeImportFileText = async (file: File) => {
  const fileType = getResumeImportFileType(file);
  if (fileType === 'docx') return extractTextFromDocx(await file.arrayBuffer());
  if (fileType === 'pdf') return extractTextFromPdf(await file.arrayBuffer());
  if (fileType === 'text' || fileType === 'markdown') return file.text();
  throw new Error('Unsupported resume file type.');
};
