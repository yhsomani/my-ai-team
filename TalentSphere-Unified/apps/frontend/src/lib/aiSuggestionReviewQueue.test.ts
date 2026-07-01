import { describe, expect, it } from 'vitest';
import {
  buildAISuggestionReviewQueue,
  classifyAISuggestionWorkflow,
} from './aiSuggestionReviewQueue';

describe('aiSuggestionReviewQueue', () => {
  it('classifies AI suggestions into explicit workflow handoffs', () => {
    expect(classifyAISuggestionWorkflow('Rewrite my resume bullets with stronger impact.')).toMatchObject({
      key: 'resume',
      path: '/resume',
      actionLabel: 'Review resume draft',
    });

    expect(classifyAISuggestionWorkflow('Suggest career paths based on my skills.')).toMatchObject({
      key: 'career_path',
      path: '/career-path',
    });

    expect(classifyAISuggestionWorkflow('Recommend courses and certifications to learn next.')).toMatchObject({
      key: 'learning',
      path: '/lms',
      actionLabel: 'Review learning plan',
    });

    expect(classifyAISuggestionWorkflow('Prepare for interviews for active job applications.')).toMatchObject({
      key: 'jobs',
      path: '/jobs',
    });

    expect(classifyAISuggestionWorkflow('Add this experience to my profile headline.')).toMatchObject({
      key: 'profile',
      path: '/profile',
      actionLabel: 'Review profile draft',
    });

    expect(classifyAISuggestionWorkflow('Review recruiter candidate scorecard gaps.')).toMatchObject({
      key: 'candidates',
      path: '/candidates',
    });
  });

  it('builds a draft-first AI suggestion approval queue', () => {
    const queue = buildAISuggestionReviewQueue([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome',
      },
      {
        id: 'saved-1',
        role: 'assistant',
        content: 'Suggest career paths based on my current skills.',
        createdAt: '2026-06-01T10:00:00.000Z',
        reviewStatus: 'saved',
      },
      {
        id: 'draft-older',
        role: 'assistant',
        content: 'Review my resume for measurable impact.',
        createdAt: '2026-06-01T11:00:00.000Z',
      },
      {
        id: 'draft-newer',
        role: 'assistant',
        content: 'Recommend courses to learn TypeScript.',
        createdAt: '2026-06-01T12:00:00.000Z',
        sourceLabel: 'Assistant',
      },
      {
        id: 'dismissed-1',
        role: 'assistant',
        content: 'General guidance.',
        reviewStatus: 'dismissed',
      },
    ]);

    expect(queue.totalCount).toBe(4);
    expect(queue.draftCount).toBe(2);
    expect(queue.savedCount).toBe(1);
    expect(queue.dismissedCount).toBe(1);
    expect(queue.summary).toBe('2 AI recommendations waiting for review');
    expect(queue.items.map(item => item.id)).toEqual(['draft-newer', 'draft-older', 'saved-1', 'dismissed-1']);
    expect(queue.draftItems.map(item => item.label)).toEqual(['Learning', 'Resume Builder']);
    expect(queue.items.find(item => item.id === 'draft-older')?.sourceLabel).toBe('Heuristic AI guidance');
  });

  it('deduplicates assistant messages and ignores user messages', () => {
    const queue = buildAISuggestionReviewQueue([
      {
        id: 'user-1',
        role: 'user',
        content: 'Can you review my resume?',
      },
      {
        id: 'suggestion-1',
        role: 'assistant',
        content: 'Review your resume bullets in the resume builder.',
      },
      {
        id: 'suggestion-1',
        role: 'assistant',
        content: 'Duplicate should be ignored.',
      },
      {
        id: 'empty',
        role: 'assistant',
        content: '   ',
      },
    ]);

    expect(queue.totalCount).toBe(1);
    expect(queue.draftCount).toBe(1);
    expect(queue.items[0]).toMatchObject({
      id: 'suggestion-1',
      key: 'resume',
      reviewStatus: 'draft',
    });
  });

  it('summarizes an empty or fully reviewed queue', () => {
    expect(buildAISuggestionReviewQueue([])).toMatchObject({
      totalCount: 0,
      draftCount: 0,
      summary: 'All AI recommendations reviewed',
    });

    expect(buildAISuggestionReviewQueue([
      {
        id: 'saved-1',
        role: 'assistant',
        content: 'Open jobs to compare applications.',
        reviewStatus: 'saved',
      },
    ])).toMatchObject({
      totalCount: 1,
      draftCount: 0,
      savedCount: 1,
      summary: 'All AI recommendations reviewed',
    });
  });
});
