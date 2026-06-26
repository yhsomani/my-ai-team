import type { PublicProfile } from '../types/networking';

export interface NetworkingProfilePreview {
  displayName: string;
  initials: string;
  role: string;
  location: string;
  headline?: string;
  summary?: string;
  skills: string[];
  sharedSkills: string[];
  reasons: string[];
  fitLabel?: string;
  mutualConnectionLabel?: string;
  profilePath: string;
}

const compact = (value?: string | null) => (value || '').trim();

const uniqueValues = (values: Array<string | undefined | null>) => Array.from(new Set(
  values.map(compact).filter(Boolean)
));

export const getNetworkingProfilePath = (profile?: PublicProfile | null) => {
  const profileId = compact(profile?.userId || profile?.id);
  return profileId ? `/profile/${profileId}` : '';
};

export const getNetworkingProfileInitials = (name?: string) => {
  const parts = compact(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';

  return parts.map(part => part[0]).join('').toUpperCase().slice(0, 2);
};

export const buildNetworkingProfilePreview = (profile: PublicProfile): NetworkingProfilePreview => {
  const displayName = compact(profile.fullName) ||
    compact(`${profile.firstName || ''} ${profile.lastName || ''}`) ||
    'Unknown User';
  const mutualConnections = Number(profile.mutualConnections) || 0;
  const recommendationScore = typeof profile.recommendationScore === 'number'
    ? Math.round(profile.recommendationScore)
    : typeof profile.alignment === 'number'
      ? Math.round(profile.alignment)
      : null;

  return {
    displayName,
    initials: getNetworkingProfileInitials(displayName),
    role: compact(profile.currentRole || profile.headline) || 'Professional',
    location: compact(profile.location) || 'Location unavailable',
    headline: compact(profile.headline) || undefined,
    summary: compact(profile.summary || profile.bio) || undefined,
    skills: uniqueValues(profile.skills || []).slice(0, 8),
    sharedSkills: uniqueValues(profile.sharedSkills || []).slice(0, 6),
    reasons: uniqueValues(profile.recommendationReasons || []).slice(0, 4),
    fitLabel: recommendationScore !== null ? `${recommendationScore}% fit` : undefined,
    mutualConnectionLabel: mutualConnections > 0
      ? `${mutualConnections} mutual ${mutualConnections === 1 ? 'connection' : 'connections'}`
      : undefined,
    profilePath: getNetworkingProfilePath(profile),
  };
};
