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
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profileData,
  setProfileData,
  handleProfileSave,
  saving
}) => {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Personal Information</h3>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={profileData.firstName}
            onChange={(e) => setProfileData(p => ({ ...p, firstName: e.target.value }))}
          />
          <Input
            label="Last Name"
            value={profileData.lastName}
            onChange={(e) => setProfileData(p => ({ ...p, lastName: e.target.value }))}
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
          onChange={(e) => setProfileData(p => ({ ...p, headline: e.target.value }))}
          placeholder="e.g. Senior Software Engineer at Tech Corp"
        />

        <Input
          label="Location"
          value={profileData.location}
          onChange={(e) => setProfileData(p => ({ ...p, location: e.target.value }))}
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
