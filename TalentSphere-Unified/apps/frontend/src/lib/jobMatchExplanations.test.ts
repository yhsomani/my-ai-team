import { describe, expect, it } from 'vitest';
import { buildJobMatchExplanation } from './jobMatchExplanations';
import type { Job } from '../types/job';

const baseJob: Job = {
  id: 'job-1',
  title: 'Frontend Engineer',
  description: 'Build accessible product UI with React.',
  companyId: 'company-1',
  companyName: 'Acme Labs',
  location: 'Remote',
  jobType: 'FULL_TIME',
  requirements: ['React', 'TypeScript', 'Accessibility'],
  postedAt: '2026-06-01T00:00:00Z',
  status: 'PUBLISHED',
};

describe('buildJobMatchExplanation', () => {
  it('explains skill and remote-location matches from the user profile', () => {
    const explanation = buildJobMatchExplanation(baseJob, {
      location: 'San Francisco',
      skills: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'Node.js' }],
    });

    expect(explanation.label).toBe('Profile overlap');
    expect(explanation.matchedSkills).toEqual(['React', 'TypeScript']);
    expect(explanation.reasons).toEqual([
      '2 profile skills found: React, TypeScript',
      'Remote-friendly location',
      '3 listed requirements to review before applying',
    ]);
    expect(explanation.missingSignals).toEqual([]);
  });

  it('shows a strong overlap label when at least three profile skills match', () => {
    const explanation = buildJobMatchExplanation(baseJob, {
      location: 'Remote',
      skills: ['React', 'TypeScript', 'Accessibility', 'Python'],
    });

    expect(explanation.label).toBe('Strong profile overlap');
    expect(explanation.matchedSkills).toEqual(['React', 'TypeScript', 'Accessibility']);
  });

  it('surfaces missing profile signals without inventing a match', () => {
    const explanation = buildJobMatchExplanation(baseJob, null);

    expect(explanation.label).toBe('Review fit');
    expect(explanation.hasProfileSignals).toBe(false);
    expect(explanation.reasons).toEqual(['3 listed requirements to review before applying']);
    expect(explanation.missingSignals).toEqual([
      'Add skills to your profile for tailored match reasons',
      'Add profile location for location-aware reasons',
    ]);
  });

  it('does not match partial skill words inside unrelated terms', () => {
    const explanation = buildJobMatchExplanation({
      ...baseJob,
      description: 'Work on graph tooling.',
      requirements: ['GraphQL'],
    }, {
      location: 'Austin',
      skills: ['go'],
    });

    expect(explanation.matchedSkills).toEqual([]);
    expect(explanation.missingSignals).toContain('No profile skill overlap found in the visible requirements');
  });
});
