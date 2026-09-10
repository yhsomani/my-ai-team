import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';
import type { RegistrationAccountType } from './registrationOnboarding';

export type OnboardingAnalyticsAction =
  | 'account_type_selected'
  | 'registration_submitted'
  | 'registration_completed'
  | 'registration_failed'
  | 'company_setup_opened'
  | 'company_setup_dashboard_clicked'
  | 'company_setup_role_draft_clicked'
  | 'company_setup_company_created'
  | 'company_setup_company_updated';

interface OnboardingAnalyticsInput {
  userId?: string | null;
  action: OnboardingAnalyticsAction;
  accountType?: RegistrationAccountType;
  nextStepPath?: string;
  entryPoint?: string;
  companyId?: string | null;
  errorCategory?: string;
}

const getEventName = (action: OnboardingAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'account_type_selected':
      return 'preference_updated';
    case 'registration_submitted':
    case 'company_setup_opened':
      return 'task_started';
    case 'registration_completed':
    case 'company_setup_company_created':
    case 'company_setup_company_updated':
      return 'task_completed';
    case 'registration_failed':
      return 'task_failed';
    case 'company_setup_dashboard_clicked':
      return 'task_abandoned';
    case 'company_setup_role_draft_clicked':
      return 'automation_handoff_opened';
    default:
      return 'task_started';
  }
};

const getArea = (action: OnboardingAnalyticsAction) => (
  action.startsWith('company_setup') ? 'jobs' : 'auth'
);

const getSource = (action: OnboardingAnalyticsAction) => (
  action.startsWith('company_setup')
    ? 'recruiter_company_setup_onboarding'
    : 'registration_onboarding'
);

const getObjectType = (action: OnboardingAnalyticsAction) => (
  action.startsWith('company_setup') ? 'onboarding_step' : 'registration'
);

const getObjectId = ({
  action,
  companyId,
}: Pick<OnboardingAnalyticsInput, 'action' | 'companyId'>) => {
  if (companyId) return companyId;
  if (action.startsWith('company_setup')) return 'company_setup';
  return 'account_type';
};

export const recordOnboardingAnalytics = ({
  userId,
  action,
  accountType,
  nextStepPath,
  entryPoint,
  companyId,
  errorCategory,
}: OnboardingAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: getArea(action),
    eventName: getEventName(action),
    source: getSource(action),
    objectType: getObjectType(action),
    objectId: getObjectId({ action, companyId }),
    metadata: {
      action,
      accountType,
      nextStepPath,
      entryPoint,
      companyId,
      errorCategory,
      userControl: 'explicit',
      mutationScope: action.startsWith('company_setup')
        ? 'company_setup_onboarding'
        : 'account_registration_onboarding',
    },
  });
};
