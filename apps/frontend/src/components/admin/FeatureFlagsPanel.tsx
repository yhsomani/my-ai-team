import React, { useState, useEffect, useCallback } from 'react';
import Card from '../shared/GlassCard';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/AuraButton';
import { Skeleton } from '../shared/Skeleton';
import { EmptyState } from '../shared/EmptyState';
import { Toggle } from '../shared/Toggle';
import { Flag, RefreshCw, RotateCcw } from 'lucide-react';
import { adminService, type SystemSetting } from '../../services/adminService';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

/** system_settings key holding the canonical feature-flag governance store. */
export const FEATURE_FLAGS_KEY = 'feature_flags';

/** system_settings key holding human-readable descriptions mirroring Feature.java. */
export const FEATURE_FLAG_DESCRIPTIONS_KEY = 'feature_flag_descriptions';

const FEATURE_FLAGS_ROW_DESCRIPTION =
  'Feature-flag governance store: canonical Feature.java defaults mirrored in "defaults", runtime overrides persisted in "overrides", audited via admin UI.';

export interface FeatureFlagsGovernance {
  version: number;
  defaults: Record<string, boolean>;
  overrides: Record<string, boolean>;
}

export interface FeatureFlagEntry {
  name: string;
  defaultEnabled: boolean;
  enabled: boolean;
  overridden: boolean;
  description: string;
}

export interface FeatureFlagGroup {
  label: string;
  flags: FeatureFlagEntry[];
}

const CATEGORY_ROUTING: Array<{ label: string; match: (flagName: string) => boolean }> = [
  { label: 'Core Platform', match: (name) => ['enable_auth', 'enable_user_management', 'enable_profile_management'].includes(name) },
  { label: 'Jobs & Companies', match: (name) => /^(enable_job|enable_application|enable_company)/.test(name) },
  { label: 'Learning', match: (name) => /^(enable_course|enable_learning)/.test(name) },
  { label: 'Challenges & Gamification', match: (name) => /^(enable_coding_challenges|enable_leaderboards|enable_achievements|enable_xp_system)$/.test(name) },
  { label: 'AI Capabilities', match: (name) => /^enable_ai_/.test(name) },
  { label: 'Notifications', match: (name) => /^(enable_notifications|enable_email_notifications|enable_push_notifications)$/.test(name) },
  { label: 'Messaging & Networking', match: (name) => /^(enable_messaging|enable_chat|enable_connections|enable_posts)$/.test(name) },
  { label: 'Search', match: (name) => /^(enable_global_search|enable_elasticsearch)$/.test(name) },
  { label: 'Payments', match: (name) => /^(enable_payments|enable_subscriptions|enable_premium)/.test(name) },
  { label: 'Video & Media', match: (name) => /^enable_video/.test(name) },
  { label: 'Analytics', match: (name) => /^enable_.*analytics$/.test(name) },
];

/** Resolve a canonical flag name to its governance category label. */
export const getFlagCategory = (flagName: string): string => {
  const matched = CATEGORY_ROUTING.find((group) => group.match(flagName));
  return matched ? matched.label : 'Other';
};

const parseGovernance = (value: unknown): FeatureFlagsGovernance | null => {
  if (typeof value !== 'object' || value === null) return null;
  const object = value as Record<string, unknown>;
  if (typeof object.version !== 'number' || object.version < 1) return null;
  if (typeof object.defaults !== 'object' || object.defaults === null || Array.isArray(object.defaults)) return null;
  const defaults = object.defaults as Record<string, unknown>;
  const names = Object.keys(defaults).filter((name) => typeof defaults[name] === 'boolean');
  if (names.length === 0) return null;
  const overrides = (typeof object.overrides === 'object' && object.overrides !== null && !Array.isArray(object.overrides))
    ? (object.overrides as Record<string, boolean>)
    : {};
  return { version: object.version, defaults: defaults as Record<string, boolean>, overrides };
};

const parseDescriptions = (value: unknown): Record<string, string> => {
  if (typeof value !== 'object' || value === null) return {};
  return value as Record<string, string>;
};

interface FeatureFlagsPanelProps {
  onRecordAdminAction?: (action: string, extra?: Record<string, unknown>) => void;
}

