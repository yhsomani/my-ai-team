import { describe, expect, it } from 'vitest';
import {
  buildApplicationAiDraftSuggestion,
  getApplicationAiDraftFormPatch,
  hasApplicationAiDraftFields,
} from './applicationAiDrafts';

describe('applicationAiDrafts', () => {
  it('extracts structured AI application draft fields', () => {
    const draft = buildApplicationAiDraftSuggestion(
      { resumeUrl: '', coverLetter: 'Existing note' },
      {
        recommendationId: 'application-ai-1',
        recommendationText: [
          'Suggested application draft:',
          'Resume URL: https://portfolio.example.dev/resume',
          'Cover Letter: Hello hiring team, I am excited to apply because my React and TypeScript experience maps to your marketplace role.',
        ].join('\n'),
      }
    );

    expect(hasApplicationAiDraftFields(draft)).toBe(true);
    expect(draft.summary).toBe('2 application fields ready for review');
    expect(draft.fields).toEqual([
      {
        field: 'resumeUrl',
        label: 'Resume or Profile URL',
        currentValue: '',
        proposedValue: 'https://portfolio.example.dev/resume',
      },
      {
        field: 'coverLetter',
        label: 'Cover Letter',
        currentValue: 'Existing note',
        proposedValue: 'Hello hiring team, I am excited to apply because my React and TypeScript experience maps to your marketplace role.',
      },
    ]);
    expect(getApplicationAiDraftFormPatch(draft)).toEqual({
      resumeUrl: 'https://portfolio.example.dev/resume',
      coverLetter: 'Hello hiring team, I am excited to apply because my React and TypeScript experience maps to your marketplace role.',
    });
  });

  it('skips unchanged values and generic application advice', () => {
    const unchanged = buildApplicationAiDraftSuggestion(
      { resumeUrl: 'https://example.test/resume', coverLetter: 'Hello' },
      {
        recommendationText: 'Resume URL: https://example.test/resume\nCover Letter: Hello',
      }
    );

    expect(hasApplicationAiDraftFields(unchanged)).toBe(false);
    expect(unchanged.summary).toBe('No structured application fields found');

    const generic = buildApplicationAiDraftSuggestion(
      { resumeUrl: '', coverLetter: '' },
      {
        recommendationText: 'Tailor your application to the role and include measurable impact.',
      }
    );

    expect(hasApplicationAiDraftFields(generic)).toBe(false);
  });

  it('extracts quoted inline cover-letter suggestions', () => {
    const draft = buildApplicationAiDraftSuggestion(
      { coverLetter: '' },
      {
        recommendationText: 'Use the application note "I am excited to discuss how my analytics work maps to this role."',
      }
    );

    expect(draft.fields).toEqual([
      {
        field: 'coverLetter',
        label: 'Cover Letter',
        currentValue: '',
        proposedValue: 'I am excited to discuss how my analytics work maps to this role.',
      },
    ]);
  });
});
