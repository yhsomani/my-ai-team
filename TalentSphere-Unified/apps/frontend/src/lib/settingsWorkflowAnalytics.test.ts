import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordSettingsWorkflowAnalytics } from './settingsWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('settingsWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records settings tab selection as a task start', () => {
    recordSettingsWorkflowAnalytics({
      userId: 'user-1',
      action: 'settings_tab_selected',
      tabId: 'notifications',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'settings',
      eventName: 'task_started',
      source: 'settings_page',
      objectType: 'settings_tab',
      objectId: 'notifications',
      metadata: {
        action: 'settings_tab_selected',
        tabId: 'notifications',
        preferenceKey: undefined,
        enabled: undefined,
        digestFrequency: undefined,
        quietHoursEnabled: undefined,
        fieldCount: undefined,
        channelCount: undefined,
        hasBillingRecord: undefined,
        invoiceCount: undefined,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'settings_workflow',
      },
    });
  });

  it('records notification preference changes without exact quiet-hour times', () => {
    recordSettingsWorkflowAnalytics({
      action: 'notification_preference_changed',
      preferenceKey: 'quiet_hours_enabled',
      enabled: true,
      digestFrequency: 'daily',
      quietHoursEnabled: true,
      channelCount: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'preference_updated',
      objectType: 'notification_settings',
      objectId: 'quiet_hours_enabled',
      metadata: expect.objectContaining({
        action: 'notification_preference_changed',
        preferenceKey: 'quiet_hours_enabled',
        enabled: true,
        digestFrequency: 'daily',
        quietHoursEnabled: true,
        channelCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        quietHoursStart: expect.anything(),
        quietHoursEnd: expect.anything(),
      }),
    }));
  });

  it('records profile save success without profile field values', () => {
    recordSettingsWorkflowAnalytics({
      action: 'profile_settings_saved',
      fieldCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'profile_settings',
      metadata: expect.objectContaining({
        action: 'profile_settings_saved',
        fieldCount: 3,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        email: expect.anything(),
        firstName: expect.anything(),
        lastName: expect.anything(),
        headline: expect.anything(),
        location: expect.anything(),
      }),
    }));
  });

  it('records billing handoff as a non-mutating handoff event', () => {
    recordSettingsWorkflowAnalytics({
      action: 'billing_handoff_opened',
      hasBillingRecord: true,
      invoiceCount: 4,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'automation_handoff_opened',
      objectType: 'billing',
      metadata: expect.objectContaining({
        action: 'billing_handoff_opened',
        hasBillingRecord: true,
        invoiceCount: 4,
      }),
    }));
  });

  it('records security failures with error category only', () => {
    recordSettingsWorkflowAnalytics({
      action: 'password_reset_failed',
      errorCategory: 'network_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'security_password',
      metadata: expect.objectContaining({
        action: 'password_reset_failed',
        errorCategory: 'network_error',
      }),
    }));
  });

  it('records security review cancellations as abandoned without confirmation text', () => {
    recordSettingsWorkflowAnalytics({
      userId: 'user-1',
      action: 'password_reset_cancelled',
    });
    recordSettingsWorkflowAnalytics({
      userId: 'user-1',
      action: 'account_delete_cancelled',
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_abandoned',
      objectType: 'security_password',
      metadata: expect.objectContaining({
        action: 'password_reset_cancelled',
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_abandoned',
      objectType: 'security_account',
      metadata: expect.objectContaining({
        action: 'account_delete_cancelled',
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        email: expect.anything(),
        deleteConfirmation: expect.anything(),
        confirmationText: expect.anything(),
      }),
    }));
  });
});
