import React from 'react';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { Mail, Smartphone } from 'lucide-react';
import { NotificationSettings as NotificationSettingsType } from '../../../services/settingsService';

interface NotificationSettingsProps {
  notifications: NotificationSettingsType | null;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationSettingsType | null>>;
  handleNotificationSave: () => void;
  loading: boolean;
  saving: boolean;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notifications,
  setNotifications,
  handleNotificationSave,
  loading,
  saving
}) => {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Notification Preferences</h3>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl"></div>)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Communication Channels */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Channels</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-white">Email Notifications</p>
                    <p className="text-sm text-slate-400">Receive updates via email</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications?.email_notifications || false}
                    onChange={(e) => setNotifications(p => p ? { ...p, email_notifications: e.target.checked } : null)}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-white">Push Notifications</p>
                    <p className="text-sm text-slate-400">Receive push notifications in browser</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications?.push_notifications || false}
                    onChange={(e) => setNotifications(p => p ? { ...p, push_notifications: e.target.checked } : null)}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Activity Alerts */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 mt-8">Activity Alerts</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-medium text-white">Job Alerts</p>
                  <p className="text-sm text-slate-400">New job postings matching your skills</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications?.job_alerts || false}
                    onChange={(e) => setNotifications(p => p ? { ...p, job_alerts: e.target.checked } : null)}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-medium text-white">Messages</p>
                  <p className="text-sm text-slate-400">When you receive a new direct message</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications?.message_notifications || false}
                    onChange={(e) => setNotifications(p => p ? { ...p, message_notifications: e.target.checked } : null)}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleNotificationSave} isLoading={saving}>Save Preferences</Button>
          </div>
        </div>
      )}
    </Card>
  );
};
