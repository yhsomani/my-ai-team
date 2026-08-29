export type ApplicationAiDraftFieldKey = 'resumeUrl' | 'coverLetter';

export interface ApplicationAiDraftSource {
  recommendationId?: string;
  recommendationText: string;
  sourceLabel?: string;
  sourceDetail?: string;
  openedAt?: string;
}

export interface ApplicationAiDraftField {
  field: ApplicationAiDraftFieldKey;
  label: string;
  currentValue: string;
  proposedValue: string;
}

export interface ApplicationAiDraftSuggestion extends ApplicationAiDraftSource {
  fields: ApplicationAiDraftField[];
  summary: string;
}

const fieldDefinitions: Array<{
  field: ApplicationAiDraftFieldKey;
  label: string;
  aliases: string[];
  maxLength: number;
}> = [
  {
    field: 'resumeUrl',
    label: 'Resume or Profile URL',
    aliases: ['resume url', 'resume link', 'profile url', 'profile link', 'portfolio url', 'portfolio link'],
    maxLength: 300,
  },
  {
    field: 'coverLetter',
    label: 'Cover Letter',
    aliases: ['cover letter', 'application note', 'application message', 'message to recruiter', 'recruiter note'],
    maxLength: 5000,
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
    lowerValue.includes('your resume url') ||
    lowerValue.includes('your profile url') ||
    lowerValue.includes('your cover letter') ||
    lowerValue.includes('your application note')
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
  draft: Partial<Record<ApplicationAiDraftFieldKey, unknown>> | null | undefined,
  field: ApplicationAiDraftFieldKey
) => compact(draft?.[field]);

export const buildApplicationAiDraftSuggestion = (
  currentApplicationDraft: Partial<Record<ApplicationAiDraftFieldKey, unknown>> | null | undefined,
  source: ApplicationAiDraftSource
): ApplicationAiDraftSuggestion => {
  const recommendationText = compact(source.recommendationText);
  if (!recommendationText) {
    return {
      ...source,
      recommendationText: '',
      fields: [],
      summary: 'No structured application fields found',
    };
  }

  const fields = fieldDefinitions
    .map<ApplicationAiDraftField | null>((definition) => {
      const proposedValue = extractLabeledValue(source.recommendationText, definition.aliases, definition.maxLength);
      const currentValue = getCurrentValue(currentApplicationDraft, definition.field);

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
    .filter((field): field is ApplicationAiDraftField => Boolean(field));

  return {
    ...source,
    recommendationText,
    fields,
    summary: fields.length === 0
      ? 'No structured application fields found'
      : `${fields.length} application field${fields.length === 1 ? '' : 's'} ready for review`,
  };
};

export const hasApplicationAiDraftFields = (draft: ApplicationAiDraftSuggestion | null | undefined) => (
  Boolean(draft?.fields.length)
);

export const getApplicationAiDraftFormPatch = (draft: ApplicationAiDraftSuggestion) => (
  draft.fields.reduce<Partial<Record<ApplicationAiDraftFieldKey, string>>>((patch, field) => {
    patch[field.field] = field.proposedValue;
    return patch;
  }, {})
);
