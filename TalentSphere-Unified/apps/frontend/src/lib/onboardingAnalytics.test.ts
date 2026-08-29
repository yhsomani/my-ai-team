import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordOnboardingAnalytics } from './onboardingAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn().mockResolvedValue({
      event: { id: 'event-1' },
      persistedTo: 'server',
    }),
  },
}));

describe('onboardingAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records explicit registration account type selections', () => {
    recordOnboardingAnalytics({
      action: 'account_type_selected',
      accountType: 'RECRUITER',
      nextStepPath: '/jobs/post?companySetup=1',
      entryPoint: 'manual',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'auth',
      eventName: 'preference_updated',
      source: 'registration_onboarding',
      objectType: 'registration',
      objectId: 'account_type',
      metadata: expect.objectContaining({
        action: 'account_type_selected',
        accountType: 'RECRUITER',
        nextStepPath: '/jobs/post?companySetup=1',
        entryPoint: 'manual',
        userControl: 'explicit',
        mutationScope: 'account_registration_onboarding',
      }),
    }));
  });

  it('records successful registration completion without sensitive form fields', () => {
    recordOnboardingAnalytics({
      userId: 'user-1',
      action: 'registration_completed',
      accountType: 'TALENT',
      nextStepPath: '/dashboard',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      area: 'auth',
      eventName: 'task_completed',
      source: 'registration_onboarding',
      metadata: expect.objectContaining({
        action: 'registration_completed',
        accountType: 'TALENT',
        nextStepPath: '/dashboard',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        email: expect.anything(),
        password: expect.anything(),
      }),
    }));
  });

  it('records failed registration attempts with an error category', () => {
    recordOnboardingAnalytics({
      action: 'registration_failed',
      accountType: 'RECRUITER',
      nextStepPath: '/jobs/post?companySetup=1',
      errorCategory: 'AuthApiError',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'auth',
      eventName: 'task_failed',
      source: 'registration_onboarding',
      metadata: expect.objectContaining({
        action: 'registration_failed',
        errorCategory: 'AuthApiError',
      }),
    }));
  });

  it('records company setup onboarding entry separately from registration', () => {
    recordOnboardingAnalytics({
      userId: 'recruiter-1',
      action: 'company_setup_opened',
      accountType: 'RECRUITER',
      entryPoint: 'registration_or_dashboard_handoff',
      nextStepPath: '/jobs/post',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'recruiter-1',
      area: 'jobs',
      eventName: 'task_started',
      source: 'recruiter_company_setup_onboarding',
      objectType: 'onboarding_step',
      objectId: 'company_setup',
      metadata: expect.objectContaining({
        action: 'company_setup_opened',
        accountType: 'RECRUITER',
        userControl: 'explicit',
        mutationScope: 'company_setup_onboarding',
      }),
    }));
  });

  it('uses created or updated company ids as company setup object ids', () => {
    recordOnboardingAnalytics({
      userId: 'recruiter-1',
      action: 'company_setup_company_created',
      accountType: 'RECRUITER',
      companyId: 'company-1',
      entryPoint: 'company_setup_onboarding',
      nextStepPath: '/jobs/post',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'jobs',
      eventName: 'task_completed',
      source: 'recruiter_company_setup_onboarding',
      objectType: 'onboarding_step',
      objectId: 'company-1',
      metadata: expect.objectContaining({
        action: 'company_setup_company_created',
        companyId: 'company-1',
        entryPoint: 'company_setup_onboarding',
      }),
    }));
  });
});
