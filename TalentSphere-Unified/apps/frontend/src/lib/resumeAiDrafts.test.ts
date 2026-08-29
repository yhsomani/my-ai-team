import { describe, expect, it } from 'vitest';
import {
  buildResumeAiDraftSuggestion,
  getResumeAiDraftFormPatch,
  hasResumeAiDraftFields,
} from './resumeAiDrafts';

describe('resumeAiDrafts', () => {
  it('extracts structured AI resume draft fields', () => {
    const draft = buildResumeAiDraftSuggestion(
      {
        headline: 'Software Engineer',
        phone: '',
        location: '',
        website: '',
        summary: '',
      },
      {
        recommendationId: 'resume-ai-1',
        recommendationText: [
          'Suggested resume updates:',
          'Headline: Senior Frontend Engineer for hiring platforms',
          'Phone: +1 555 0100',
          'Location: Remote, United States',
          'Website: https://portfolio.example.dev',
          'Summary: I build reliable React and TypeScript products for talent marketplaces with measurable conversion outcomes.',
        ].join('\n'),
      }
    );

    expect(hasResumeAiDraftFields(draft)).toBe(true);
    expect(draft.summary).toBe('5 resume fields ready for review');
    expect(draft.fields).toEqual([
      {
        field: 'headline',
        label: 'Headline',
        currentValue: 'Software Engineer',
        proposedValue: 'Senior Frontend Engineer for hiring platforms',
      },
      {
        field: 'phone',
        label: 'Phone',
        currentValue: '',
        proposedValue: '+1 555 0100',
      },
      {
        field: 'location',
        label: 'Location',
        currentValue: '',
        proposedValue: 'Remote, United States',
      },
      {
        field: 'website',
        label: 'Website',
        currentValue: '',
        proposedValue: 'https://portfolio.example.dev',
      },
      {
        field: 'summary',
        label: 'Summary',
        currentValue: '',
        proposedValue: 'I build reliable React and TypeScript products for talent marketplaces with measurable conversion outcomes.',
      },
    ]);
    expect(getResumeAiDraftFormPatch(draft)).toEqual({
      headline: 'Senior Frontend Engineer for hiring platforms',
      phone: '+1 555 0100',
      location: 'Remote, United States',
      website: 'https://portfolio.example.dev',
      summary: 'I build reliable React and TypeScript products for talent marketplaces with measurable conversion outcomes.',
    });
  });

  it('skips unchanged values and generic resume advice', () => {
    const unchanged = buildResumeAiDraftSuggestion(
      { headline: 'Data Analyst', location: 'Remote' },
      {
        recommendationText: 'Headline: Data Analyst\nLocation: Remote',
      }
    );

    expect(hasResumeAiDraftFields(unchanged)).toBe(false);
    expect(unchanged.summary).toBe('No structured resume fields found');

    const generic = buildResumeAiDraftSuggestion(
      { headline: '', summary: '' },
      {
        recommendationText: 'Make your resume more measurable and align your bullets to the target job.',
      }
    );

    expect(hasResumeAiDraftFields(generic)).toBe(false);
  });

  it('extracts quoted inline resume suggestions', () => {
    const draft = buildResumeAiDraftSuggestion(
      { headline: '', summary: '' },
      {
        recommendationText: 'Use the resume headline "Product Analyst for marketplace growth" before exporting.',
      }
    );

    expect(draft.fields).toEqual([
      {
        field: 'headline',
        label: 'Headline',
        currentValue: '',
        proposedValue: 'Product Analyst for marketplace growth',
      },
    ]);
  });
});
