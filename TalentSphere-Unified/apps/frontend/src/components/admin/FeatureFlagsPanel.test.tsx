import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminService, type SystemSetting } from '../../services/adminService';
import {
  FeatureFlagsPanel,
  FEATURE_FLAGS_KEY,
  FEATURE_FLAG_DESCRIPTIONS_KEY,
  getFlagCategory,
} from './FeatureFlagsPanel';

vi.mock('../../services/adminService', () => ({
  adminService: {
    getSystemSettings: vi.fn(),
    updateSystemSetting: vi.fn(),
  },
}));

const mockFeatureFlagsRow: SystemSetting = {
  key: FEATURE_FLAGS_KEY,
  value: {
    version: 1,
    defaults: {
      enable_auth: true,
      enable_user_management: true,
      enable_profile_management: true,
      enable_job_recommendations: false,
      enable_ai_interview_prep: false,
    },
    overrides: {
      enable_job_recommendations: true,
    },
  },
  description: 'Feature-flag governance store',
  updatedBy: 'admin-user',
  updatedAt: '2026-09-06T00:00:00.000Z',
};

const mockDescriptionsRow: SystemSetting = {
  key: FEATURE_FLAG_DESCRIPTIONS_KEY,
  value: {
    enable_auth: 'Authentication and authorization',
    enable_user_management: 'User account management',
    enable_profile_management: 'User profile CRUD operations',
    enable_job_recommendations: 'AI-powered job recommendations',
    enable_ai_interview_prep: 'AI interview preparation',
  },
  description: 'Human-readable descriptions',
  updatedBy: 'admin-user',
  updatedAt: '2026-09-06T00:00:00.000Z',
};

const expectSvgIconsDecorative = (container: ParentNode) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('FeatureFlagsPanel', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(adminService.getSystemSettings).mockResolvedValue([
      mockFeatureFlagsRow,
      mockDescriptionsRow,
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('resolves canonical flag categories correctly', () => {
    expect(getFlagCategory('enable_auth')).toBe('Core Platform');
    expect(getFlagCategory('enable_job_search')).toBe('Jobs & Companies');
    expect(getFlagCategory('enable_course_progress')).toBe('Learning');
    expect(getFlagCategory('enable_xp_system')).toBe('Challenges & Gamification');
    expect(getFlagCategory('enable_ai_resume_analysis')).toBe('AI Capabilities');
    expect(getFlagCategory('enable_notifications')).toBe('Notifications');
    expect(getFlagCategory('enable_messaging')).toBe('Messaging & Networking');
    expect(getFlagCategory('enable_global_search')).toBe('Search');
    expect(getFlagCategory('enable_payments')).toBe('Payments');
    expect(getFlagCategory('enable_video_content')).toBe('Video & Media');
    expect(getFlagCategory('enable_user_analytics')).toBe('Analytics');
    expect(getFlagCategory('enable_unknown_custom')).toBe('Other');
  });

  it('renders all canonical flag rows, descriptions, and override status', async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Feature Flag Governance' })).toBeTruthy();
    });

    expect(screen.getByText('5 flags · 1 overridden')).toBeTruthy();
    expect(screen.getByText('enable_auth')).toBeTruthy();
    expect(screen.getByText('Authentication and authorization')).toBeTruthy();
    expect(screen.getByText('enable_job_recommendations')).toBeTruthy();
    expect(screen.getByText('AI-powered job recommendations')).toBeTruthy();
    expectSvgIconsDecorative(document.body);
  });

  it('persists an override and emits analytics when toggling a flag away from default', async () => {
    const onRecordAdminAction = vi.fn();
    vi.mocked(adminService.updateSystemSetting).mockResolvedValue({
      ...mockFeatureFlagsRow,
      value: {
        version: 1,
        defaults: (mockFeatureFlagsRow.value as any).defaults,
        overrides: {
          enable_job_recommendations: true,
          enable_ai_interview_prep: true,
        },
      },
    });

    render(<FeatureFlagsPanel onRecordAdminAction={onRecordAdminAction} />);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Feature Flag Governance' })).toBeTruthy();
    });

    const toggle = screen.getByRole('switch', { name: 'Toggle enable_ai_interview_prep' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(adminService.updateSystemSetting).toHaveBeenCalledWith(
        FEATURE_FLAGS_KEY,
        expect.objectContaining({
          version: 1,
          overrides: {
            enable_job_recommendations: true,
            enable_ai_interview_prep: true,
          },
        }),
        expect.any(String),
      );
    });

    expect(onRecordAdminAction).toHaveBeenCalledWith('admin_feature_flag_override_set', {
      flagName: 'enable_ai_interview_prep',
      flagEnabled: true,
      settingKey: FEATURE_FLAGS_KEY,
      settingAction: 'override_set',
    });
  });

  it('removes the override when toggling back to default', async () => {
    const onRecordAdminAction = vi.fn();
    vi.mocked(adminService.updateSystemSetting).mockResolvedValue({
      ...mockFeatureFlagsRow,
      value: {
        version: 1,
        defaults: (mockFeatureFlagsRow.value as any).defaults,
        overrides: {},
      },
    });

    render(<FeatureFlagsPanel onRecordAdminAction={onRecordAdminAction} />);

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Feature Flag Governance' })).toBeTruthy();
    });

    const toggle = screen.getByRole('switch', { name: 'Toggle enable_job_recommendations' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(adminService.updateSystemSetting).toHaveBeenCalledWith(
        FEATURE_FLAGS_KEY,
        expect.objectContaining({
          version: 1,
          overrides: {},
        }),
        expect.any(String),
      );
    });

    expect(onRecordAdminAction).toHaveBeenCalledWith('admin_feature_flag_override_set', {
      flagName: 'enable_job_recommendations',
      flagEnabled: false,
      settingKey: FEATURE_FLAGS_KEY,
      settingAction: 'override_reset',
    });
  });

  it('resets all overrides when the Reset All button is clicked', async () => {
    const onRecordAdminAction = vi.fn();
    vi.mocked(adminService.updateSystemSetting).mockResolvedValue({
      ...mockFeatureFlagsRow,
      value: {
        version: 1,
        defaults: (mockFeatureFlagsRow.value as any).defaults,
        overrides: {},
      },
    });

    render(<FeatureFlagsPanel onRecordAdminAction={onRecordAdminAction} />);

    const resetAllButton = await screen.findByRole('button', { name: 'Reset All' });
    fireEvent.click(resetAllButton);

    await waitFor(() => {
      expect(adminService.updateSystemSetting).toHaveBeenCalledWith(
        FEATURE_FLAGS_KEY,
        expect.objectContaining({
          version: 1,
          overrides: {},
        }),
        expect.any(String),
      );
    });

    expect(onRecordAdminAction).toHaveBeenCalledWith('admin_feature_flag_override_reset', {
      settingKey: FEATURE_FLAGS_KEY,
      settingAction: 'override_reset_all',
    });
  });

  it('shows safe failure copy when feature-flag settings cannot load', async () => {
    vi.mocked(adminService.getSystemSettings).mockRejectedValue(new Error('db connection timeout'));

    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Feature-flag governance could not be loaded.')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: 'Retry Flags' })).toBeTruthy();
    expectSvgIconsDecorative(document.body);
  });

  it('shows empty state when the feature_flags row is missing from system_settings', async () => {
    vi.mocked(adminService.getSystemSettings).mockResolvedValue([]);

    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Feature-flag governance store not seeded')).toBeTruthy();
    });
    expectSvgIconsDecorative(document.body);
  });
});