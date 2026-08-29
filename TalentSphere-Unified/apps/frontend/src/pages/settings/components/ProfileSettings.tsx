import React from 'react';
import Card from '../../../components/shared/GlassCard';
import { Input } from '../../../components/shared/AuraInput';
import { Button } from '../../../components/shared/AuraButton';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  location: string;
}

interface ProfileSettingsProps {
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>;
  handleProfileSave: () => void;
  saving: boolean;
  profileSaveError?: string | null;
  clearProfileSaveError?: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profileData,
  setProfileData,
  handleProfileSave,
  saving,
  profileSaveError,
  clearProfileSaveError
}) => {
  const updateProfileData = (updates: Partial<ProfileData>) => {
    clearProfileSaveError?.();
    setProfileData(p => ({ ...p, ...updates }));
  };

  return (
    <Card className="p-6">
      <h3 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">Personal Information</h3>

      <div className="space-y-6">
        {profileSaveError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive-muted p-3"
          >
            <p className="text-sm text-destructive">{profileSaveError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            value={profileData.firstName}
            onChange={(e) => updateProfileData({ firstName: e.target.value })}
          />
          <Input
            label="Last Name"
            value={profileData.lastName}
            onChange={(e) => updateProfileData({ lastName: e.target.value })}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          value={profileData.email}
          disabled
        />

        <Input
          label="Professional Headline"
          value={profileData.headline}
          onChange={(e) => updateProfileData({ headline: e.target.value })}
          placeholder="e.g. Senior Software Engineer at Tech Corp"
        />

        <Input
          label="Location"
          value={profileData.location}
          onChange={(e) => updateProfileData({ location: e.target.value })}
          placeholder="e.g. San Francisco, CA"
        />

        <div className="pt-4 flex justify-end">
          <Button
            onClick={handleProfileSave}
            isLoading={saving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </Card>
  );
};
