import React from 'react';
import { Loader2, Users } from 'lucide-react';
import { PublicProfile } from '../../../types/networking';
import ProfileCard from './ProfileCard';
import { Button } from '../../../components/shared/AuraButton';
import { EmptyState } from '../../../components/shared/EmptyState';

interface ProfileGridProps {
  isLoading: boolean;
  profiles: PublicProfile[];
  activeCategory: string;
  onConnect: (id: string) => void;
  onReset: () => void;
}

export const ProfileGrid: React.FC<ProfileGridProps> = ({
  isLoading,
  profiles,
  activeCategory,
  onConnect,
  onReset
}) => {
  if (isLoading) {
    return (
      <div className="surface-panel flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-sm text-[var(--text-secondary)]">
        <Loader2 size={22} className="animate-spin text-accent" />
        <span>Loading profiles...</span>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 p-4">
        <EmptyState
          title="No profiles found"
          description="Try a different search or reset the current filter."
          icon={<Users size={24} />}
        />
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={onReset}>
            Reset search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          activeCategory={activeCategory}
          onConnect={onConnect}
        />
      ))}
    </div>
  );
};

export default React.memo(ProfileGrid);
