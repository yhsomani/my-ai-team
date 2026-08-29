import { describe, expect, it } from 'vitest';
import {
  applyJobPostTemplate,
  buildJobPostTemplateFromDraft,
  buildJobPostTemplateName,
  defaultJobPostDraft,
  getJobPostTemplateStorageKey,
  hasJobPostDraftContent,
  mergeJobPostTemplates,
  sanitizeJobPostTemplates,
  toJobPostRequirements,
} from './jobPostTemplates';

describe('jobPostTemplates', () => {
  it('builds recruiter-scoped template names and storage keys', () => {
    expect(getJobPostTemplateStorageKey('recruiter-1')).toBe('talentsphere.jobPostTemplates.recruiter-1');
    expect(buildJobPostTemplateName({
      ...defaultJobPostDraft,
      title: 'Frontend Engineer',
      location: 'Remote',
    })).toBe('Frontend Engineer - Remote');
  });

  it('creates reusable templates from reviewed job drafts', () => {
    const template = buildJobPostTemplateFromDraft({
      ...defaultJobPostDraft,
      title: 'Frontend Engineer',
      description: 'Build UI',
      location: 'Remote',
      requirements: '- React\n- TypeScript',
      jobType: 'CONTRACT',
    }, undefined, new Date('2026-06-04T09:00:00.000Z'));

    expect(template).toMatchObject({
      id: 'job-template-1780563600000',
      name: 'Frontend Engineer - Remote',
      persistedTo: 'local',
      title: 'Frontend Engineer',
      jobType: 'CONTRACT',
      createdAt: '2026-06-04T09:00:00.000Z',
    });
    expect(applyJobPostTemplate(template).requirements).toBe('- React\n- TypeScript');
  });

  it('sanitizes stored templates and deduplicates by id', () => {
    const templates = sanitizeJobPostTemplates([
      { id: 'template-1', title: 'Backend', requirements: 'Java', persistedTo: 'server', createdAt: '2026-06-04T09:00:00.000Z' },
      { id: 'template-1', title: 'Duplicate' },
      { title: 'Missing id' },
    ]);

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Backend');
    expect(templates[0].jobType).toBe('FULL_TIME');
    expect(templates[0].persistedTo).toBe('server');
  });

  it('merges synced templates ahead of local fallback copies', () => {
    const templates = mergeJobPostTemplates([
      {
        id: 'template-1',
        name: 'Synced backend',
        title: 'Backend',
        description: '',
        location: 'Remote',
        salaryMin: '',
        salaryMax: '',
        requirements: 'Java',
        jobType: 'FULL_TIME',
        salaryRange: '',
        category: '',
        recruiterId: 'recruiter-1',
        persistedTo: 'server',
        createdAt: '2026-06-05T09:00:00.000Z',
        updatedAt: '2026-06-05T09:00:00.000Z',
      },
    ], [
      {
        id: 'template-1',
        name: 'Local backend',
        title: 'Backend',
        description: '',
        location: 'Local',
        salaryMin: '',
        salaryMax: '',
        requirements: 'Java',
        jobType: 'FULL_TIME',
        salaryRange: '',
        category: '',
        persistedTo: 'local',
        createdAt: '2026-06-04T09:00:00.000Z',
        updatedAt: '2026-06-04T09:00:00.000Z',
      },
    ]);

    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({
      id: 'template-1',
      name: 'Synced backend',
      persistedTo: 'server',
    });
  });

  it('detects useful draft content and normalizes requirements', () => {
    expect(hasJobPostDraftContent(defaultJobPostDraft)).toBe(false);
    expect(hasJobPostDraftContent({ ...defaultJobPostDraft, description: 'Build APIs' })).toBe(true);
    expect(toJobPostRequirements('- React\n* TypeScript\n\n Node.js ')).toEqual(['React', 'TypeScript', 'Node.js']);
  });
});
