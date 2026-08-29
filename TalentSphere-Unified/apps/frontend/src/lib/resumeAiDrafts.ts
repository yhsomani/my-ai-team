export type ResumeAiDraftFieldKey = 'headline' | 'phone' | 'location' | 'website' | 'summary';

export interface ResumeAiDraftSource {
  recommendationId?: string;
  recommendationText: string;
  sourceLabel?: string;
  sourceDetail?: string;
  openedAt?: string;
}

export interface ResumeAiDraftField {
  field: ResumeAiDraftFieldKey;
  label: string;
  currentValue: string;
  proposedValue: string;
}

export interface ResumeAiDraftSuggestion extends ResumeAiDraftSource {
  fields: ResumeAiDraftField[];
  summary: string;
}

const fieldDefinitions: Array<{
  field: ResumeAiDraftFieldKey;
  label: string;
  aliases: string[];
  maxLength: number;
}> = [
  {
    field: 'headline',
    label: 'Headline',
    aliases: ['resume headline', 'professional headline', 'headline', 'title'],
    maxLength: 160,
  },
  {
    field: 'phone',
    label: 'Phone',
    aliases: ['phone', 'phone number', 'mobile'],
    maxLength: 40,
  },
  {
    field: 'location',
    label: 'Location',
    aliases: ['resume location', 'location'],
    maxLength: 120,
  },
  {
    field: 'website',
    label: 'Website',
    aliases: ['website', 'portfolio', 'linkedin', 'link'],
    maxLength: 160,
  },
  {
    field: 'summary',
    label: 'Summary',
    aliases: ['resume summary', 'professional summary', 'summary', 'profile'],
    maxLength: 1200,
  },
];

const compact = (value?: unknown) => (
  typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim()
    : ''
);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripWrappingQuotes = (value: string) => (
  value
    .replace(/^["'\u201c\u201d]+/, '')
    .replace(/["'\u201c\u201d]+$/, '')
    .trim()
);

const sanitizeDraftValue = (value: string, maxLength: number) => {
  const cleaned = stripWrappingQuotes(
    value
      .replace(/\*\*/g, '')
      .replace(/^\s*[-*]\s*/, '')
      .replace(/^suggest(?:ed|ion)?\s*[:=-]\s*/i, '')
      .trim()
  );
  const normalized = compact(cleaned);
  const lowerValue = normalized.toLowerCase();

  if (!normalized || normalized.length < 2) return '';
  if (['n/a', 'na', 'none', 'not provided', 'empty'].includes(lowerValue)) return '';
  if (
    lowerValue.includes('your headline') ||
    lowerValue.includes('your summary') ||
    lowerValue.includes('your phone') ||
    lowerValue.includes('your location') ||
    lowerValue.includes('your website')
  ) {
    return '';
  }
  if (normalized.length > maxLength) return '';

  return normalized;
};

const extractLabeledValue = (text: string, aliases: string[], maxLength: number) => {
  const labelPattern = aliases.map(escapeRegExp).join('|');
  const allLabelsPattern = fieldDefinitions
    .flatMap(definition => definition.aliases)
    .map(escapeRegExp)
    .join('|');
  const labeledPattern = new RegExp(
    `(?:^|[\\n;])\\s*(?:[-*]\\s*)?(?:suggested\\s+|new\\s+)?(?:${labelPattern})\\s*[:=-]\\s*([\\s\\S]*?)(?=(?:\\n\\s*(?:[-*]\\s*)?(?:suggested\\s+|new\\s+)?(?:${allLabelsPattern})\\s*[:=-])|(?:\\s+(?:${allLabelsPattern})\\s*[:=-])|$)`,
    'i'
  );
  const labeledMatch = text.match(labeledPattern);
  if (labeledMatch?.[1]) {
    const sanitized = sanitizeDraftValue(labeledMatch[1], maxLength);
    if (sanitized) return sanitized;
  }

  for (const alias of aliases) {
    const quotedPattern = new RegExp(`${escapeRegExp(alias)}[^"'\\u201c\\u201d\\n]{0,100}["'\\u201c\\u201d]([^"'\\u201c\\u201d]{2,${maxLength}})["'\\u201c\\u201d]`, 'i');
    const quotedMatch = text.match(quotedPattern);
    if (quotedMatch?.[1]) {
      const sanitized = sanitizeDraftValue(quotedMatch[1], maxLength);
      if (sanitized) return sanitized;
    }
  }

  return '';
};

const getCurrentValue = (
  resumeDraft: Partial<Record<ResumeAiDraftFieldKey, unknown>> | null | undefined,
  field: ResumeAiDraftFieldKey
) => compact(resumeDraft?.[field]);

export const buildResumeAiDraftSuggestion = (
  currentResumeDraft: Partial<Record<ResumeAiDraftFieldKey, unknown>> | null | undefined,
  source: ResumeAiDraftSource
): ResumeAiDraftSuggestion => {
  const recommendationText = compact(source.recommendationText);
  if (!recommendationText) {
    return {
      ...source,
      recommendationText: '',
      fields: [],
      summary: 'No structured resume fields found',
    };
  }

  const fields = fieldDefinitions
    .map<ResumeAiDraftField | null>((definition) => {
      const proposedValue = extractLabeledValue(source.recommendationText, definition.aliases, definition.maxLength);
      const currentValue = getCurrentValue(currentResumeDraft, definition.field);

      if (!proposedValue || proposedValue.toLowerCase() === currentValue.toLowerCase()) {
        return null;
      }

      return {
        field: definition.field,
        label: definition.label,
        currentValue,
        proposedValue,
      };
    })
    .filter((field): field is ResumeAiDraftField => Boolean(field));

  return {
    ...source,
    recommendationText,
    fields,
    summary: fields.length === 0
      ? 'No structured resume fields found'
      : `${fields.length} resume field${fields.length === 1 ? '' : 's'} ready for review`,
  };
};

export const hasResumeAiDraftFields = (draft: ResumeAiDraftSuggestion | null | undefined) => (
  Boolean(draft?.fields.length)
);

export const getResumeAiDraftFormPatch = (draft: ResumeAiDraftSuggestion) => (
  draft.fields.reduce<Partial<Record<ResumeAiDraftFieldKey, string>>>((patch, field) => {
    patch[field.field] = field.proposedValue;
    return patch;
  }, {})
);
