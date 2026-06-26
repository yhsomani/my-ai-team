import { describe, expect, it } from 'vitest';
import {
  buildNetworkingProfilePreview,
  getNetworkingProfileInitials,
  getNetworkingProfilePath,
} from './networkingProfilePreview';

describe('networkingProfilePreview', () => {
  it('builds compact profile preview fields from networking profile data', () => {
    const preview = buildNetworkingProfilePreview({
      id: 'profile-1',
      userId: 'user-1',
      fullName: 'Ada Lovelace',
      currentRole: 'Machine Learning Engineer',
      headline: 'Builds explainable AI systems',
      location: 'London',
      skills: ['TypeScript', 'AI', 'TypeScript', ''],
      sharedSkills: ['AI', 'Product'],
      recommendationScore: 91.4,
      mutualConnections: 2,
      recommendationReasons: ['Shares AI', 'Based in London'],
    });

    expect(preview).toMatchObject({
      displayName: 'Ada Lovelace',
      initials: 'AL',
      role: 'Machine Learning Engineer',
      location: 'London',
      fitLabel: '91% fit',
      mutualConnectionLabel: '2 mutual connections',
      profilePath: '/profile/user-1',
    });
    expect(preview.skills).toEqual(['TypeScript', 'AI']);
    expect(preview.reasons).toEqual(['Shares AI', 'Based in London']);
  });

  it('uses safe fallbacks for sparse profiles', () => {
    const preview = buildNetworkingProfilePreview({ id: 'profile-2' });

    expect(preview.displayName).toBe('Unknown User');
    expect(preview.initials).toBe('UU');
    expect(preview.role).toBe('Professional');
    expect(preview.location).toBe('Location unavailable');
    expect(preview.profilePath).toBe('/profile/profile-2');
  });

  it('returns stable initials and profile paths', () => {
    expect(getNetworkingProfileInitials('Grace Brewster Hopper')).toBe('GB');
    expect(getNetworkingProfileInitials('')).toBe('U');
    expect(getNetworkingProfilePath({ id: 'profile-3', userId: 'user-3' })).toBe('/profile/user-3');
    expect(getNetworkingProfilePath(null)).toBe('');
  });
});
