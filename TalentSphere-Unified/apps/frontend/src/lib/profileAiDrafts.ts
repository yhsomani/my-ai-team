export type ProfileAiDraftFieldKey = 'headline' | 'location' | 'bio';

export interface ProfileAiDraftSource {
  recommendationId?: string;
  recommendationText: string;
  sourceLabel?: string;
  sourceDetail?: string;
  openedAt?: string;
}

export interface ProfileAiDraftField {
  field: ProfileAiDraftFieldKey;
  label: string;
  currentValue: string;
  proposedValue: string;
}

export interface ProfileAiDraftSuggestion extends ProfileAiDraftSource {
  fields: ProfileAiDraftField[];
  summary: string;
}

const fieldDefinitions: Array<{
  field: ProfileAiDraftFieldKey;
  label: string;
  aliases: string[];
  maxLength: number;
}> = [
  {
    field: 'headline',
    label: 'Headline',
    aliases: ['profile headline', 'professional headline', 'headline'],
    maxLength: 160,
  },
  {
    field: 'location',
    label: 'Location',
    aliases: ['profile location', 'location'],
    maxLength: 120,
  },
  {
    field: 'bio',
    label: 'Bio',
    aliases: ['profile bio', 'about section', 'about', 'bio', 'summary'],
    maxLength: 900,
  },
];

const emptyDraft: ProfileAiDraftSuggestion = {
  recommendationText: '',
  fields: [],
  summary: 'No structured profile fields found',
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compact = (value?: unknown) => (
  typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim()
    : ''
);

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
  if (lowerValue.includes('your headline') || lowerValue.includes('your location') || lowerValue.includes('your bio')) return '';
  if (normalized.length > maxLength) return '';

  return normalized;
};

const extractLabeledValue = (
  text: string,
  aliases: string[],
  maxLength: number
) => {
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

const getCurrentProfileValue = (
  profile: Record<string, unknown> | null | undefined,
  field: ProfileAiDraftFieldKey
) => compact(profile?.[field]);

export const buildProfileAiDraftSuggestion = (
  currentProfile: Record<string, unknown> | null | undefined,
  source: ProfileAiDraftSource
): ProfileAiDraftSuggestion => {
  const recommendationText = compact(source.recommendationText);
  if (!recommendationText) {
    return {
      ...emptyDraft,
      ...source,
      recommendationText: '',
    };
  }

  const fields = fieldDefinitions
    .map<ProfileAiDraftField | null>((definition) => {
      const proposedValue = extractLabeledValue(
        source.recommendationText,
        definition.aliases,
        definition.maxLength
      );
      const currentValue = getCurrentProfileValue(currentProfile, definition.field);

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
    .filter((field): field is ProfileAiDraftField => Boolean(field));

  return {
    ...source,
    recommendationText,
    fields,
    summary: fields.length === 0
      ? 'No structured profile fields found'
      : `${fields.length} profile field${fields.length === 1 ? '' : 's'} ready for review`,
  };
};

export const hasProfileAiDraftFields = (draft: ProfileAiDraftSuggestion | null | undefined) => (
  Boolean(draft?.fields.length)
);

export const getProfileAiDraftFormPatch = (draft: ProfileAiDraftSuggestion) => (
  draft.fields.reduce<Partial<Record<ProfileAiDraftFieldKey, string>>>((patch, field) => {
    patch[field.field] = field.proposedValue;
    return patch;
  }, {})
);
