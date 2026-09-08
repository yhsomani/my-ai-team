import React, { useState, useEffect, useCallback } from 'react';
import Card from '../shared/GlassCard';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/AuraButton';
import { Skeleton } from '../shared/Skeleton';
import { EmptyState } from '../shared/EmptyState';
import { Users, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { adminService } from '../../services/adminService';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const ROLE_OPTIONS = ['USER', 'RECRUITER', 'ADMIN'] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

type AdminUserRow = NonNullable<Awaited<ReturnType<typeof adminService.getAllUsers>>>[number];

interface AdminUsersPanelProps {
  onRecordAdminAction?: (action: string, extra?: Record<string, unknown>) => void;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ onRecordAdminAction }) => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError(null);
    try {
      const rows = await adminService.getAllUsers();
      setUsers(rows || []);
      if (!isSilent) setFeedback(null);
    } catch (err) {
      console.error('[AdminUsers] Failed to load users:', err);
      setError('User list could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const isRoleOption = (value: string): value is RoleOption => ROLE_OPTIONS.some((role) => role === value);

  const handleRoleChange = (userId: string, role: string) => {
    setRoleDrafts((prev) => ({ ...prev, [userId]: role }));
  };

  const handleSaveRole = async (user: AdminUserRow) => {
    const role = roleDrafts[user.id] ?? user.role;
    if (role === user.role) {
      setFeedback({ kind: 'error', message: `No role change selected for ${user.email ?? user.id}.` });
      return;
    }
    if (!isRoleOption(role)) {
      setFeedback({ kind: 'error', message: `Invalid role "${role}".` });
      return;
    }
    setSavingUserId(user.id);
    setFeedback(null);
    try {
      await adminService.updateUserRole(user.id, role);
      onRecordAdminAction?.('admin_user_role_updated', {
        targetUserId: user.id,
        roleFrom: user.role,
        roleTo: role,
      });
      setFeedback({ kind: 'success', message: `Updated ${user.email ?? user.id} to ${role}.` });
      await loadUsers(true);
    } catch (err) {
      console.error('[AdminUsers] Failed to update role:', err);
      onRecordAdminAction?.('admin_user_role_update_failed', {
        targetUserId: user.id,
        roleFrom: user.role,
        roleTo: role,
      });
      setFeedback({ kind: 'error', message: 'Role update failed. Please retry.' });
    } finally {
      setSavingUserId(null);
    }
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return 'Never';
    return new Date(value).toLocaleString();
  };

  return (
    <Card role="region" aria-label="User Management">
      <div className="p-5 border-b border-[var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">User Management</h3>
          <p className="text-xs text-[var(--text-muted)]">
            Review profiles and update account roles.
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
          <Button variant="outline" size="sm" onClick={() => void loadUsers()} isLoading={refreshing}>
            <RefreshCw {...decorativeIconProps} size={14} />
            Refresh Users
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-10 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void loadUsers()} isLoading={refreshing}>
            <RefreshCw {...decorativeIconProps} size={14} />
            Retry Users
          </Button>
        </div>
      ) : users.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Users {...decorativeIconProps} className="h-12 w-12 text-[var(--text-muted)]" />}
            title="No users found"
            description="No profiles are registered yet."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left" aria-label="Admin users">
            <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {users.map((user) => {
                const draftRole = roleDrafts[user.id] ?? user.role;
                const profile = Array.isArray(user.user_profiles) ? user.user_profiles[0] : user.user_profiles;
                return (
                  <tr
                    key={user.id}
                    aria-label={`${user.email}: role ${user.role}.`}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck {...decorativeIconProps} size={14} className="text-[var(--text-muted)]" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.full_name || 'Unnamed user'}</p>
                          <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
                          {profile?.current_role && (
                            <p className="truncate text-[10px] text-[var(--text-muted)]">{profile.current_role}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{user.role}</Badge>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {formatTimestamp(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Role for ${user.email ?? user.id}`}
                          data-ui="select"
                          value={draftRole}
                          onChange={(event) => handleRoleChange(user.id, event.target.value)}
                          className="h-9 rounded-lg border border-[var(--border-default)] bg-transparent px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role} className="bg-[var(--bg-primary)]">
                              {role}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleSaveRole(user)}
                          isLoading={savingUserId === user.id}
                          disabled={draftRole === user.role}
                        >
                          <Save {...decorativeIconProps} size={14} />
                          Save
                        </Button>
                      </div>
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