export const FeatureFlagsPanel: React.FC<FeatureFlagsPanelProps> = ({ onRecordAdminAction }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [savingFlag, setSavingFlag] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState(false);

  const loadSettings = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const rows = await adminService.getSystemSettings();
      setSettings(rows || []);
      if (!isSilent) setFeedback(null);
    } catch (err) {
      console.error('[FeatureFlags] Failed to load settings:', err);
      setError('Feature-flag governance could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const findSetting = useCallback((key: string): SystemSetting | undefined => (
    settings.find((setting) => setting.key === key)
  ), [settings]);

  const governance = parseGovernance(findSetting(FEATURE_FLAGS_KEY)?.value);
  const descriptions = parseDescriptions(findSetting(FEATURE_FLAG_DESCRIPTIONS_KEY)?.value);

  const flags: FeatureFlagEntry[] = governance
    ? Object.keys(governance.defaults).map((name) => {
        const overridden = name in governance.overrides;
        return {
          name,
          defaultEnabled: governance.defaults[name],
          enabled: overridden ? governance.overrides[name] : governance.defaults[name],
          overridden,
          description: descriptions[name] ?? '',
        };
      })
    : [];

  const overriddenCount = flags.filter((flag) => flag.overridden).length;

  const grouped: FeatureFlagGroup[] = CATEGORY_ROUTING
    .map((group) => ({
      label: group.label,
      flags: flags.filter((flag) => group.match(flag.name)),
    }))
    .filter((item) => item.flags.length > 0);

  const toggleFlag = async (flagName: string, nextEnabled: boolean) => {
    if (!governance) return;
    const nextOverrides = { ...governance.overrides };
    const restoringDefault = nextEnabled === governance.defaults[flagName];
    if (restoringDefault) {
      delete nextOverrides[flagName];
    } else {
      nextOverrides[flagName] = nextEnabled;
    }
    const nextGovernance: FeatureFlagsGovernance = {
      ...governance,
      overrides: nextOverrides,
    };

    setSavingFlag(flagName);
    setFeedback(null);
    try {
      const flagsRow = findSetting(FEATURE_FLAGS_KEY);
      await adminService.updateSystemSetting(
        FEATURE_FLAGS_KEY,
        nextGovernance,
        flagsRow?.description ?? FEATURE_FLAGS_ROW_DESCRIPTION,
      );
      onRecordAdminAction?.('admin_feature_flag_override_set', {
        flagName,
        flagEnabled: nextEnabled,
        settingKey: FEATURE_FLAGS_KEY,
        settingAction: restoringDefault ? 'override_reset' : 'override_set',
      });
      setFeedback({
        kind: 'success',
        message: restoringDefault
          ? `Reset ${flagName} to its default.`
          : `Set ${flagName} to ${nextEnabled ? 'enabled' : 'disabled'}.`,
      });
      await loadSettings(true);
    } catch (err) {
      console.error('[FeatureFlags] Failed to update feature flag:', err);
      onRecordAdminAction?.('admin_feature_flag_override_failed', {
        flagName,
        settingKey: FEATURE_FLAGS_KEY,
        settingAction: restoringDefault ? 'override_reset' : 'override_set',
      });
      setFeedback({ kind: 'error', message: `Could not update ${flagName}. Please retry.` });
    } finally {
      setSavingFlag(null);
    }
  };

  const resetAllOverrides = async () => {
    if (!governance) return;
    const nextGovernance: FeatureFlagsGovernance = { ...governance, overrides: {} };

    setResettingAll(true);
    setFeedback(null);
    try {
      const flagsRow = findSetting(FEATURE_FLAGS_KEY);
      await adminService.updateSystemSetting(
        FEATURE_FLAGS_KEY,
        nextGovernance,
        flagsRow?.description ?? FEATURE_FLAGS_ROW_DESCRIPTION,
      );
      onRecordAdminAction?.('admin_feature_flag_override_reset', {
        settingKey: FEATURE_FLAGS_KEY,
        settingAction: 'override_reset_all',
      });
      setFeedback({ kind: 'success', message: 'All feature flags reset to defaults.' });
      await loadSettings(true);
    } catch (err) {
      console.error('[FeatureFlags] Failed to reset feature flags:', err);
      onRecordAdminAction?.('admin_feature_flag_override_failed', {
        settingKey: FEATURE_FLAGS_KEY,
        settingAction: 'override_reset_all',
      });
      setFeedback({ kind: 'error', message: 'Could not reset feature flags. Please retry.' });
    } finally {
      setResettingAll(false);
    }
  };

  return (
    <Card role="region" aria-label="Feature Flag Governance">
      <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">Feature Flags</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Govern runtime feature flags via the persisted <code className="text-[10px]">feature_flags</code> system setting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {governance && (
            <Badge variant={overriddenCount > 0 ? 'warning' : 'outline'}>
              {flags.length} flags {overriddenCount > 0 ? `· ${overriddenCount} overridden` : '· defaults'}
            </Badge>
          )}
          {feedback && (
            <span
              className={`text-xs ${feedback.kind === 'success' ? 'text-success' : 'text-destructive'}`}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </span>
          )}
          {error && <Badge variant="warning">Needs retry</Badge>}
          <Button variant="outline" size="sm" onClick={() => void loadSettings()} isLoading={refreshing}>
            <RefreshCw {...decorativeIconProps} size={14} />
            Refresh
          </Button>
          {overriddenCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => void resetAllOverrides()} isLoading={resettingAll}>
              <RotateCcw {...decorativeIconProps} size={14} />
              Reset All
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadSettings()} isLoading={refreshing}>
            <RefreshCw {...decorativeIconProps} size={14} />
            Retry Flags
          </Button>
        </div>
      ) : !governance ? (
        <div className="p-6">
          <EmptyState
            icon={<Flag {...decorativeIconProps} className="h-12 w-12 text-[var(--text-muted)]" />}
            title="Feature-flag governance store not seeded"
            description="The canonical feature_flags system setting is missing or malformed. Re-run the canonical seed so the governance mirror can be managed here."
          />
        </div>
      ) : (
        <div className="p-5 space-y-6">
          {grouped.map((group) => (
            <div key={group.label} aria-label={group.label}>
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3">{group.label}</h4>
              <div className="flex flex-col gap-2">
                {group.flags.map((flag) => (
                  <div
                    key={flag.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-xs font-medium">{flag.name}</code>
                        <Badge variant={flag.overridden ? 'warning' : 'outline'}>
                          {flag.overridden ? 'Overridden' : 'Default'}
                        </Badge>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {flag.description || 'No description available.'}
                      </span>
                    </div>
                    <Toggle
                      checked={flag.enabled}
                      onChange={(next) => void toggleFlag(flag.name, next)}
                      ariaLabel={`Toggle ${flag.name}`}
                      disabled={savingFlag === flag.name}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};