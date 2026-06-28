import React, { useState } from 'react';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { AuraModal } from '../../../components/shared/AuraModal';
import { Badge } from '../../../components/shared/Badge';
import { Input } from '../../../components/shared/AuraInput';
import { useToast } from '../../../components/shared/Toast';
import { authService } from '../../../services/authService';
import { settingsService } from '../../../services/settingsService';
import { Key, Shield, Trash2 } from 'lucide-react';
import type { SettingsWorkflowAnalyticsAction } from '../../../lib/settingsWorkflowAnalytics';

interface SecuritySettingsProps {
  userId?: string;
  userEmail?: string;
  recordSettingsAction?: (
    action: SettingsWorkflowAnalyticsAction,
    extra?: {
      errorCategory?: string;
    }
  ) => void;
}

const getSecurityWorkflowErrorCategory = (error: unknown, fallback: string) => (
  error instanceof Error ? error.name : fallback
);

const accountDeactivationConfirmation = 'DEACTIVATE';

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ userId, userEmail, recordSettingsAction }) => {
  const { addToast } = useToast();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [accountDeactivationError, setAccountDeactivationError] = useState<string | null>(null);
  const isAccountDeactivationConfirmed = deleteConfirmation.trim().toUpperCase() === accountDeactivationConfirmation;

  const closePasswordResetReview = () => {
    if (isSendingReset) return;
    recordSettingsAction?.('password_reset_cancelled');
    setPasswordResetError(null);
    setIsPasswordModalOpen(false);
  };

  const closeAccountDeactivationReview = () => {
    if (isDeletingAccount) return;
    recordSettingsAction?.('account_delete_cancelled');
    setAccountDeactivationError(null);
    setIsDeleteModalOpen(false);
    setDeleteConfirmation('');
  };

  const handlePasswordReset = async () => {
    if (!userEmail) {
      setPasswordResetError('No account email is available for password reset.');
      addToast({ type: 'error', title: 'Email unavailable', message: 'No account email is available for password reset.' });
      recordSettingsAction?.('password_reset_failed', { errorCategory: 'missing_email' });
      return;
    }

    setIsSendingReset(true);
    setPasswordResetError(null);
    try {
      await authService.resetPassword(userEmail);
      addToast({ type: 'success', title: 'Password reset email sent', message: `Check ${userEmail} for the reset link.` });
      recordSettingsAction?.('password_reset_completed');
      setPasswordResetError(null);
      setIsPasswordModalOpen(false);
    } catch (error) {
      setPasswordResetError('Password reset email could not be sent. Try again from this review.');
      addToast({ type: 'error', title: 'Password reset failed', message: 'Please try again later.' });
      recordSettingsAction?.('password_reset_failed', {
        errorCategory: getSecurityWorkflowErrorCategory(error, 'password_reset_failed'),
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId || !isAccountDeactivationConfirmed) return;

    setIsDeletingAccount(true);
    setAccountDeactivationError(null);
    try {
      await settingsService.deleteAccount(userId);
      addToast({ type: 'success', title: 'Account deactivated', message: 'Your profile has been marked inactive.' });
      recordSettingsAction?.('account_delete_completed');
      setAccountDeactivationError(null);
      setIsDeleteModalOpen(false);
      setDeleteConfirmation('');
    } catch (error) {
      setAccountDeactivationError('Account deactivation could not be completed. Confirm the text and try again.');
      addToast({ type: 'error', title: 'Account deactivation failed', message: 'Please try again later.' });
      recordSettingsAction?.('account_delete_failed', {
        errorCategory: getSecurityWorkflowErrorCategory(error, 'account_delete_failed'),
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <h3 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">Security Settings</h3>

        <div className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 sm:flex-row">
            <div>
              <h4 className="flex items-center gap-2 text-lg font-medium text-[var(--text-primary)]">
                <Key className="h-5 w-5 text-accent" />
                Password
              </h4>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Send a password reset link to your account email</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                recordSettingsAction?.('password_reset_review_opened');
                setPasswordResetError(null);
                setIsPasswordModalOpen(true);
              }}
              disabled={!userEmail}
            >
              Update Password
            </Button>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 sm:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="flex items-center gap-2 text-lg font-medium text-[var(--text-primary)]">
                  <Shield className="h-5 w-5 text-success" />
                  Two-Factor Authentication
                </h4>
                <Badge variant="outline">Coming soon</Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">2FA setup requires an authentication provider integration</p>
            </div>
            <Button variant="outline" disabled>Unavailable</Button>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-md border border-destructive/30 bg-destructive-muted p-5 sm:flex-row">
            <div>
              <h4 className="flex items-center gap-2 text-lg font-medium text-destructive">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </h4>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Deactivate your account profile after confirmation</p>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                recordSettingsAction?.('account_delete_review_opened');
                setAccountDeactivationError(null);
                setIsDeleteModalOpen(true);
              }}
              disabled={!userId}
            >
              Deactivate Account
            </Button>
          </div>
        </div>
      </Card>

      <AuraModal
        isOpen={isPasswordModalOpen}
        onClose={closePasswordResetReview}
        title="Update Password"
        footer={
          <>
            <Button variant="ghost" onClick={closePasswordResetReview} disabled={isSendingReset}>Cancel</Button>
            <Button onClick={handlePasswordReset} isLoading={isSendingReset} disabled={!userEmail}>Send Reset Email</Button>
          </>
        }
      >
        <div className="space-y-3">
          {passwordResetError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/20 bg-destructive-muted p-3"
            >
              <p className="text-sm text-destructive">{passwordResetError}</p>
            </div>
          )}
          <p className="text-sm text-[var(--text-secondary)]">
            TalentSphere will send a password reset link to {userEmail || 'your account email'}.
          </p>
        </div>
      </AuraModal>

      <AuraModal
        isOpen={isDeleteModalOpen}
        onClose={closeAccountDeactivationReview}
        title="Deactivate Account"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeAccountDeactivationReview}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              isLoading={isDeletingAccount}
              disabled={!isAccountDeactivationConfirmed || !userId}
            >
              Confirm Deactivation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {accountDeactivationError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/20 bg-destructive-muted p-3"
            >
              <p className="text-sm text-destructive">{accountDeactivationError}</p>
            </div>
          )}
          <p className="text-sm text-[var(--text-secondary)]">
            This marks your profile inactive so it no longer appears as an active TalentSphere profile. It does not cancel billing or erase provider records.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Type {accountDeactivationConfirmation} to confirm.
          </p>
          <Input
            label="Confirmation"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder={accountDeactivationConfirmation}
          />
        </div>
      </AuraModal>
    </>
  );
};
