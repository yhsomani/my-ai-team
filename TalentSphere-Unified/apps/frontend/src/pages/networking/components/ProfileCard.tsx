import React from 'react';
import { Check, Clock, MapPin, UserPlus } from 'lucide-react';
import { PublicProfile } from '../../../types/networking';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { Badge } from '../../../components/shared/Badge';

interface ProfileCardProps {
  profile: PublicProfile;
  activeCategory: string;
  onConnect: (id: string) => void;
}

const getInitials = (name?: string) => {
  const initials = (name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials || 'U';
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, activeCategory, onConnect }) => {
  const isConnected = activeCategory === 'Connections' || profile.isConnected;
  const isRequestView = activeCategory === 'Requests';
  const skills = (profile.sharedSkills?.length ? profile.sharedSkills : profile.skills || []).slice(0, 4);

  return (
    <Card className="flex h-full min-h-72 flex-col p-5 transition-colors hover:border-[var(--border-strong)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 text-sm font-semibold text-accent">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              getInitials(profile.fullName)
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{profile.fullName || 'Unknown User'}</h3>
            <p className="truncate text-xs text-[var(--text-muted)]">{profile.currentRole || profile.headline || 'Professional'}</p>
          </div>
        </div>
        {typeof profile.recommendationScore === 'number' && (
          <Badge variant="outline">{profile.recommendationScore}% fit</Badge>
        )}
      </div>

      <div className="mb-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <MapPin size={12} />
        <span className="truncate">{profile.location || 'Location unavailable'}</span>
      </div>

      {profile.headline && (
        <p className="mb-3 line-clamp-2 text-xs text-[var(--text-secondary)]">{profile.headline}</p>
      )}

      {skills.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill} variant={profile.sharedSkills?.includes(skill) ? 'success' : 'outline'}>
              {skill}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-auto">
        {isConnected ? (
          <Button variant="outline" className="w-full" disabled>
            <Check size={14} />
            Connected
          </Button>
        ) : isRequestView ? (
          <Button variant="secondary" className="w-full" disabled>
            <Clock size={14} />
            Pending review
          </Button>
        ) : (
          <Button className="w-full" disabled={profile.isConnected} onClick={() => onConnect(profile.id)}>
            <UserPlus size={14} />
            Connect
          </Button>
        )}
      </div>
    </Card>
  );
};

export default React.memo(ProfileCard);
