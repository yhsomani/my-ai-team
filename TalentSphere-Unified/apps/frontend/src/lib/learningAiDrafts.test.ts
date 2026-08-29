import { describe, expect, it } from 'vitest';
import {
  buildLearningAiDraftSuggestion,
  hasLearningAiDraftSuggestions,
} from './learningAiDrafts';

describe('learningAiDrafts', () => {
  it('extracts structured learning search suggestions', () => {
    const draft = buildLearningAiDraftSuggestion('', {
      recommendationId: 'learning-ai-1',
      recommendationText: [
        'Learning plan:',
        'Course Search: React Query',
        'Skill: TypeScript generics Reason: Useful for safer frontend state.',
        'Certification: AWS Cloud Practitioner',
      ].join('\n'),
    });

    expect(hasLearningAiDraftSuggestions(draft)).toBe(true);
    expect(draft.summary).toBe('3 learning searches ready for review');
    expect(draft.suggestions).toEqual([
      {
        label: 'Course Search',
        searchTerm: 'React Query',
      },
      {
        label: 'Skill',
        searchTerm: 'TypeScript generics',
        reason: 'Useful for safer frontend state.',
      },
      {
        label: 'Certification',
        searchTerm: 'AWS Cloud Practitioner',
      },
    ]);
  });

  it('skips generic advice and the current search term', () => {
    const unchanged = buildLearningAiDraftSuggestion('React Query', {
      recommendationText: 'Course Search: React Query',
    });

    expect(hasLearningAiDraftSuggestions(unchanged)).toBe(false);
    expect(unchanged.summary).toBe('No structured learning suggestions found');

    const generic = buildLearningAiDraftSuggestion('', {
      recommendationText: 'Focus on high-impact skills and practice them with portfolio projects.',
    });

    expect(hasLearningAiDraftSuggestions(generic)).toBe(false);
  });

  it('deduplicates suggestions and limits the result list', () => {
    const draft = buildLearningAiDraftSuggestion('', {
      recommendationText: [
        'Skill: TypeScript',
        'Course Search: typescript',
        'Skill: React',
        'Skill: Testing',
        'Skill: Accessibility',
        'Skill: GraphQL',
        'Skill: Node.js',
      ].join('\n'),
    });

    expect(draft.suggestions.map(item => item.searchTerm)).toEqual([
      'TypeScript',
      'React',
      'Testing',
      'Accessibility',
      'GraphQL',
    ]);
  });

  it('extracts inline quoted learning searches', () => {
    const draft = buildLearningAiDraftSuggestion('', {
      recommendationText: 'Search the course catalog for "Design Systems" before choosing your next lesson.',
    });

    expect(draft.suggestions).toEqual([
      {
        label: 'Course Search',
        searchTerm: 'Design Systems',
      },
    ]);
  });
});
