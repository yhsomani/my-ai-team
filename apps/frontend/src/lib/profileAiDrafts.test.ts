import { describe, expect, it } from 'vitest';
import {
  buildProfileAiDraftSuggestion,
  getProfileAiDraftFormPatch,
  hasProfileAiDraftFields,
} from './profileAiDrafts';

describe('profileAiDrafts', () => {
  it('extracts explicit profile fields from an AI recommendation', () => {
    const draft = buildProfileAiDraftSuggestion(
      { headline: 'Software Engineer', location: '', bio: '' },
      {
        recommendationId: 'ai-1',
        recommendationText: [
          'Suggested profile updates:',
          'Headline: "Senior Frontend Engineer focused on hiring platforms"',
          'Location: Remote, United States',
          'Bio: I build reliable hiring products with React, TypeScript, and measurable product outcomes.',
        ].join('\n'),
        sourceLabel: 'TalentSphere AI assistant',
      }
    );

    expect(hasProfileAiDraftFields(draft)).toBe(true);
    expect(draft.summary).toBe('3 profile fields ready for review');
    expect(draft.fields).toEqual([
      {
        field: 'headline',
        label: 'Headline',
        currentValue: 'Software Engineer',
        proposedValue: 'Senior Frontend Engineer focused on hiring platforms',
      },
      {
        field: 'location',
        label: 'Location',
        currentValue: '',
        proposedValue: 'Remote, United States',
      },
      {
        field: 'bio',
        label: 'Bio',
        currentValue: '',
        proposedValue: 'I build reliable hiring products with React, TypeScript, and measurable product outcomes.',
      },
    ]);
    expect(getProfileAiDraftFormPatch(draft)).toEqual({
      headline: 'Senior Frontend Engineer focused on hiring platforms',
      location: 'Remote, United States',
      bio: 'I build reliable hiring products with React, TypeScript, and measurable product outcomes.',
    });
  });

  it('skips unchanged values and generic non-structured advice', () => {
    const unchanged = buildProfileAiDraftSuggestion(
      { headline: 'Product Engineer', location: 'Remote', bio: '' },
      {
        recommendationText: 'Headline: Product Engineer\nLocation: Remote',
      }
    );

    expect(hasProfileAiDraftFields(unchanged)).toBe(false);
    expect(unchanged.summary).toBe('No structured profile fields found');

    const generic = buildProfileAiDraftSuggestion(
      { headline: '', location: '', bio: '' },
      {
        recommendationText: 'Improve your profile headline by making it more specific and measurable.',
      }
    );

    expect(hasProfileAiDraftFields(generic)).toBe(false);
  });

  it('extracts quoted inline field suggestions without saving them', () => {
    const draft = buildProfileAiDraftSuggestion(
      { headline: '', location: '', bio: '' },
      {
        recommendationText: 'For your profile headline, use "Data Analyst for marketplace operations" before applying.',
      }
    );

    expect(draft.fields).toEqual([
      {
        field: 'headline',
        label: 'Headline',
        currentValue: '',
        proposedValue: 'Data Analyst for marketplace operations',
      },
    ]);
  });
});
