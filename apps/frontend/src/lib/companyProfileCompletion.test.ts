import { describe, expect, it } from 'vitest';
import { getCompanyProfileCompletion } from './companyProfileCompletion';

describe('getCompanyProfileCompletion', () => {
  it('reports all fields missing when no company exists', () => {
    expect(getCompanyProfileCompletion(null)).toEqual({
      completedFields: 0,
      totalFields: 6,
      percent: 0,
      missingFields: [
        'company name',
        'industry',
        'location',
        'website',
        'description',
        'employee count',
      ],
      isComplete: false,
    });
  });

  it('calculates completion for a partial recruiter company profile', () => {
    expect(getCompanyProfileCompletion({
      name: 'Acme Labs',
      industry: 'Software',
      location: 'New York',
      website: '',
      description: '  ',
      employeeCount: null,
    })).toEqual({
      completedFields: 3,
      totalFields: 6,
      percent: 50,
      missingFields: ['website', 'description', 'employee count'],
      isComplete: false,
    });
  });

  it('accepts numeric employee count strings when completing the profile', () => {
    expect(getCompanyProfileCompletion({
      name: 'Acme Labs',
      industry: 'Software',
      location: 'Remote',
      website: 'https://acme.test',
      description: 'Developer tools for teams.',
      employeeCount: '42',
    })).toMatchObject({
      completedFields: 6,
      percent: 100,
      missingFields: [],
      isComplete: true,
    });
  });
});
