export interface LearningAiDraftSource {
  recommendationId?: string;
  recommendationText: string;
  sourceLabel?: string;
  sourceDetail?: string;
  openedAt?: string;
}

export interface LearningAiDraftSearchSuggestion {
  label: string;
  searchTerm: string;
  reason?: string;
}

export interface LearningAiDraftSuggestion extends LearningAiDraftSource {
  suggestions: LearningAiDraftSearchSuggestion[];
  summary: string;
}

const maxSuggestions = 5;
const maxSearchTermLength = 80;
const maxReasonLength = 180;

const fieldDefinitions = [
  {
    label: 'Course Search',
    aliases: ['course search', 'search term', 'search', 'catalog search'],
  },
  {
    label: 'Skill',
    aliases: ['skill to learn', 'skill', 'skills', 'topic', 'learning topic'],
  },
  {
    label: 'Course',
    aliases: ['recommended course', 'course', 'lesson'],
  },
  {
    label: 'Certification',
    aliases: ['certification', 'certificate'],
  },
  {
    label: 'Learning Goal',
    aliases: ['learning goal', 'goal'],
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

const stripMarkdown = (value: string) => (
  value
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*]\s*/, '')
    .trim()
);

const sanitizeSearchTerm = (value: string) => {
  const normalized = compact(stripWrappingQuotes(stripMarkdown(value)));
  const lowerValue = normalized.toLowerCase();

  if (!normalized || normalized.length < 2) return '';
  if (normalized.length > maxSearchTermLength) return '';
  if (['n/a', 'na', 'none', 'not provided', 'empty'].includes(lowerValue)) return '';
  if (
    lowerValue.includes('your skill') ||
    lowerValue.includes('skill to learn') ||
    lowerValue.includes('course title') ||
    lowerValue.includes('course search') ||
    lowerValue.includes('learning topic')
  ) {
    return '';
  }

  return normalized;
};

const sanitizeReason = (value?: string) => {
  const normalized = compact(stripMarkdown(value || ''));
  return normalized.length > maxReasonLength ? `${normalized.slice(0, maxReasonLength - 3).trimEnd()}...` : normalized;
};

const splitReason = (value: string) => {
  const reasonMatch = value.match(/\b(?:reason|why)\s*[:=-]\s*([\s\S]+)$/i);
  if (!reasonMatch?.[1]) {
    return {
      term: value,
      reason: '',
    };
  }

  return {
    term: value.slice(0, reasonMatch.index).trim(),
    reason: sanitizeReason(reasonMatch[1]),
  };
};

const findDefinitionForAlias = (alias: string) => (
  fieldDefinitions.find(definition => definition.aliases.includes(alias.toLowerCase()))
);

const allAliasesPattern = fieldDefinitions
  .flatMap(definition => definition.aliases)
  .sort((left, right) => right.length - left.length)
  .map(escapeRegExp)
  .join('|');

const labeledLinePattern = new RegExp(
  `^\\s*(?:[-*]\\s*)?(?:suggested\\s+|recommended\\s+|new\\s+)?(${allAliasesPattern})(?:\\s*(?:#|no\\.|number)?\\s*\\d+)?\\s*[:=-]\\s*(.+)$`,
  'i'
);

const extractLabeledSuggestions = (text: string): LearningAiDraftSearchSuggestion[] => {
  const suggestions: LearningAiDraftSearchSuggestion[] = [];

  text.split(/\r?\n|;/).forEach((line) => {
    const match = line.match(labeledLinePattern);
    if (!match?.[1] || !match[2]) return;

    const definition = findDefinitionForAlias(match[1]);
    if (!definition) return;

    const { term, reason } = splitReason(match[2]);
    const searchTerm = sanitizeSearchTerm(term);
    if (!searchTerm) return;

    suggestions.push({
      label: definition.label,
      searchTerm,
      ...(reason ? { reason } : {}),
    });
  });

  return suggestions;
};

const extractQuotedSuggestions = (text: string): LearningAiDraftSearchSuggestion[] => {
  const suggestions: LearningAiDraftSearchSuggestion[] = [];
  const aliases = fieldDefinitions.flatMap(definition => definition.aliases);

  aliases.forEach((alias) => {
    const quotedPattern = new RegExp(
      `${escapeRegExp(alias)}[^"'\\u201c\\u201d\\n]{0,100}["'\\u201c\\u201d]([^"'\\u201c\\u201d]{2,${maxSearchTermLength}})["'\\u201c\\u201d]`,
      'i'
    );
    const match = text.match(quotedPattern);
    if (!match?.[1]) return;

    const definition = findDefinitionForAlias(alias);
    const searchTerm = sanitizeSearchTerm(match[1]);
    if (!definition || !searchTerm) return;

    suggestions.push({
      label: definition.label,
      searchTerm,
    });
  });

  return suggestions;
};

const dedupeSuggestions = (
  suggestions: LearningAiDraftSearchSuggestion[],
  currentSearchTerm: string
) => {
  const seen = new Set<string>();
  const normalizedCurrentSearch = compact(currentSearchTerm).toLowerCase();

  return suggestions
    .filter((suggestion) => {
      const key = suggestion.searchTerm.toLowerCase();
      if (!key || key === normalizedCurrentSearch || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxSuggestions);
};

export const buildLearningAiDraftSuggestion = (
  currentSearchTerm: string | null | undefined,
  source: LearningAiDraftSource
): LearningAiDraftSuggestion => {
  const recommendationText = compact(source.recommendationText);
  if (!recommendationText) {
    return {
      ...source,
      recommendationText: '',
      suggestions: [],
      summary: 'No structured learning suggestions found',
    };
  }

  const suggestions = dedupeSuggestions([
    ...extractLabeledSuggestions(source.recommendationText),
    ...extractQuotedSuggestions(source.recommendationText),
  ], currentSearchTerm || '');

  return {
    ...source,
    recommendationText,
    suggestions,
    summary: suggestions.length === 0
      ? 'No structured learning suggestions found'
      : `${suggestions.length} learning search${suggestions.length === 1 ? '' : 'es'} ready for review`,
  };
};

export const hasLearningAiDraftSuggestions = (draft: LearningAiDraftSuggestion | null | undefined) => (
  Boolean(draft?.suggestions.length)
);
