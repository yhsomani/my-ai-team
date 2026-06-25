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

interface SecuritySettingsProps {
  userId?: string;
  userEmail?: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ userId, userEmail }) => {
  const { addToast } = useToast();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handlePasswordReset = async () => {
    if (!userEmail) {
      addToast({ type: 'error', title: 'Email unavailable', message: 'No account email is available for password reset.' });
      return;
    }

    setIsSendingReset(true);
    try {
      await authService.resetPassword(userEmail);
      addToast({ type: 'success', title: 'Password reset email sent', message: `Check ${userEmail} for the reset link.` });
      setIsPasswordModalOpen(false);
    } catch (error) {
      addToast({ type: 'error', title: 'Password reset failed', message: 'Please try again later.' });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId || deleteConfirmation !== 'DELETE') return;

    setIsDeletingAccount(true);
    try {
      await settingsService.deleteAccount(userId);
      addToast({ type: 'success', title: 'Account deactivated', message: 'Your profile has been marked inactive.' });
      setIsDeleteModalOpen(false);
      setDeleteConfirmation('');
    } catch (error) {
      addToast({ type: 'error', title: 'Account deletion failed', message: 'Please try again later.' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <h3 className="text-xl font-bold text-white mb-6">Security Settings</h3>

        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row gap-4 items-start justify-between">
            <div>
              <h4 className="text-lg font-medium text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-accent" />
                Password
              </h4>
              <p className="text-slate-400 text-sm mt-1">Send a password reset link to your account email</p>
            </div>
            <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)} disabled={!userEmail}>
              Update Password
            </Button>
          </div>

          <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row gap-4 items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-medium text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Two-Factor Authentication
                </h4>
                <Badge variant="outline">Coming soon</Badge>
              </div>
              <p className="text-slate-400 text-sm mt-1">2FA setup requires an authentication provider integration</p>
            </div>
            <Button variant="outline" disabled>Unavailable</Button>
          </div>

          <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row gap-4 items-start justify-between mt-12">
            <div>
              <h4 className="text-lg font-medium text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </h4>
              <p className="text-red-400/70 text-sm mt-1">Deactivate your account profile after confirmation</p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={!userId}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Card>

      <AuraModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Update Password"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)} disabled={isSendingReset}>Cancel</Button>
            <Button onClick={handlePasswordReset} isLoading={isSendingReset} disabled={!userEmail}>Send Reset Email</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            TalentSphere will send a password reset link to {userEmail || 'your account email'}.
          </p>
        </div>
      </AuraModal>

      <AuraModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmation('');
        }}
        title="Delete Account"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmation('');
              }}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              isLoading={isDeletingAccount}
              disabled={deleteConfirmation !== 'DELETE' || !userId}
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            This marks your profile inactive. Type DELETE to confirm.
          </p>
          <Input
            label="Confirmation"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="DELETE"
          />
        </div>
      </AuraModal>
    </>
  );
};
