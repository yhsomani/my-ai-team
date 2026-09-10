export type RegistrationAccountType = 'TALENT' | 'RECRUITER';

export interface RegistrationNextStep {
  title: string;
  description: string;
  path: string;
}

export const getRegistrationAccountTypeFromRoleParam = (role?: string | null): RegistrationAccountType => (
  role?.toLowerCase() === 'recruiter' ? 'RECRUITER' : 'TALENT'
);

export const getRegistrationRole = (accountType: RegistrationAccountType) => (
  accountType === 'RECRUITER' ? 'ROLE_RECRUITER' : 'ROLE_USER'
);

export const getPostRegistrationPath = (accountType: RegistrationAccountType) => (
  accountType === 'RECRUITER' ? '/jobs/post?companySetup=1' : '/dashboard'
);

export const getRegistrationNextStep = (accountType: RegistrationAccountType): RegistrationNextStep => (
  accountType === 'RECRUITER'
    ? {
      title: 'Next: company setup',
      description: 'Create reusable company context before drafting the first role. No job is published automatically.',
      path: getPostRegistrationPath(accountType),
    }
    : {
      title: 'Next: dashboard checklist',
      description: 'Build your profile, save a job search, and apply when you are ready.',
      path: getPostRegistrationPath(accountType),
    }
);
