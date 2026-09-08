import React, { useState, useEffect, useCallback } from 'react';
import Card from '../shared/GlassCard';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/AuraButton';
import { Skeleton } from '../shared/Skeleton';
import { EmptyState } from '../shared/EmptyState';
import { Settings, RefreshCw, Save } from 'lucide-react';
import { adminService, type SystemSetting } from '../../services/adminService';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

interface SystemSettingsPanelProps {
  onRecordAdminAction?: (action: string, extra?: Record<string, unknown>) => void;
}

export const SystemSettingsPanel: React.FC<SystemSettingsPanelProps> = ({ onRecordAdminAction }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});
  const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadSettings = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const rows = await adminService.getSystemSettings();
      setSettings(rows || []);
      if (!isSilent) setFeedback(null);
    } catch (err) {
      console.error('[SystemSettings] Failed to load settings:', err);
      setError('System settings could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const serializeValue = (raw: unknown): string => {
    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'string') return raw;
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  };

  const parseValue = (text: string): { ok: boolean; value: unknown; message?: string } => {
    const trimmed = text.trim();
    if (trimmed === '') {
      return { ok: true, value: '' };
    }
    // Heuristic: preserve plain strings without quotes, parse structured values otherwise.
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
      || (trimmed.startsWith('[') && trimmed.endsWith(']'))
      || trimmed === 'true'
      || trimmed === 'false'
      || (trimmed.startsWith('"') && trimmed.endsWith('"'))
      || Number.isFinite(Number(trimmed))
    ) {
      try {
        return { ok: true, value: JSON.parse(trimmed) };
      } catch {
        return { ok: false, value: null, message: 'Value must be valid JSON (object, array, number, boolean) or a plain string.' };
      }
    }
    return { ok: true, value: trimmed };
  };

  const handleSave = async (setting: SystemSetting) => {
    const draftValue = valueDrafts[setting.key] ?? serializeValue(setting.value);
    const draftDescription = descriptionDrafts[setting.key] ?? setting.description ?? '';
    const parsed = parseValue(draftValue);
    if (!parsed.ok) {
      setFeedback({ kind: 'error', message: parsed.message ?? `Could not parse value for ${setting.key}.` });
      return;
    }
    if (parsed.value === setting.value && draftDescription === (setting.description ?? '')) {
      setFeedback({ kind: 'error', message: `No change to save for ${setting.key}.` });
      return;
    }
    setSavingKey(setting.key);
    setFeedback(null);
    try {
      await adminService.updateSystemSetting(setting.key, parsed.value, draftDescription);
      onRecordAdminAction?.('admin_system_setting_updated', {
        settingKey: setting.key,
        settingAction: 'update',
      });
      setFeedback({ kind: 'success', message: `Updated ${setting.key}.` });
      await loadSettings(true);
    } catch (err) {
      console.error('[SystemSettings] Failed to update setting:', err);
      onRecordAdminAction?.('admin_system_setting_update_failed', {
        settingKey: setting.key,
        settingAction: 'update',
      });
      setFeedback({ kind: 'error', message: `Could not save ${setting.key}. Please retry.` });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Card role="region" aria-label="System Settings Management">
      <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">System Settings</h3>
          <p className="text-xs text-[var(--text-muted)]">
            View and update runtime configuration keys.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            Refresh Settings
          </Button>
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
            Retry Settings
          </Button>
        </div>
      ) : settings.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Settings {...decorativeIconProps} className="h-12 w-12 text-[var(--text-muted)]" />}
            title="No system settings"
            description="No runtime configuration keys are registered yet."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" aria-label="System settings">
            <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-6 py-3 font-medium">Key</th>
                <th className="px-6 py-3 font-medium">Value (JSON or plain text)</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {settings.map((setting) => {
                const draftValue = valueDrafts[setting.key] ?? serializeValue(setting.value);
                const draftDescription = descriptionDrafts[setting.key] ?? setting.description ?? '';
                return (
                  <tr key={setting.key} aria-label={`${setting.key}: ${serializeValue(setting.value)}.`}>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Settings {...decorativeIconProps} size={14} className="text-[var(--text-muted)]" />
                        <code className="text-xs font-medium">{setting.key}</code>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <textarea
                        aria-label={`Value for ${setting.key}`}
                        data-ui="textarea"
                        value={draftValue}
                        onChange={(event) => setValueDrafts((prev) => ({ ...prev, [setting.key]: event.target.value }))}
                        rows={2}
                        className="w-full min-w-40 rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <input
                        aria-label={`Description for ${setting.key}`}
                        data-ui="input"
                        value={draftDescription}
                        onChange={(event) => setDescriptionDrafts((prev) => ({ ...prev, [setting.key]: event.target.value }))}
                        placeholder="Optional description"
                        className="w-full min-w-40 h-9 rounded-lg border border-[var(--border-default)] bg-transparent px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </td>
                    <td className="px-6 py-4 align-top">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleSave(setting)}
                        isLoading={savingKey === setting.key}
                        disabled={
                          (valueDrafts[setting.key] ?? serializeValue(setting.value)) === serializeValue(setting.value)
                          && (descriptionDrafts[setting.key] ?? setting.description ?? '') === (setting.description ?? '')
                        }
                      >
                        <Save {...decorativeIconProps} size={14} />
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
