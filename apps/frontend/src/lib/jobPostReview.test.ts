import { describe, expect, it } from 'vitest';
import { defaultJobPostDraft } from './jobPostTemplates';
import {
  buildJobPostCompanyContextSummary,
  buildJobPostDraftChangeSummary,
  buildJobPostDuplicateMatches,
  buildJobPostDraftMissingFields,
  buildJobPostReviewSummary,
  buildJobPostSalaryLabel,
  buildRecruiterPostingPublishIssues,
  canReviewJobPostDraft,
  canPublishRecruiterPosting,
} from './jobPostReview';

describe('jobPostReview', () => {
  it('builds a review summary from a complete job draft', () => {
    const summary = buildJobPostReviewSummary({
      ...defaultJobPostDraft,
      title: 'Senior Frontend Engineer',
      description: 'Own the web application experience.',
      location: 'Remote',
      jobType: 'FULL_TIME',
      salaryMin: '120000',
      salaryMax: '155000',
      requirements: '- React\n* TypeScript\n Product thinking ',
    });

    expect(summary).toMatchObject({
      title: 'Senior Frontend Engineer',
      location: 'Remote',
      jobTypeLabel: 'Full Time',
      salaryLabel: '$120,000 - $155,000',
      requirementCount: 3,
    });
    expect(summary.requirements).toEqual(['React', 'TypeScript', 'Product thinking']);
  });

  it('reports missing fields before a draft can be reviewed', () => {
    expect(canReviewJobPostDraft(defaultJobPostDraft)).toBe(false);
    expect(buildJobPostDraftMissingFields({
      ...defaultJobPostDraft,
      title: 'Backend Engineer',
      requirements: 'Java',
    })).toEqual(['job description', 'location']);
  });

  it('formats partial and unspecified salary ranges', () => {
    expect(buildJobPostSalaryLabel({ ...defaultJobPostDraft, salaryMin: '90000' })).toBe('$90,000+');
    expect(buildJobPostSalaryLabel({ ...defaultJobPostDraft, salaryMax: '130000' })).toBe('Up to $130,000');
    expect(buildJobPostSalaryLabel(defaultJobPostDraft)).toBe('Not specified');
  });

  it('truncates long descriptions for compact review', () => {
    const summary = buildJobPostReviewSummary({
      ...defaultJobPostDraft,
      description: 'A'.repeat(260),
    });

    expect(summary.descriptionPreview).toHaveLength(220);
    expect(summary.descriptionPreview.endsWith('...')).toBe(true);
  });

  it('detects active duplicate drafts by title, location, and job type', () => {
    const matches = buildJobPostDuplicateMatches({
      ...defaultJobPostDraft,
      title: ' Senior Frontend Engineer ',
      location: 'Remote',
      jobType: 'FULL_TIME',
    }, [
      { id: 'job-1', title: 'Senior Frontend Engineer', location: ' remote ', job_type: 'FULL_TIME', status: 'DRAFT' },
      { id: 'job-2', title: 'Senior Frontend Engineer', location: 'Remote', job_type: 'CONTRACT', status: 'DRAFT' },
    ]);

    expect(matches).toEqual([{
      id: 'job-1',
      title: 'Senior Frontend Engineer',
      location: 'remote',
      jobTypeLabel: 'Full Time',
      status: 'DRAFT',
    }]);
  });

  it('ignores inactive or meaningfully different jobs when checking duplicates', () => {
    const matches = buildJobPostDuplicateMatches({
      ...defaultJobPostDraft,
      title: 'Backend Engineer',
      location: 'New York',
      jobType: 'FULL_TIME',
    }, [
      { id: 'job-1', title: 'Backend Engineer', location: 'New York', jobType: 'FULL_TIME', status: 'CLOSED' },
      { id: 'job-2', title: 'Backend Engineer', location: 'Remote', jobType: 'FULL_TIME', status: 'PUBLISHED' },
      { id: 'job-3', title: 'Product Designer', location: 'New York', jobType: 'FULL_TIME', status: 'DRAFT' },
    ]);

    expect(matches).toEqual([]);
  });

  it('summarizes attached company context', () => {
    expect(buildJobPostCompanyContextSummary({
      id: 'company-1',
      name: 'Acme Labs',
      verified: true,
    }, true)).toEqual({
      label: 'Acme Labs',
      detail: 'Verified company profile will be attached to this draft.',
      isAttached: true,
    });
  });

  it('summarizes available but detached company context', () => {
    expect(buildJobPostCompanyContextSummary({
      id: 'company-1',
      name: 'Acme Labs',
      verified: false,
    }, false)).toEqual({
      label: 'No company attached',
      detail: 'Acme Labs is available but will not be attached to this draft.',
      isAttached: false,
    });
  });

  it('summarizes missing company context', () => {
    expect(buildJobPostCompanyContextSummary(null, true)).toEqual({
      label: 'No company attached',
      detail: 'No recruiter company profile is available for this draft.',
      isAttached: false,
    });
  });

  it('summarizes meaningful changes before updating a recruiter draft', () => {
    const changes = buildJobPostDraftChangeSummary({
      ...defaultJobPostDraft,
      title: 'Frontend Engineer',
      description: 'Build UI',
      location: 'Remote',
      salaryMin: '100000',
      requirements: 'React',
    }, {
      ...defaultJobPostDraft,
      title: 'Senior Frontend Engineer',
      description: 'Build product UI and mentor engineers',
      location: 'New York',
      salaryMin: '120000',
      salaryMax: '150000',
      requirements: '- React\n- TypeScript',
    }, {
      originalCompanyAttached: true,
      originalCompanyId: 'company-1',
      originalCompanyLabel: 'Acme Labs',
      nextCompanyAttached: true,
      nextCompanyId: 'company-2',
      nextCompanyLabel: 'Beta Labs',
    });

    expect(changes.map(change => change.label)).toEqual([
      'Title',
      'Description',
      'Location',
      'Salary range',
      'Requirements',
      'Company',
    ]);
    expect(changes.find(change => change.label === 'Requirements')).toMatchObject({
      before: '1 requirement',
      after: '2 requirements',
    });
  });

  it('ignores normalized no-op draft changes', () => {
    expect(buildJobPostDraftChangeSummary({
      ...defaultJobPostDraft,
      title: ' Frontend Engineer ',
      description: 'Build UI',
      location: 'Remote',
      requirements: '- React\n* TypeScript',
    }, {
      ...defaultJobPostDraft,
      title: 'Frontend Engineer',
      description: 'Build   UI',
      location: ' remote ',
      requirements: 'React\nTypeScript',
    }, {
      originalCompanyAttached: true,
      originalCompanyId: 'company-1',
      originalCompanyLabel: 'Acme Labs',
      nextCompanyAttached: true,
      nextCompanyId: 'company-1',
      nextCompanyLabel: 'Acme Incorporated',
    })).toEqual([]);
  });

  it('reports publish readiness issues for incomplete recruiter drafts', () => {
    expect(buildRecruiterPostingPublishIssues({
      title: 'Frontend Engineer',
      requirements: [],
    })).toEqual([
      'Add a job description',
      'Add a job location',
      'Attach company context',
      'Add at least one requirement',
    ]);
  });

  it('allows publish when recruiter posting essentials are present', () => {
    expect(canPublishRecruiterPosting({
      title: 'Frontend Engineer',
      description: 'Build product UI',
      location: 'Remote',
      company_id: 'company-1',
      requirements: ['React'],
    })).toBe(true);
  });

  it('accepts string requirements when checking recruiter publish readiness', () => {
    expect(canPublishRecruiterPosting({
      title: 'Backend Engineer',
      description: 'Build platform services',
      location: 'New York',
      companyName: 'Acme Labs',
      requirements: '- Java\n* Spring Boot',
    })).toBe(true);
  });
});
