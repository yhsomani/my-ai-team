import { describe, expect, it } from 'vitest';
import {
  getPostRegistrationPath,
  getRegistrationAccountTypeFromRoleParam,
  getRegistrationNextStep,
  getRegistrationRole,
} from './registrationOnboarding';

describe('registrationOnboarding', () => {
  it('normalizes role query params into account types', () => {
    expect(getRegistrationAccountTypeFromRoleParam('recruiter')).toBe('RECRUITER');
    expect(getRegistrationAccountTypeFromRoleParam('RECRUITER')).toBe('RECRUITER');
    expect(getRegistrationAccountTypeFromRoleParam('talent')).toBe('TALENT');
    expect(getRegistrationAccountTypeFromRoleParam(null)).toBe('TALENT');
  });

  it('maps account types to auth roles', () => {
    expect(getRegistrationRole('RECRUITER')).toBe('ROLE_RECRUITER');
    expect(getRegistrationRole('TALENT')).toBe('ROLE_USER');
  });

  it('routes recruiters into company setup after registration', () => {
    expect(getPostRegistrationPath('RECRUITER')).toBe('/jobs/post?companySetup=1');
    expect(getRegistrationNextStep('RECRUITER')).toEqual({
      title: 'Next: company setup',
      description: 'Create reusable company context before drafting the first role. No job is published automatically.',
      path: '/jobs/post?companySetup=1',
    });
  });

  it('keeps talent registration on the dashboard checklist', () => {
    expect(getPostRegistrationPath('TALENT')).toBe('/dashboard');
    expect(getRegistrationNextStep('TALENT')).toEqual({
      title: 'Next: dashboard checklist',
      description: 'Build your profile, save a job search, and apply when you are ready.',
      path: '/dashboard',
    });
  });
});
