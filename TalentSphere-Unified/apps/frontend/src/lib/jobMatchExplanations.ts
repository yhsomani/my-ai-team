import type { Job } from '../types/job';

export interface JobMatchProfileCandidate {
  location?: string | null;
  skills?: Array<{ name?: string | null } | string> | null;
}

export interface JobMatchExplanation {
  label: string;
  reasons: string[];
  matchedSkills: string[];
  missingSignals: string[];
  hasProfileSignals: boolean;
}

const compact = (value?: string | null) => (value || '').trim();

const uniqueValues = (values: string[]) => Array.from(new Set(
  values.map(value => compact(value)).filter(Boolean)
));

const normalizeSkill = (value: string) => compact(value).toLowerCase().replace(/\s+/g, ' ');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesSkill = (text: string, skill: string) => {
  const normalizedSkill = normalizeSkill(skill);
  if (!normalizedSkill) return false;

  const pattern = new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(normalizedSkill)}([^a-z0-9+#]|$)`, 'i');
  return pattern.test(text);
};

const getProfileSkills = (profile?: JobMatchProfileCandidate | null) => uniqueValues(
  (Array.isArray(profile?.skills) ? profile.skills : [])
    .map(skill => (typeof skill === 'string' ? skill : skill?.name || ''))
);

const getJobRequirements = (job: Pick<Job, 'requirements'>) => (
  Array.isArray(job.requirements)
    ? job.requirements.map(requirement => compact(String(requirement))).filter(Boolean)
    : []
);

const getJobSearchText = (job: Pick<Job, 'title' | 'description' | 'requirements'>) => [
  job.title,
  job.description,
  ...getJobRequirements(job),
].map(value => compact(value).toLowerCase()).join(' ');

const isLocationMatch = (jobLocation?: string, profileLocation?: string | null) => {
  const normalizedJobLocation = compact(jobLocation).toLowerCase();
  const normalizedProfileLocation = compact(profileLocation).toLowerCase();
  if (!normalizedJobLocation || !normalizedProfileLocation) return false;
  if (normalizedJobLocation.includes('remote')) return true;

  return normalizedJobLocation.includes(normalizedProfileLocation) ||
    normalizedProfileLocation.includes(normalizedJobLocation);
};

export const buildJobMatchExplanation = (
  job: Job,
  profile?: JobMatchProfileCandidate | null
): JobMatchExplanation => {
  const profileSkills = getProfileSkills(profile);
  const jobText = getJobSearchText(job);
  const requirements = getJobRequirements(job);
  const matchedSkills = profileSkills.filter(skill => includesSkill(jobText, skill)).slice(0, 4);
  const reasons: string[] = [];
  const missingSignals: string[] = [];

  if (matchedSkills.length > 0) {
    reasons.push(`${matchedSkills.length} profile ${matchedSkills.length === 1 ? 'skill' : 'skills'} found: ${matchedSkills.join(', ')}`);
  }

  if (isLocationMatch(job.location, profile?.location)) {
    reasons.push(job.location?.toLowerCase().includes('remote')
      ? 'Remote-friendly location'
      : 'Matches your profile location');
  }

  if (requirements.length > 0) {
    reasons.push(`${requirements.length} listed ${requirements.length === 1 ? 'requirement' : 'requirements'} to review before applying`);
  }

  if (profileSkills.length === 0) {
    missingSignals.push('Add skills to your profile for tailored match reasons');
  } else if (matchedSkills.length === 0) {
    missingSignals.push('No profile skill overlap found in the visible requirements');
  }

  if (!compact(profile?.location)) {
    missingSignals.push('Add profile location for location-aware reasons');
  }

  return {
    label: matchedSkills.length >= 3
      ? 'Strong profile overlap'
      : matchedSkills.length > 0
        ? 'Profile overlap'
        : 'Review fit',
    reasons: reasons.slice(0, 3),
    matchedSkills,
    missingSignals,
    hasProfileSignals: profileSkills.length > 0 || Boolean(compact(profile?.location)),
  };
};
