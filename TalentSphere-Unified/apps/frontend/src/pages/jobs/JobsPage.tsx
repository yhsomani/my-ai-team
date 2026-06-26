import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Briefcase, Building2, Filter, DollarSign, CheckCircle2, Circle, XCircle, Bookmark, BookmarkCheck, Trash2, Sparkles, Eraser, Bell, BellOff, ChevronLeft, ChevronRight, Pencil, Clock, EyeOff, Undo2, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { applicationService } from '../../services/applicationService';
import type { ApplicationDraftRecord, ApplicationDraftSource } from '../../services/applicationService';
import { getJobPublishPolicyErrorMessage, jobService, type SavedJobSearchRecord } from '../../services/jobService';
import { notificationService } from '../../services/notificationService';
import { profileService } from '../../services/profileService';
import { recruiterService } from '../../services/recruiterService';
import { settingsService } from '../../services/settingsService';
import { notificationDigestService } from '../../services/notificationDigestService';
import { ApplicationStatusEvent, Job, JobApplication } from '../../types/job';
import { buildRecruiterPostingPublishIssues } from '../../lib/jobPostReview';
import {
    appendApplicationDraftHistory,
    mergeApplicationDraftHistories,
    sanitizeApplicationDraftHistory,
    type ApplicationDraftHistoryEntry,
    type ApplicationDraftHistoryReason,
} from '../../lib/applicationDraftHistory';
import {
    buildApplicationAiDraftSuggestion,
    getApplicationAiDraftFormPatch,
    hasApplicationAiDraftFields,
    type ApplicationAiDraftSource,
} from '../../lib/applicationAiDrafts';
import { recordAiWorkflowPrefillDecision } from '../../lib/aiWorkflowPrefillAudit';
import { recordRecruiterPublishAnalytics } from '../../lib/recruiterPublishAnalytics';
import { buildJobMatchExplanation } from '../../lib/jobMatchExplanations';
import { recordJobRecommendationPreferenceAnalytics } from '../../lib/jobRecommendationPreferenceAnalytics';
import { recordSavedSearchAnalytics } from '../../lib/savedSearchAnalytics';
import { recordApplicationWorkflowAnalytics } from '../../lib/applicationWorkflowAnalytics';
import {
    buildHiddenExplorePreferenceInsights,
    getHiddenExploreJobTypeLabel,
    normalizeHiddenExploreJobType,
    type HiddenExplorePreferenceInsight,
} from '../../lib/hiddenExplorePreferenceInsights';
import {
    getHiddenExploreJobsStorageKey,
    hideExploreJobPreference,
    mergeHiddenExploreJobs,
    restoreHiddenExploreJobPreference,
    sanitizeHiddenExploreJobs,
    type HiddenExploreJob,
} from '../../lib/hiddenExploreJobs';
import {
    getLowerPriorityNotificationDelivery,
    normalizeNotificationDigestFrequency,
    type NotificationDigestFrequency,
} from '../../lib/notificationPreferences';
import { useAppSelector } from '../../store/hooks';
import { useGetJobsPageQuery, useGetJobsQuery } from '../../store/slices/jobSlice';
import type { RootState } from '../../store';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/AuraButton';
import Card from '../../components/shared/GlassCard';
import { Skeleton } from '../../components/shared/Skeleton';
import { Tabs } from '../../components/shared/Tabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { AuraModal } from '../../components/shared/AuraModal';
import { Input } from '../../components/shared/AuraInput';
import { useToast } from '../../components/shared/Toast';

const jobTypeOptions = [
    { value: '', label: 'All types' },
    { value: 'FULL_TIME', label: 'Full-time' },
    { value: 'PART_TIME', label: 'Part-time' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'FREELANCE', label: 'Freelance' },
    { value: 'INTERNSHIP', label: 'Internship' },
];

const jobsPageSizeOptions = [6, 12, 24];
const defaultJobsPageSize = 12;
const applicationDraftHistoryLimit = 5;
const maxLocalApplicationDraftHistoryItems = 50;

type JobFilters = {
    jobType: string;
    location: string;
    minSalary: string;
    maxSalary: string;
};

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';
type JobsTab = 'explore' | 'applied' | 'postings';

type SavedJobSearch = SavedJobSearchRecord;

type ApplicationDraft = {
    resumeUrl: string;
    coverLetter: string;
};

type ApplicationDraftMeta = {
    source: ApplicationDraftSource | 'unavailable' | 'error';
    message: string;
};

type JobsRouteState = {
    aiApplicationDraft?: ApplicationAiDraftSource;
} | null;

type SavedApplicationDraft = ApplicationDraft & {
    jobId: string;
    updatedAt: string;
    source: ApplicationDraftSource;
};

const emptyJobFilters: JobFilters = {
    jobType: '',
    location: '',
    minSalary: '',
    maxSalary: '',
};

const emptyApplicationDraft: ApplicationDraft = {
    resumeUrl: '',
    coverLetter: '',
};

const defaultApplicationDraftMeta: ApplicationDraftMeta = {
    source: 'manual',
    message: 'Add details manually or reuse your profile as an editable draft.',
};

const normalizeJobType = (value?: string) => value?.toUpperCase().replace(/[\s-]+/g, '_') || '';

const getJobTypeLabel = (value?: string) => {
    const normalized = normalizeJobType(value);
    return jobTypeOptions.find(option => option.value === normalized)?.label || value || 'Job type';
};

const parseSalaryFilter = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const formatSalary = (job: Record<string, any>) => {
    const min = job.salaryMin ?? job.salary_min;
    const max = job.salaryMax ?? job.salary_max;
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `From ${formatter.format(min)}`;
    if (max) return `Up to ${formatter.format(max)}`;
    return null;
};

const getSavedSearchSignature = (searchTerm: string, filters: JobFilters) => JSON.stringify({
    searchTerm: searchTerm.trim(),
    filters,
});

const getMatchingJobsForSearch = (jobs: Job[], savedSearch: Pick<SavedJobSearch, 'searchTerm' | 'filters'>) => {
    const lowerSearch = savedSearch.searchTerm.trim().toLowerCase();
    const location = savedSearch.filters.location.trim().toLowerCase();
    const minSalary = parseSalaryFilter(savedSearch.filters.minSalary);
    const maxSalary = parseSalaryFilter(savedSearch.filters.maxSalary);

    return jobs.filter(job => {
        const salaryFloor = job.salaryMax ?? job.salaryMin;
        const salaryCeiling = job.salaryMin ?? job.salaryMax;
        const matchesSearch = !lowerSearch ||
            job.title.toLowerCase().includes(lowerSearch) ||
            job.description?.toLowerCase().includes(lowerSearch) ||
            job.companyName?.toLowerCase().includes(lowerSearch);
        const matchesType = !savedSearch.filters.jobType || normalizeJobType(job.jobType) === savedSearch.filters.jobType;
        const matchesLocation = !location || job.location?.toLowerCase().includes(location);
        const matchesMinSalary = minSalary === undefined ||
            (salaryFloor !== undefined && salaryFloor >= minSalary);
        const matchesMaxSalary = maxSalary === undefined ||
            (salaryCeiling !== undefined && salaryCeiling <= maxSalary);

        return matchesSearch && matchesType && matchesLocation && matchesMinSalary && matchesMaxSalary;
    });
};

const applicationSteps: Array<{ status: JobApplication['status']; label: string; description: string }> = [
    { status: 'PENDING', label: 'Submitted', description: 'Application sent to the recruiter' },
    { status: 'REVIEWED', label: 'Reviewed', description: 'Recruiter reviewed your profile' },
    { status: 'INTERVIEW', label: 'Interview', description: 'Interview stage or scheduling' },
    { status: 'OFFER', label: 'Offer', description: 'Offer or final selection stage' },
];

const getApplicationStatusVariant = (status?: string) => {
    switch (status) {
        case 'OFFER': return 'success';
        case 'REJECTED': return 'destructive';
        case 'INTERVIEW':
        case 'REVIEWED':
            return 'outline';
        default:
            return 'warning';
    }
};

const formatApplicationDate = (date?: string) => {
    if (!date) return 'Not available';
    return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatDraftSavedAt = (date?: string | null) => {
    if (!date) return '';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const getApplicationDraftHistoryReasonLabel = (reason: ApplicationDraftHistoryReason) => {
    switch (reason) {
        case 'profile_applied':
            return 'Profile draft';
        case 'ai_applied':
            return 'AI draft';
        case 'restored':
            return 'Restored';
        case 'cleared':
            return 'Before clear';
        default:
            return 'Autosaved';
    }
};

const getProfileName = (profile: Record<string, any> | null, user?: { email?: string; full_name?: string } | null) => {
    return profile?.fullName ||
        profile?.full_name ||
        profile?.profiles?.full_name ||
        [profile?.profiles?.first_name, profile?.profiles?.last_name].filter(Boolean).join(' ') ||
        user?.full_name ||
        user?.email?.split('@')[0] ||
        '';
};

const getProfileLink = (profile: Record<string, any> | null) => {
    const link = profile?.resumeUrl || profile?.resume_url || profile?.website || profile?.linkedinUrl || profile?.linkedin_url || profile?.githubUrl || profile?.github_url || '';
    return typeof link === 'string' && /^https?:\/\//i.test(link.trim()) ? link.trim() : '';
};

const getSkillName = (skill: Record<string, any> | string) => (
    typeof skill === 'string' ? skill : skill.name || skill.skill_name || ''
);

const getExperienceTitle = (experience: Record<string, any>) => experience.title || experience.role || experience.position || '';
const getExperienceCompany = (experience: Record<string, any>) => experience.company || experience.companyName || experience.company_name || '';

const getApplicationDraftFieldState = (draft: ApplicationDraft) => ({
    hasResumeUrl: Boolean(draft.resumeUrl.trim()),
    hasCoverLetter: Boolean(draft.coverLetter.trim()),
});

const buildProfileApplicationDraft = (
    job: Job,
    profile: Record<string, any> | null,
    user?: { email?: string; full_name?: string } | null
): ApplicationDraft => {
    const companyName = job.companyName || 'your team';
    const roleTitle = job.title || 'this role';
    const profileName = getProfileName(profile, user);
    const headline = profile?.headline || profile?.currentRole || profile?.current_role || '';
    const summary = profile?.summary || profile?.bio || '';
    const experiences = Array.isArray(profile?.experiences) ? profile.experiences : [];
    const latestExperience = experiences.find((experience: Record<string, any>) => experience.current) || experiences[0];
    const skillNames = (Array.isArray(profile?.skills) ? profile.skills : [])
        .map(getSkillName)
        .filter(Boolean)
        .slice(0, 5);
    const jobRequirements = Array.isArray(job.requirements) ? job.requirements.slice(0, 3) : [];
    const experienceTitle = latestExperience ? getExperienceTitle(latestExperience) : '';
    const experienceCompany = latestExperience ? getExperienceCompany(latestExperience) : '';
    const experienceDescription = latestExperience?.description || '';

    const paragraphs = [
        `Hello ${companyName} team,`,
        `I am interested in the ${roleTitle} opportunity${profileName ? ` and would like to share my background as ${profileName}` : ''}.`,
        headline ? `My profile is focused on ${headline}.` : '',
        summary ? summary : '',
        experienceTitle || experienceCompany
            ? `Most recently, I worked${experienceTitle ? ` as ${experienceTitle}` : ''}${experienceCompany ? ` at ${experienceCompany}` : ''}${experienceDescription ? `, where ${experienceDescription}` : '.'}`
            : '',
        skillNames.length > 0 ? `Relevant skills I would bring include ${skillNames.join(', ')}.` : '',
        jobRequirements.length > 0 ? `I noticed the role emphasizes ${jobRequirements.join(', ')}, and I would be glad to discuss how my experience maps to those needs.` : '',
        `Thank you for reviewing my application. I would welcome the chance to discuss how I can contribute to ${companyName}.`,
    ].filter(Boolean);

    return {
        resumeUrl: getProfileLink(profile),
        coverLetter: paragraphs.join('\n\n'),
    };
};

const getSavedSearchStorageKey = (userId?: string) => `talentsphere.savedJobSearches.${userId || 'guest'}`;
const getApplicationDraftStorageKey = (userId?: string) => `talentsphere.applicationDrafts.${userId || 'guest'}`;
const getApplicationDraftHistoryStorageKey = (userId?: string) => `talentsphere.applicationDraftHistory.${userId || 'guest'}`;

const getRecruiterPostingCompanyName = (job: Record<string, any>) => (
    job.companyName || job.company?.name || job.companies?.name || 'No company attached'
);

const getRecruiterPostingJobType = (job: Record<string, any>) => job.jobType || job.job_type;

const getRecruiterPostingStatusVariant = (status?: string): BadgeVariant => {
    switch ((status || '').toUpperCase()) {
        case 'PUBLISHED':
            return 'success';
        case 'DRAFT':
            return 'warning';
        default:
            return 'outline';
    }
};

const createSavedSearchId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    return `search-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const hasMatchingSavedSearch = (savedSearches: SavedJobSearch[], candidate: SavedJobSearch) => {
    const candidateSignature = getSavedSearchSignature(candidate.searchTerm, candidate.filters);

    return savedSearches.some(savedSearch => (
        savedSearch.id === candidate.id ||
        getSavedSearchSignature(savedSearch.searchTerm, savedSearch.filters) === candidateSignature
    ));
};

const getTabFromSearchParams = (searchParams: URLSearchParams): JobsTab => {
    const tab = searchParams.get('tab');
    return tab === 'applied' || tab === 'postings' ? tab : 'explore';
};

const sanitizeApplicationDrafts = (value: unknown): Record<string, SavedApplicationDraft> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return Object.entries(value as Record<string, Partial<SavedApplicationDraft>>).reduce<Record<string, SavedApplicationDraft>>((acc, [jobId, draft]) => {
        if (
            typeof draft?.jobId === 'string' &&
            typeof draft.resumeUrl === 'string' &&
            typeof draft.coverLetter === 'string' &&
            typeof draft.updatedAt === 'string'
        ) {
            acc[jobId] = {
                jobId: draft.jobId,
                resumeUrl: draft.resumeUrl,
                coverLetter: draft.coverLetter,
                updatedAt: draft.updatedAt,
                source: draft.source === 'profile' || draft.source === 'ai' ? draft.source : 'manual',
            };
        }

        return acc;
    }, {});
};

const toSavedApplicationDraft = (draft: ApplicationDraftRecord): SavedApplicationDraft => ({
    jobId: draft.jobId,
    resumeUrl: draft.resumeUrl,
    coverLetter: draft.coverLetter,
    updatedAt: draft.updatedAt,
    source: draft.source,
});

const isDraftNewer = (candidate?: { updatedAt?: string }, current?: { updatedAt?: string }) => {
    if (!candidate?.updatedAt) return false;
    if (!current?.updatedAt) return true;

    const candidateTime = new Date(candidate.updatedAt).getTime();
    const currentTime = new Date(current.updatedAt).getTime();

    if (Number.isNaN(candidateTime)) return false;
    if (Number.isNaN(currentTime)) return true;

    return candidateTime > currentTime;
};

const sanitizeSavedSearches = (value: unknown): SavedJobSearch[] => {
    if (!Array.isArray(value)) return [];

    return value
        .reduce<SavedJobSearch[]>((acc, item) => {
            const candidate = item as Partial<SavedJobSearch>;
            const isValid = Boolean(
                candidate &&
                    typeof candidate.id === 'string' &&
                    typeof candidate.name === 'string' &&
                    typeof candidate.searchTerm === 'string' &&
                    candidate.filters &&
                    typeof candidate.filters.jobType === 'string' &&
                    typeof candidate.filters.location === 'string' &&
                    typeof candidate.filters.minSalary === 'string' &&
                    typeof candidate.filters.maxSalary === 'string' &&
                    typeof candidate.createdAt === 'string'
            );

            if (!isValid || !candidate.filters) return acc;

            acc.push({
                id: candidate.id as string,
                name: candidate.name as string,
                searchTerm: candidate.searchTerm as string,
                filters: {
                    jobType: candidate.filters.jobType,
                    location: candidate.filters.location,
                    minSalary: candidate.filters.minSalary,
                    maxSalary: candidate.filters.maxSalary,
                },
                createdAt: candidate.createdAt as string,
                lastUsedAt: typeof candidate.lastUsedAt === 'string' ? candidate.lastUsedAt : undefined,
                alertEnabled: Boolean(candidate.alertEnabled),
                lastMatchCount: typeof candidate.lastMatchCount === 'number' && Number.isFinite(candidate.lastMatchCount)
                    ? Math.max(0, candidate.lastMatchCount)
                    : undefined,
                lastCheckedAt: typeof candidate.lastCheckedAt === 'string' ? candidate.lastCheckedAt : undefined,
            });

            return acc;
        }, [])
        .slice(0, 10);
};

const JobsPage: React.FC = () => {
    const { user } = useAppSelector((state: RootState) => state.auth);
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const routeState = location.state as JobsRouteState;
    const aiApplicationDraftState = routeState?.aiApplicationDraft;

    const [searchTerm, setSearchTerm] = useState('');
    const [jobFilters, setJobFilters] = useState<JobFilters>(emptyJobFilters);
    const [activeTab, setActiveTabState] = useState(() => getTabFromSearchParams(searchParams));
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [isLoadingApplications, setIsLoadingApplications] = useState(false);
    const [applicationsLoadError, setApplicationsLoadError] = useState<string | null>(null);
    const [recruiterJobs, setRecruiterJobs] = useState<Record<string, any>[]>([]);
    const [isLoadingRecruiterJobs, setIsLoadingRecruiterJobs] = useState(false);
    const [pendingPublishJob, setPendingPublishJob] = useState<Record<string, any> | null>(null);
    const [publishingJobId, setPublishingJobId] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
    const [applicationStatusEvents, setApplicationStatusEvents] = useState<Record<string, ApplicationStatusEvent[]>>({});
    const [isLoadingApplicationStatusEvents, setIsLoadingApplicationStatusEvents] = useState(false);
    const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>(emptyApplicationDraft);
    const [applicationDraftMeta, setApplicationDraftMeta] = useState<ApplicationDraftMeta>(defaultApplicationDraftMeta);
    const [applicationDraftProfile, setApplicationDraftProfile] = useState<Record<string, any> | null>(null);
    const [isApplicationDraftClearReviewOpen, setIsApplicationDraftClearReviewOpen] = useState(false);
    const [profileApplicationDraftReplaceReview, setProfileApplicationDraftReplaceReview] = useState<ApplicationDraft | null>(null);
    const [exploreProfile, setExploreProfile] = useState<Record<string, any> | null>(null);
    const [exploreProfileStatus, setExploreProfileStatus] = useState('');
    const [hiddenExploreJobs, setHiddenExploreJobs] = useState<HiddenExploreJob[]>([]);
    const [hiddenExploreJobsStatus, setHiddenExploreJobsStatus] = useState('');
    const [excludedExploreJobTypes, setExcludedExploreJobTypes] = useState<string[]>([]);
    const [pendingAiApplicationDraftSource, setPendingAiApplicationDraftSource] = useState<ApplicationAiDraftSource | null>(null);
    const [isLoadingApplicationDraft, setIsLoadingApplicationDraft] = useState(false);
    const [applicationDraftSavedAt, setApplicationDraftSavedAt] = useState<string | null>(null);
    const [applicationDraftHistory, setApplicationDraftHistory] = useState<ApplicationDraftHistoryEntry[]>([]);
    const applicationDraftTouchedRef = useRef(false);
    const applicationDraftShouldPersistRef = useRef(false);
    const applicationDraftSyncTimersRef = useRef<Record<string, number>>({});
    const applicationDraftHistorySyncTimersRef = useRef<Record<string, number>>({});
    const applicationDraftSyncWarningRef = useRef(false);
    const [savedSearches, setSavedSearches] = useState<SavedJobSearch[]>([]);
    const [jobAlertsEnabled, setJobAlertsEnabled] = useState(true);
    const [jobAlertDigestFrequency, setJobAlertDigestFrequency] = useState<NotificationDigestFrequency>('immediate');
    const [isSaveSearchModalOpen, setIsSaveSearchModalOpen] = useState(false);
    const [savedSearchName, setSavedSearchName] = useState('');
    const [savedSearchAlertEnabled, setSavedSearchAlertEnabled] = useState(false);
    const [savedSearchDeleteReview, setSavedSearchDeleteReview] = useState<SavedJobSearch | null>(null);
    const [jobsPage, setJobsPage] = useState(1);
    const [jobsPageSize, setJobsPageSize] = useState(defaultJobsPageSize);
    const [jobsPageCursors, setJobsPageCursors] = useState<Record<number, string>>({});
    const [knownJobsTotal, setKnownJobsTotal] = useState<number | null>(null);
    const savedSearchNotificationStateRef = useRef<Record<string, string>>({});
    const savedSearchNotificationWarningRef = useRef(false);
    const savedSearchDigestNoticeRef = useRef(false);
    const savedSearchDigestQueueWarningRef = useRef(false);
    const hiddenExploreJobsSyncWarningRef = useRef(false);
    const minSalary = parseSalaryFilter(jobFilters.minSalary);
    const maxSalary = parseSalaryFilter(jobFilters.maxSalary);
    const savedSearchStorageKey = useMemo(() => getSavedSearchStorageKey(user?.id), [user?.id]);
    const hiddenExploreJobsStorageKey = useMemo(() => getHiddenExploreJobsStorageKey(user?.id), [user?.id]);
    const applicationDraftStorageKey = useMemo(() => getApplicationDraftStorageKey(user?.id), [user?.id]);
    const applicationDraftHistoryStorageKey = useMemo(() => getApplicationDraftHistoryStorageKey(user?.id), [user?.id]);
    const savedSearchAlertQueryParams = useMemo(() => ({ limit: 100 }), []);
    const isRecruiter = Boolean(user?.roles?.includes('ROLE_RECRUITER'));

    const setActiveTab = useCallback((nextTab: string) => {
        const normalizedTab = nextTab === 'applied' || nextTab === 'postings' ? nextTab : 'explore';
        const nextParams = new URLSearchParams(searchParams);

        setActiveTabState(normalizedTab);

        if (normalizedTab === 'applied' || normalizedTab === 'postings') {
            nextParams.set('tab', normalizedTab);
        } else {
            nextParams.delete('tab');
        }

        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const nextTab = getTabFromSearchParams(searchParams);
        setActiveTabState(currentTab => currentTab === nextTab ? currentTab : nextTab);
    }, [searchParams]);

    useEffect(() => {
        if (!isRecruiter && activeTab === 'postings') {
            setActiveTab('explore');
        }
    }, [activeTab, isRecruiter, setActiveTab]);

    useEffect(() => {
        if (!aiApplicationDraftState?.recommendationText) return;

        navigate({
            pathname: location.pathname,
            search: location.search,
        }, { replace: true, state: null });

        const draft = buildApplicationAiDraftSuggestion(emptyApplicationDraft, aiApplicationDraftState);
        if (!hasApplicationAiDraftFields(draft)) {
            addToast({
                type: 'info',
                title: 'Jobs opened',
                message: 'The AI recommendation did not include structured Resume URL or Cover Letter fields to pre-fill.',
            });
            return;
        }

        setPendingAiApplicationDraftSource(aiApplicationDraftState);
        setActiveTab('explore');
        addToast({
            type: 'info',
            title: 'AI application draft ready',
            message: 'Choose a job, then review the AI draft before applying it.',
        });
    }, [addToast, aiApplicationDraftState, location.pathname, location.search, navigate, setActiveTab]);

    const jobQueryParams = useMemo(() => {
        const params: Record<string, string | number> = {};
        const search = searchTerm.trim();

        if (search) params.search = search;
        if (jobFilters.jobType) params.job_type = jobFilters.jobType;
        if (jobFilters.location.trim()) params.location = jobFilters.location.trim();
        if (minSalary !== undefined) params.salary_min = minSalary;
        if (maxSalary !== undefined) params.salary_max = maxSalary;

        return params;
    }, [jobFilters.jobType, jobFilters.location, minSalary, maxSalary, searchTerm]);

    const currentJobsCursor = jobsPage > 1 ? jobsPageCursors[jobsPage] : undefined;
    const jobPageQueryParams = useMemo(() => ({
        ...jobQueryParams,
        limit: jobsPageSize,
        offset: (jobsPage - 1) * jobsPageSize,
        ...(currentJobsCursor ? { cursor: currentJobsCursor } : {}),
    }), [jobQueryParams, jobsPage, jobsPageSize, currentJobsCursor]);

    const {
        data: jobsPageData,
        isLoading: jobsLoading,
        isFetching: jobsFetching,
        refetch: refetchJobs,
    } = useGetJobsPageQuery(jobPageQueryParams);
    const jobs = jobsPageData?.jobs || [];
    const { data: savedSearchAlertJobs = [] } = useGetJobsQuery(savedSearchAlertQueryParams, {
        skip: savedSearches.length === 0,
    });

    const loadApplications = useCallback(async (userId: string) => {
        setIsLoadingApplications(true);
        setApplicationsLoadError(null);
        try {
            const data = await applicationService.getUserApplications(userId);
            setApplications(data);
        } catch (error) {
            console.error('Failed to load applications:', error);
            setApplicationsLoadError('Applications could not be loaded. Retry to check your submitted applications.');
            addToast({ type: 'error', title: 'Applications unavailable', message: 'Submitted applications could not be loaded. Please retry.' });
        } finally {
            setIsLoadingApplications(false);
        }
    }, [addToast]);

    const loadRecruiterJobs = useCallback(async () => {
        if (!user?.id || !isRecruiter) return;

        setIsLoadingRecruiterJobs(true);
        try {
            const jobs = await recruiterService.getRecruiterJobs(user.id);
            setRecruiterJobs(jobs);
        } catch (error) {
            console.error('Failed to load recruiter postings:', error);
            addToast({ type: 'error', title: 'Postings unavailable', message: 'Recruiter postings could not be loaded.' });
        } finally {
            setIsLoadingRecruiterJobs(false);
        }
    }, [addToast, isRecruiter, user?.id]);

    useEffect(() => {
        if (activeTab === 'explore') {
            refetchJobs();
        }
    }, [activeTab, refetchJobs]);

    useEffect(() => {
        if (activeTab !== 'explore') return;

        if (!user?.id) {
            setExploreProfile(null);
            setExploreProfileStatus('');
            return;
        }

        let isActive = true;
        const loadExploreProfile = async () => {
            try {
                const profile = await profileService.getProfile(user.id);
                if (!isActive) return;
                setExploreProfile(profile);
                setExploreProfileStatus('');
            } catch (error) {
                console.warn('Profile match reasons unavailable:', error);
                if (!isActive) return;
                setExploreProfile(null);
                setExploreProfileStatus('Profile match reasons are unavailable. Job cards still show visible requirements and application actions.');
            }
        };

        void loadExploreProfile();

        return () => {
            isActive = false;
        };
    }, [activeTab, user?.id]);

    useEffect(() => {
        if (activeTab === 'postings') {
            void loadRecruiterJobs();
        }
    }, [activeTab, loadRecruiterJobs]);

    useEffect(() => {
        if (!user?.id) {
            setJobAlertsEnabled(true);
            setJobAlertDigestFrequency('immediate');
            return;
        }

        let isActive = true;
        const loadJobAlertPreference = async () => {
            try {
                const notificationSettings = await settingsService.getNotifications(user.id);
                if (isActive) {
                    setJobAlertsEnabled(notificationSettings?.job_alerts ?? true);
                    setJobAlertDigestFrequency(normalizeNotificationDigestFrequency(notificationSettings?.digest_frequency));
                }
            } catch (error) {
                console.warn('Using default job alert preference:', error);
                if (isActive) {
                    setJobAlertsEnabled(true);
                    setJobAlertDigestFrequency('immediate');
                }
            }
        };

        void loadJobAlertPreference();

        return () => {
            isActive = false;
        };
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            loadApplications(user.id);
        }
    }, [loadApplications, user?.id]);

    useEffect(() => {
        if (!selectedApplication?.id) return;

        let isActive = true;
        const loadStatusEvents = async () => {
            setIsLoadingApplicationStatusEvents(true);
            const events = await applicationService.getApplicationStatusEvents(selectedApplication.id);

            if (isActive) {
                setApplicationStatusEvents(prev => ({
                    ...prev,
                    [selectedApplication.id]: events,
                }));
                setIsLoadingApplicationStatusEvents(false);
            }
        };

        loadStatusEvents();

        return () => {
            isActive = false;
        };
    }, [selectedApplication?.id]);

    const readHiddenExploreJobs = useCallback(() => {
        try {
            const stored = window.localStorage.getItem(hiddenExploreJobsStorageKey);
            return stored ? sanitizeHiddenExploreJobs(JSON.parse(stored)) : [];
        } catch (error) {
            console.error('Failed to load hidden Explore jobs:', error);
            return [];
        }
    }, [hiddenExploreJobsStorageKey]);

    const persistHiddenExploreJobs = useCallback((nextHiddenJobs: HiddenExploreJob[]) => {
        const sanitizedHiddenJobs = sanitizeHiddenExploreJobs(nextHiddenJobs);
        setHiddenExploreJobs(sanitizedHiddenJobs);

        try {
            window.localStorage.setItem(hiddenExploreJobsStorageKey, JSON.stringify(sanitizedHiddenJobs));
        } catch (error) {
            console.error('Failed to save hidden Explore jobs:', error);
            addToast({
                type: 'warning',
                title: 'Visibility preference not saved',
                message: 'This job is hidden for now, but your browser blocked local storage.',
            });
        }

        return sanitizedHiddenJobs;
    }, [addToast, hiddenExploreJobsStorageKey]);

    const warnHiddenExploreJobsSyncUnavailable = useCallback(() => {
        if (hiddenExploreJobsSyncWarningRef.current) return;

        hiddenExploreJobsSyncWarningRef.current = true;
        addToast({
            type: 'warning',
            title: 'Hidden jobs saved locally',
            message: 'Account sync is unavailable. Your hidden Explore jobs are still stored in this browser.',
        });
    }, [addToast]);

    const syncHiddenExploreJob = useCallback(async (hiddenJob: HiddenExploreJob) => {
        if (!user?.id) return;

        try {
            await jobService.saveHiddenExploreJob(user.id, hiddenJob);
            hiddenExploreJobsSyncWarningRef.current = false;
        } catch (error) {
            console.warn('Hidden Explore job stored locally only:', error);
            warnHiddenExploreJobsSyncUnavailable();
        }
    }, [user?.id, warnHiddenExploreJobsSyncUnavailable]);

    const syncHiddenExploreJobDelete = useCallback(async (jobId: string) => {
        if (!user?.id) return;

        try {
            await jobService.deleteHiddenExploreJob(user.id, jobId);
            hiddenExploreJobsSyncWarningRef.current = false;
        } catch (error) {
            console.warn('Hidden Explore job restore stored locally only:', error);
            warnHiddenExploreJobsSyncUnavailable();
        }
    }, [user?.id, warnHiddenExploreJobsSyncUnavailable]);

    const syncHiddenExploreJobsClear = useCallback(async () => {
        if (!user?.id) return;

        try {
            await jobService.clearHiddenExploreJobs(user.id);
            hiddenExploreJobsSyncWarningRef.current = false;
        } catch (error) {
            console.warn('Hidden Explore jobs restore-all stored locally only:', error);
            warnHiddenExploreJobsSyncUnavailable();
        }
    }, [user?.id, warnHiddenExploreJobsSyncUnavailable]);

    useEffect(() => {
        const localHiddenJobs = readHiddenExploreJobs();
        setHiddenExploreJobs(localHiddenJobs);
        setHiddenExploreJobsStatus('');

        if (!user?.id) {
            hiddenExploreJobsSyncWarningRef.current = false;
            return;
        }

        let isActive = true;
        const loadAccountHiddenExploreJobs = async () => {
            try {
                const accountHiddenJobs = await jobService.getHiddenExploreJobs(user.id);
                if (!isActive) return;

                const mergedHiddenJobs = mergeHiddenExploreJobs(accountHiddenJobs, localHiddenJobs);
                persistHiddenExploreJobs(mergedHiddenJobs);

                const accountHiddenJobSignatures = new Map(accountHiddenJobs.map(hiddenJob => [
                    hiddenJob.jobId,
                    `${hiddenJob.title}:${hiddenJob.companyName || ''}:${hiddenJob.jobType || ''}:${hiddenJob.location || ''}:${hiddenJob.hiddenAt}`,
                ]));

                mergedHiddenJobs.forEach(hiddenJob => {
                    const signature = `${hiddenJob.title}:${hiddenJob.companyName || ''}:${hiddenJob.jobType || ''}:${hiddenJob.location || ''}:${hiddenJob.hiddenAt}`;
                    if (accountHiddenJobSignatures.get(hiddenJob.jobId) !== signature) {
                        jobService.saveHiddenExploreJob(user.id, hiddenJob).catch(error => {
                            console.warn('Unable to backfill hidden Explore job preference:', error);
                        });
                    }
                });

                hiddenExploreJobsSyncWarningRef.current = false;
            } catch (error) {
                console.warn('Using local hidden Explore jobs fallback:', error);
            }
        };

        void loadAccountHiddenExploreJobs();

        return () => {
            isActive = false;
        };
    }, [persistHiddenExploreJobs, readHiddenExploreJobs, user?.id]);

    const readLocalSavedSearches = useCallback(() => {
        try {
            const stored = window.localStorage.getItem(savedSearchStorageKey);
            return stored ? sanitizeSavedSearches(JSON.parse(stored)) : [];
        } catch (error) {
            console.error('Failed to load saved job searches:', error);
            return [];
        }
    }, [savedSearchStorageKey]);

    const writeLocalSavedSearches = useCallback((nextSearches: SavedJobSearch[]) => {
        const limitedSearches = nextSearches.slice(0, 10);

        try {
            window.localStorage.setItem(savedSearchStorageKey, JSON.stringify(limitedSearches));
        } catch (error) {
            console.error('Failed to save job searches:', error);
            addToast({ type: 'error', title: 'Saved search not stored', message: 'Your browser blocked local storage for this search.' });
        }
    }, [addToast, savedSearchStorageKey]);

    useEffect(() => {
        const localSearches = readLocalSavedSearches();
        setSavedSearches(localSearches);

        if (!user?.id) return;

        let isActive = true;
        const loadServerSavedSearches = async () => {
            try {
                const serverSearches = await jobService.getSavedSearches(user.id);
                if (!isActive) return;

                const mergedSearches = [
                    ...serverSearches,
                    ...localSearches.filter(localSearch => !hasMatchingSavedSearch(serverSearches, localSearch))
                ].slice(0, 10);

                setSavedSearches(mergedSearches);
                writeLocalSavedSearches(mergedSearches);

                localSearches
                    .filter(localSearch => !hasMatchingSavedSearch(serverSearches, localSearch))
                    .forEach(localSearch => {
                        jobService.saveSavedSearch(user.id, localSearch).catch(error => {
                            console.warn('Unable to backfill local saved search to server:', error);
                        });
                    });
            } catch (error) {
                console.warn('Using local saved job searches fallback:', error);
            }
        };

        loadServerSavedSearches();

        return () => {
            isActive = false;
        };
    }, [readLocalSavedSearches, user?.id, writeLocalSavedSearches]);

    const persistSavedSearches = useCallback((nextSearches: SavedJobSearch[]) => {
        const limitedSearches = nextSearches.slice(0, 10);
        setSavedSearches(limitedSearches);
        writeLocalSavedSearches(limitedSearches);
    }, [writeLocalSavedSearches]);

    const syncSavedSearch = useCallback(async (savedSearch: SavedJobSearch) => {
        if (!user?.id) return;

        try {
            const syncedSearch = await jobService.saveSavedSearch(user.id, savedSearch);
            setSavedSearches(prev => {
                const nextSearches = prev.map(item => item.id === syncedSearch.id ? syncedSearch : item);
                writeLocalSavedSearches(nextSearches);
                return nextSearches;
            });
        } catch (error) {
            console.warn('Saved search stored locally only:', error);
            addToast({ type: 'warning', title: 'Saved locally', message: 'Server saved-search sync is unavailable.' });
        }
    }, [addToast, user?.id, writeLocalSavedSearches]);

    const syncSavedSearchDelete = useCallback(async (savedSearchId: string) => {
        if (!user?.id) return;

        try {
            await jobService.deleteSavedSearch(user.id, savedSearchId);
        } catch (error) {
            console.warn('Saved search delete stored locally only:', error);
            addToast({ type: 'warning', title: 'Deleted locally', message: 'Server saved-search sync is unavailable.' });
        }
    }, [addToast, user?.id]);

    const readApplicationDrafts = useCallback(() => {
        try {
            const stored = window.localStorage.getItem(applicationDraftStorageKey);
            return stored ? sanitizeApplicationDrafts(JSON.parse(stored)) : {};
        } catch (error) {
            console.error('Failed to load application drafts:', error);
            return {};
        }
    }, [applicationDraftStorageKey]);

    const writeApplicationDrafts = useCallback((nextDrafts: Record<string, SavedApplicationDraft>) => {
        try {
            window.localStorage.setItem(applicationDraftStorageKey, JSON.stringify(nextDrafts));
        } catch (error) {
            console.error('Failed to save application draft:', error);
            addToast({ type: 'error', title: 'Draft not saved', message: 'Your browser blocked local storage for this application draft.' });
        }
    }, [addToast, applicationDraftStorageKey]);

    const readAllApplicationDraftHistory = useCallback(() => {
        try {
            const stored = window.localStorage.getItem(applicationDraftHistoryStorageKey);
            return stored
                ? sanitizeApplicationDraftHistory(JSON.parse(stored), {
                    userId: user?.id || 'guest',
                    maxItems: maxLocalApplicationDraftHistoryItems,
                })
                : [];
        } catch (error) {
            console.error('Failed to load application draft history:', error);
            return [];
        }
    }, [applicationDraftHistoryStorageKey, user?.id]);

    const readApplicationDraftHistory = useCallback((jobId: string) => (
        sanitizeApplicationDraftHistory(readAllApplicationDraftHistory(), {
            userId: user?.id || 'guest',
            jobId,
            maxItems: applicationDraftHistoryLimit,
        })
    ), [readAllApplicationDraftHistory, user?.id]);

    const writeApplicationDraftHistory = useCallback((jobId: string, nextHistory: ApplicationDraftHistoryEntry[]) => {
        try {
            const existingHistory = readAllApplicationDraftHistory();
            const nextAllHistory = sanitizeApplicationDraftHistory([
                ...nextHistory,
                ...existingHistory.filter(entry => entry.jobId !== jobId),
            ], {
                userId: user?.id || 'guest',
                maxItems: maxLocalApplicationDraftHistoryItems,
            });
            window.localStorage.setItem(applicationDraftHistoryStorageKey, JSON.stringify(nextAllHistory));

            if (selectedJob?.id === jobId) {
                setApplicationDraftHistory(nextHistory);
            }
        } catch (error) {
            console.error('Failed to save application draft history:', error);
            addToast({ type: 'error', title: 'Draft history not saved', message: 'Your browser blocked local draft history storage.' });
        }
    }, [addToast, applicationDraftHistoryStorageKey, readAllApplicationDraftHistory, selectedJob?.id, user?.id]);

    const warnApplicationDraftSyncUnavailable = useCallback(() => {
        if (applicationDraftSyncWarningRef.current) return;

        applicationDraftSyncWarningRef.current = true;
        addToast({ type: 'warning', title: 'Draft sync unavailable', message: 'Your local draft state was updated, but account sync is unavailable.' });
    }, [addToast]);

    const syncApplicationDraftHistoryEntry = useCallback(async (entry: ApplicationDraftHistoryEntry) => {
        if (!user?.id || entry.userId !== user.id) return;

        try {
            await applicationService.saveApplicationDraftHistoryEntry(entry);
            applicationDraftSyncWarningRef.current = false;
        } catch (error) {
            console.warn('Application draft history stored locally only:', error);
            warnApplicationDraftSyncUnavailable();
        }
    }, [user?.id, warnApplicationDraftSyncUnavailable]);

    const scheduleApplicationDraftHistorySync = useCallback((entry: ApplicationDraftHistoryEntry) => {
        if (!user?.id || entry.userId !== user.id) return;

        if (applicationDraftHistorySyncTimersRef.current[entry.id]) {
            window.clearTimeout(applicationDraftHistorySyncTimersRef.current[entry.id]);
        }

        applicationDraftHistorySyncTimersRef.current[entry.id] = window.setTimeout(() => {
            void syncApplicationDraftHistoryEntry(entry);
            delete applicationDraftHistorySyncTimersRef.current[entry.id];
        }, 1200);
    }, [syncApplicationDraftHistoryEntry, user?.id]);

    const recordApplicationDraftHistory = useCallback((
        jobId: string,
        draft: ApplicationDraft,
        source: ApplicationDraftSource,
        reason: ApplicationDraftHistoryReason = 'autosave'
    ) => {
        const currentHistory = readApplicationDraftHistory(jobId);
        const nextHistory = appendApplicationDraftHistory(currentHistory, {
            userId: user?.id || 'guest',
            jobId,
            resumeUrl: draft.resumeUrl,
            coverLetter: draft.coverLetter,
            source,
            reason,
            createdAt: new Date().toISOString(),
        }, {
            maxItems: applicationDraftHistoryLimit,
        });

        const unchanged = nextHistory.length === currentHistory.length && nextHistory.every((entry, index) => (
            entry.id === currentHistory[index]?.id &&
            entry.updatedAt === currentHistory[index]?.updatedAt &&
            entry.resumeUrl === currentHistory[index]?.resumeUrl &&
            entry.coverLetter === currentHistory[index]?.coverLetter &&
            entry.source === currentHistory[index]?.source &&
            entry.reason === currentHistory[index]?.reason
        ));

        if (unchanged) return;

        writeApplicationDraftHistory(jobId, nextHistory);
        if (nextHistory[0]) {
            scheduleApplicationDraftHistorySync(nextHistory[0]);
        }
    }, [readApplicationDraftHistory, scheduleApplicationDraftHistorySync, user?.id, writeApplicationDraftHistory]);


    const syncApplicationDraft = useCallback(async (jobId: string, draft: SavedApplicationDraft) => {
        if (!user?.id) return;

        try {
            await applicationService.saveApplicationDraft(user.id, jobId, {
                resumeUrl: draft.resumeUrl,
                coverLetter: draft.coverLetter,
                source: draft.source,
            });
            applicationDraftSyncWarningRef.current = false;
        } catch (error) {
            console.warn('Application draft stored locally only:', error);
            warnApplicationDraftSyncUnavailable();
        }
    }, [user?.id, warnApplicationDraftSyncUnavailable]);

    const scheduleApplicationDraftSync = useCallback((jobId: string, draft: SavedApplicationDraft) => {
        if (applicationDraftSyncTimersRef.current[jobId]) {
            window.clearTimeout(applicationDraftSyncTimersRef.current[jobId]);
        }

        applicationDraftSyncTimersRef.current[jobId] = window.setTimeout(() => {
            void syncApplicationDraft(jobId, draft);
            delete applicationDraftSyncTimersRef.current[jobId];
        }, 800);
    }, [syncApplicationDraft]);

    const syncApplicationDraftDelete = useCallback(async (jobId: string) => {
        if (!user?.id) return;

        if (applicationDraftSyncTimersRef.current[jobId]) {
            window.clearTimeout(applicationDraftSyncTimersRef.current[jobId]);
            delete applicationDraftSyncTimersRef.current[jobId];
        }

        try {
            await applicationService.deleteApplicationDraft(user.id, jobId);
            applicationDraftSyncWarningRef.current = false;
        } catch (error) {
            console.warn('Application draft delete stored locally only:', error);
            warnApplicationDraftSyncUnavailable();
        }
    }, [user?.id, warnApplicationDraftSyncUnavailable]);

    useEffect(() => () => {
        Object.values(applicationDraftSyncTimersRef.current).forEach(timer => window.clearTimeout(timer));
        Object.values(applicationDraftHistorySyncTimersRef.current).forEach(timer => window.clearTimeout(timer));
    }, []);

    const persistApplicationDraft = useCallback((
        jobId: string,
        draft: ApplicationDraft,
        source: SavedApplicationDraft['source'] = 'manual',
        historyReason: ApplicationDraftHistoryReason = 'autosave'
    ) => {
        const hasDraftContent = Boolean(draft.resumeUrl.trim() || draft.coverLetter.trim());
        const existingDrafts = readApplicationDrafts();

        if (!hasDraftContent) {
            delete existingDrafts[jobId];
            setApplicationDraftSavedAt(null);
            writeApplicationDrafts(existingDrafts);
            void syncApplicationDraftDelete(jobId);
        } else {
            const updatedAt = new Date().toISOString();
            const savedDraft: SavedApplicationDraft = {
                jobId,
                resumeUrl: draft.resumeUrl,
                coverLetter: draft.coverLetter,
                updatedAt,
                source,
            };
            existingDrafts[jobId] = savedDraft;
            setApplicationDraftSavedAt(updatedAt);
            writeApplicationDrafts(existingDrafts);
            scheduleApplicationDraftSync(jobId, savedDraft);
            recordApplicationDraftHistory(jobId, draft, source, historyReason);
        }
    }, [readApplicationDrafts, recordApplicationDraftHistory, scheduleApplicationDraftSync, syncApplicationDraftDelete, writeApplicationDrafts]);

    const removeApplicationDraft = useCallback((jobId: string) => {
        const existingDrafts = readApplicationDrafts();
        delete existingDrafts[jobId];
        writeApplicationDrafts(existingDrafts);
        void syncApplicationDraftDelete(jobId);

        setApplicationDraftSavedAt(null);
    }, [readApplicationDrafts, syncApplicationDraftDelete, writeApplicationDrafts]);

    useEffect(() => {
        if (!selectedJob || !user?.id) return;

        let isActive = true;
        const loadAccountApplicationDraft = async () => {
            const localDraft = readApplicationDrafts()[selectedJob.id];

            try {
                const serverDraft = await applicationService.getApplicationDraft(user.id, selectedJob.id);
                if (!isActive) return;

                if (!serverDraft) {
                    if (localDraft) {
                        void syncApplicationDraft(selectedJob.id, localDraft);
                    }
                    return;
                }

                const savedServerDraft = toSavedApplicationDraft(serverDraft);
                if (localDraft && isDraftNewer(localDraft, savedServerDraft)) {
                    void syncApplicationDraft(selectedJob.id, localDraft);
                    return;
                }

                const nextDrafts = readApplicationDrafts();
                nextDrafts[selectedJob.id] = savedServerDraft;
                writeApplicationDrafts(nextDrafts);
                setApplicationDraft({
                    resumeUrl: savedServerDraft.resumeUrl,
                    coverLetter: savedServerDraft.coverLetter,
                });
                setApplicationDraftMeta({
                    source: savedServerDraft.source,
                    message: 'Saved account draft restored. Review or change it before submitting.',
                });
                setApplicationDraftSavedAt(savedServerDraft.updatedAt);
                applicationDraftTouchedRef.current = true;
                applicationDraftShouldPersistRef.current = true;
            } catch (error) {
                console.warn('Using local application draft fallback:', error);
            }
        };

        loadAccountApplicationDraft();

        return () => {
            isActive = false;
        };
    }, [readApplicationDrafts, selectedJob, syncApplicationDraft, user?.id, writeApplicationDrafts]);

    useEffect(() => {
        if (!selectedJob) {
            setApplicationDraftHistory([]);
            setIsApplicationDraftClearReviewOpen(false);
            setProfileApplicationDraftReplaceReview(null);
            return;
        }

        const localHistory = readApplicationDraftHistory(selectedJob.id);
        setApplicationDraftHistory(localHistory);

        if (!user?.id) return;

        let isActive = true;
        const loadApplicationDraftHistory = async () => {
            try {
                const serverHistory = await applicationService.getApplicationDraftHistory(
                    user.id,
                    selectedJob.id,
                    applicationDraftHistoryLimit
                );
                if (!isActive) return;

                const mergedHistory = mergeApplicationDraftHistories(
                    serverHistory,
                    localHistory,
                    applicationDraftHistoryLimit
                );
                writeApplicationDraftHistory(selectedJob.id, mergedHistory);
                setApplicationDraftHistory(mergedHistory);
            } catch (error) {
                console.warn('Using local application draft history fallback:', error);
            }
        };

        loadApplicationDraftHistory();

        return () => {
            isActive = false;
        };
    }, [readApplicationDraftHistory, selectedJob, user?.id, writeApplicationDraftHistory]);

    const setApplicationDraftField = (field: keyof ApplicationDraft, value: string) => {
        setIsApplicationDraftClearReviewOpen(false);
        setProfileApplicationDraftReplaceReview(null);
        applicationDraftTouchedRef.current = true;
        applicationDraftShouldPersistRef.current = true;
        const nextDraft = { ...applicationDraft, [field]: value };
        setApplicationDraft(nextDraft);
        setApplicationDraftMeta({
            source: 'manual',
            message: 'Draft autosaved. Nothing is submitted until you click Submit Application.',
        });

        if (selectedJob?.id) {
            persistApplicationDraft(selectedJob.id, nextDraft, 'manual');
        }
    };

    const getCurrentApplicationDraftSource = (): ApplicationDraftSource | 'manual' => (
        applicationDraftMeta.source === 'profile' || applicationDraftMeta.source === 'ai'
            ? applicationDraftMeta.source
            : 'manual'
    );

    const commitProfileApplicationDraft = useCallback((nextDraft: ApplicationDraft) => {
        if (!selectedJob?.id) return;

        setIsApplicationDraftClearReviewOpen(false);
        setProfileApplicationDraftReplaceReview(null);
        setApplicationDraft(nextDraft);
        setApplicationDraftMeta({
            source: 'profile',
            message: 'Profile draft applied and saved. Review or change it before submitting.',
        });
        applicationDraftTouchedRef.current = true;
        applicationDraftShouldPersistRef.current = true;
        persistApplicationDraft(selectedJob.id, nextDraft, 'profile', 'profile_applied');
        recordApplicationWorkflowAnalytics({
            userId: user?.id,
            action: 'application_profile_draft_used',
            jobId: selectedJob.id,
            draftSource: 'profile',
            ...getApplicationDraftFieldState(nextDraft),
        });
    }, [persistApplicationDraft, selectedJob?.id, user?.id]);

    const applyProfileApplicationDraft = useCallback((profile: Record<string, any> | null = applicationDraftProfile) => {
        if (!selectedJob || !profile) return;

        const nextDraft = buildProfileApplicationDraft(selectedJob, profile, user);
        const nextDraftFieldState = getApplicationDraftFieldState(nextDraft);
        if (!nextDraftFieldState.hasResumeUrl && !nextDraftFieldState.hasCoverLetter) {
            addToast({ type: 'warning', title: 'Profile draft unavailable', message: 'Add profile details or enter application details manually.' });
            return;
        }

        const currentDraftFieldState = getApplicationDraftFieldState(applicationDraft);
        const isSameDraft = applicationDraft.resumeUrl.trim() === nextDraft.resumeUrl.trim() &&
            applicationDraft.coverLetter.trim() === nextDraft.coverLetter.trim();

        if ((currentDraftFieldState.hasResumeUrl || currentDraftFieldState.hasCoverLetter) && !isSameDraft) {
            const currentDraftSource = applicationDraftMeta.source === 'profile' || applicationDraftMeta.source === 'ai'
                ? applicationDraftMeta.source
                : 'manual';
            setIsApplicationDraftClearReviewOpen(false);
            setProfileApplicationDraftReplaceReview(nextDraft);
            recordApplicationWorkflowAnalytics({
                userId: user?.id,
                action: 'application_profile_draft_review_opened',
                jobId: selectedJob.id,
                draftSource: currentDraftSource,
                hasSavedDraft: Boolean(applicationDraftSavedAt),
                ...currentDraftFieldState,
            });
            return;
        }

        commitProfileApplicationDraft(nextDraft);
    }, [addToast, applicationDraft, applicationDraftMeta.source, applicationDraftProfile, applicationDraftSavedAt, commitProfileApplicationDraft, selectedJob, user]);

    const cancelProfileApplicationDraftReplaceReview = () => {
        if (!profileApplicationDraftReplaceReview || !selectedJob?.id) {
            setProfileApplicationDraftReplaceReview(null);
            return;
        }

        recordApplicationWorkflowAnalytics({
            userId: user?.id,
            action: 'application_profile_draft_cancelled',
            jobId: selectedJob.id,
            draftSource: getCurrentApplicationDraftSource(),
            hasSavedDraft: Boolean(applicationDraftSavedAt),
            ...getApplicationDraftFieldState(applicationDraft),
        });
        setProfileApplicationDraftReplaceReview(null);
    };

    const confirmProfileApplicationDraftReplace = () => {
        if (!profileApplicationDraftReplaceReview) return;
        if (selectedJob?.id) {
            recordApplicationDraftHistory(
                selectedJob.id,
                applicationDraft,
                getCurrentApplicationDraftSource(),
                'autosave'
            );
        }
        commitProfileApplicationDraft(profileApplicationDraftReplaceReview);
    };

    const openApplicationDraftClearReview = () => {
        if (!selectedJob?.id) return;

        const currentDraftFieldState = getApplicationDraftFieldState(applicationDraft);
        if (!currentDraftFieldState.hasResumeUrl && !currentDraftFieldState.hasCoverLetter) return;

        setProfileApplicationDraftReplaceReview(null);
        recordApplicationWorkflowAnalytics({
            userId: user?.id,
            action: 'application_draft_clear_review_opened',
            jobId: selectedJob.id,
            draftSource: getCurrentApplicationDraftSource(),
            hasSavedDraft: Boolean(applicationDraftSavedAt),
            ...currentDraftFieldState,
        });
        setIsApplicationDraftClearReviewOpen(true);
    };

    const cancelApplicationDraftClearReview = () => {
        if (!isApplicationDraftClearReviewOpen || !selectedJob?.id) {
            setIsApplicationDraftClearReviewOpen(false);
            return;
        }

        recordApplicationWorkflowAnalytics({
            userId: user?.id,
            action: 'application_draft_clear_cancelled',
            jobId: selectedJob.id,
            draftSource: getCurrentApplicationDraftSource(),
            hasSavedDraft: Boolean(applicationDraftSavedAt),
            ...getApplicationDraftFieldState(applicationDraft),
        });
        setIsApplicationDraftClearReviewOpen(false);
    };

    const clearApplicationDraft = () => {
        const currentDraftFieldState = getApplicationDraftFieldState(applicationDraft);
        applicationDraftTouchedRef.current = true;
        applicationDraftShouldPersistRef.current = false;
        if (selectedJob?.id) {
            const currentSource = getCurrentApplicationDraftSource();
            recordApplicationDraftHistory(selectedJob.id, applicationDraft, currentSource, 'cleared');
            recordApplicationWorkflowAnalytics({
                userId: user?.id,
                action: 'application_draft_cleared',
                jobId: selectedJob.id,
                draftSource: currentSource,
                hasSavedDraft: Boolean(applicationDraftSavedAt),
                ...currentDraftFieldState,
            });
        }
        setIsApplicationDraftClearReviewOpen(false);
        setProfileApplicationDraftReplaceReview(null);
        setApplicationDraft(emptyApplicationDraft);
        setApplicationDraftMeta({
            source: 'manual',
            message: 'Draft cleared. Add details manually or reuse your profile draft.',
        });
        setApplicationDraftSavedAt(null);
        if (selectedJob?.id) {
            removeApplicationDraft(selectedJob.id);
        }
    };

    const restoreApplicationDraftHistoryEntry = useCallback((entry: ApplicationDraftHistoryEntry) => {
        if (!selectedJob?.id) return;

        const restoredDraft = {
            resumeUrl: entry.resumeUrl,
            coverLetter: entry.coverLetter,
        };
        setIsApplicationDraftClearReviewOpen(false);
        setProfileApplicationDraftReplaceReview(null);
        setApplicationDraft(restoredDraft);
        setApplicationDraftMeta({
            source: entry.source,
            message: 'Draft history restored. Review or change it before submitting.',
        });
        applicationDraftTouchedRef.current = true;
        applicationDraftShouldPersistRef.current = true;
        persistApplicationDraft(selectedJob.id, restoredDraft, entry.source, 'restored');
        recordApplicationWorkflowAnalytics({
            userId: user?.id,
            action: 'application_draft_restored',
            jobId: selectedJob.id,
            draftSource: entry.source,
            hasSavedDraft: true,
            ...getApplicationDraftFieldState(restoredDraft),
        });
        addToast({ type: 'success', title: 'Draft restored', message: 'The selected version is back in the editable application draft.' });
    }, [addToast, persistApplicationDraft, selectedJob?.id, user?.id]);

    const pendingAiApplicationDraft = useMemo(() => (
        selectedJob && pendingAiApplicationDraftSource
            ? buildApplicationAiDraftSuggestion(applicationDraft, pendingAiApplicationDraftSource)
            : null
    ), [applicationDraft, pendingAiApplicationDraftSource, selectedJob]);

    const applyAiApplicationDraft = useCallback(() => {
        if (!selectedJob?.id || !pendingAiApplicationDraft || !hasApplicationAiDraftFields(pendingAiApplicationDraft)) return;

        const patch = getApplicationAiDraftFormPatch(pendingAiApplicationDraft);
        const nextDraft = {
            ...applicationDraft,
            ...patch,
        };

        setIsApplicationDraftClearReviewOpen(false);
        setProfileApplicationDraftReplaceReview(null);
        setApplicationDraft(nextDraft);
        setApplicationDraftMeta({
            source: 'ai',
            message: 'AI draft applied and saved. Review or edit it before submitting.',
        });
        applicationDraftTouchedRef.current = true;
        applicationDraftShouldPersistRef.current = true;
        persistApplicationDraft(selectedJob.id, nextDraft, 'ai', 'ai_applied');
        recordAiWorkflowPrefillDecision({
            userId: user?.id,
            suggestionId: pendingAiApplicationDraft.recommendationId,
            workflow: 'applications',
            decision: 'used',
            sourceLabel: pendingAiApplicationDraft.sourceLabel,
            metadata: {
                decisionReason: 'apply_ai_draft',
                jobId: selectedJob.id,
                jobTitle: selectedJob.title,
                fieldCount: pendingAiApplicationDraft.fields.length,
                fields: pendingAiApplicationDraft.fields.map(field => field.field),
            },
        });
        setPendingAiApplicationDraftSource(null);
        addToast({
            type: 'success',
            title: 'AI draft applied',
            message: 'The selected application draft was copied into the editable form. Submit Application is still required.',
        });
    }, [addToast, applicationDraft, pendingAiApplicationDraft, persistApplicationDraft, selectedJob, user?.id]);

    const dismissAiApplicationDraft = useCallback(() => {
        if (pendingAiApplicationDraft) {
            recordAiWorkflowPrefillDecision({
                userId: user?.id,
                suggestionId: pendingAiApplicationDraft.recommendationId,
                workflow: 'applications',
                decision: 'rejected',
                sourceLabel: pendingAiApplicationDraft.sourceLabel,
                metadata: {
                    decisionReason: 'dismiss',
                    jobId: selectedJob?.id,
                    jobTitle: selectedJob?.title,
                    fieldCount: pendingAiApplicationDraft.fields.length,
                    fields: pendingAiApplicationDraft.fields.map(field => field.field),
                },
            });
        }
        setPendingAiApplicationDraftSource(null);
    }, [pendingAiApplicationDraft, selectedJob?.id, selectedJob?.title, user?.id]);

    useEffect(() => {
        if (!selectedJob || !user?.id) return;

        let isActive = true;
        const loadProfileDraft = async () => {
            setIsLoadingApplicationDraft(true);
            setApplicationDraftProfile(null);
            try {
                const profile = await profileService.getProfile(user.id);
                if (!isActive) return;

                setApplicationDraftProfile(profile);
                const nextDraft = buildProfileApplicationDraft(selectedJob, profile, user);
                const hasDraftContent = Boolean(nextDraft.resumeUrl.trim() || nextDraft.coverLetter.trim());

                if (!hasDraftContent) {
                    setApplicationDraftMeta({
                        source: 'unavailable',
                        message: 'No profile details were available for a draft. Add application details manually.',
                    });
                    return;
                }

                if (applicationDraftTouchedRef.current) {
                    setApplicationDraftMeta({
                        source: 'manual',
                        message: applicationDraftShouldPersistRef.current
                            ? 'Saved draft restored. Use Profile Draft only if you want to replace your current edits.'
                            : 'Profile draft is available. Use it only if you want to replace your current edits.',
                    });
                    return;
                }

                setApplicationDraft(nextDraft);
                setApplicationDraftMeta({
                    source: 'profile',
                    message: 'Editable draft generated from your profile. Review or change it before submitting.',
                });
            } catch (error) {
                console.error('Failed to load profile application draft:', error);
                if (!isActive) return;
                setApplicationDraftMeta({
                    source: 'error',
                    message: 'Profile draft could not be loaded. You can still apply manually.',
                });
            } finally {
                if (isActive) setIsLoadingApplicationDraft(false);
            }
        };

        loadProfileDraft();

        return () => {
            isActive = false;
        };
    }, [selectedJob, user]);

    const openApplicationModal = (job: Job) => {
        if (!user?.id) {
            addToast({ type: 'warning', title: 'Sign in required', message: 'Please sign in before applying.' });
            return;
        }

        const existingApplication = applications.find(application => application.jobId === job.id);
        if (existingApplication) {
            setSelectedApplication({ ...existingApplication, job: existingApplication.job || job });
            return;
        }

        applicationDraftSyncWarningRef.current = false;
        setIsApplicationDraftClearReviewOpen(false);
        setProfileApplicationDraftReplaceReview(null);
        setSelectedJob(job);
        setApplicationDraftHistory(readApplicationDraftHistory(job.id));
        const savedDraft = readApplicationDrafts()[job.id];
        if (savedDraft) {
            setApplicationDraft({
                resumeUrl: savedDraft.resumeUrl,
                coverLetter: savedDraft.coverLetter,
            });
            setApplicationDraftMeta({
                source: savedDraft.source,
                message: 'Saved draft restored. Review or change it before submitting.',
            });
            setApplicationDraftSavedAt(savedDraft.updatedAt);
            applicationDraftTouchedRef.current = true;
            applicationDraftShouldPersistRef.current = true;
        } else {
            setApplicationDraft(emptyApplicationDraft);
            setApplicationDraftMeta(defaultApplicationDraftMeta);
            setApplicationDraftSavedAt(null);
            applicationDraftTouchedRef.current = false;
            applicationDraftShouldPersistRef.current = false;
        }
        recordApplicationWorkflowAnalytics({
            userId: user.id,
            action: 'application_review_opened',
            jobId: job.id,
            draftSource: savedDraft?.source || 'manual',
            hasSavedDraft: Boolean(savedDraft),
            ...getApplicationDraftFieldState(savedDraft || emptyApplicationDraft),
        });
        setApplicationDraftProfile(null);
    };

    const handleApply = async () => {
        if (!user?.id || !selectedJob) return;
        setIsApplying(selectedJob.id);
        try {
            const submittedApplication = await applicationService.submitApplication({
                jobId: selectedJob.id,
                userId: user.id,
                resumeUrl: applicationDraft.resumeUrl.trim() || undefined,
                coverLetter: applicationDraft.coverLetter.trim() || undefined,
            });
            const normalizedApplication = {
                ...submittedApplication,
                jobId: submittedApplication.jobId || selectedJob.id,
                userId: submittedApplication.userId || user.id,
                job: submittedApplication.job || selectedJob,
                resumeUrl: submittedApplication.resumeUrl || applicationDraft.resumeUrl.trim() || undefined,
                coverLetter: submittedApplication.coverLetter || applicationDraft.coverLetter.trim() || undefined,
            };

            setApplications(prev => {
                const withoutDuplicate = prev.filter(application => application.jobId !== selectedJob.id && application.id !== normalizedApplication.id);
                return [normalizedApplication, ...withoutDuplicate];
            });
            recordApplicationWorkflowAnalytics({
                userId: user.id,
                action: 'application_submitted',
                jobId: selectedJob.id,
                applicationId: normalizedApplication.id,
                draftSource: applicationDraftMeta.source,
                ...getApplicationDraftFieldState(applicationDraft),
            });
            addToast({ type: 'success', title: 'Application submitted successfully!' });
            removeApplicationDraft(selectedJob.id);
            applicationDraftShouldPersistRef.current = false;
            setSelectedJob(null);
            setSelectedApplication(normalizedApplication);
        } catch (error) {
            console.error('Application failed:', error);
            recordApplicationWorkflowAnalytics({
                userId: user.id,
                action: 'application_submit_failed',
                jobId: selectedJob.id,
                draftSource: applicationDraftMeta.source,
                errorCategory: error instanceof Error ? error.name : 'application_submit_error',
                ...getApplicationDraftFieldState(applicationDraft),
            });
            addToast({
                type: 'error',
                title: 'Application was not sent',
                message: 'Your draft is still here. Review the details and try submitting again.',
            });
        } finally {
            setIsApplying(null);
        }
    };

    const publishRecruiterJob = async () => {
        if (!pendingPublishJob?.id) return;

        const publishIssues = buildRecruiterPostingPublishIssues(pendingPublishJob);
        setPublishingJobId(pendingPublishJob.id);
        try {
            await jobService.updateJob(pendingPublishJob.id, { status: 'PUBLISHED' });
            recordRecruiterPublishAnalytics({
                userId: user?.id,
                jobId: pendingPublishJob.id,
                jobStatus: pendingPublishJob.status,
                issues: publishIssues,
                action: 'publish_completed',
            });
            setRecruiterJobs(prev => prev.map(job => (
                job.id === pendingPublishJob.id ? { ...job, status: 'PUBLISHED' } : job
            )));
            addToast({ type: 'success', title: 'Job published', message: 'The posting is now visible to candidates.' });
            setPendingPublishJob(null);
            refetchJobs();
        } catch (error) {
            console.error('Failed to publish job:', error);
            recordRecruiterPublishAnalytics({
                userId: user?.id,
                jobId: pendingPublishJob.id,
                jobStatus: pendingPublishJob.status,
                issues: publishIssues,
                action: 'publish_failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown publish failure',
            });
            addToast({
                type: 'error',
                title: 'Publish failed',
                message: getJobPublishPolicyErrorMessage(error) || 'Please review the draft and try again.',
            });
        } finally {
            setPublishingJobId(null);
        }
    };

    const openPublishReview = (job: Record<string, any>) => {
        recordRecruiterPublishAnalytics({
            userId: user?.id,
            jobId: job.id,
            jobStatus: job.status,
            issues: buildRecruiterPostingPublishIssues(job),
            action: 'review_opened',
        });
        setPendingPublishJob(job);
    };

    const editPendingPublishDraft = () => {
        if (!pendingPublishJob?.id) return;
        const draftId = pendingPublishJob.id;
        setPendingPublishJob(null);
        navigate(`/jobs/post?draftId=${encodeURIComponent(draftId)}`);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setJobFilters(emptyJobFilters);
        setExcludedExploreJobTypes([]);
    };

    const savedSearchAlertSourceJobs = savedSearchAlertJobs.length > 0 ? savedSearchAlertJobs : jobs;

    const getSavedSearchCurrentMatchCount = useCallback((savedSearch: Pick<SavedJobSearch, 'searchTerm' | 'filters'>) => {
        return getMatchingJobsForSearch(savedSearchAlertSourceJobs, savedSearch).length;
    }, [savedSearchAlertSourceJobs]);

    useEffect(() => {
        if (!user?.id || savedSearches.length === 0 || savedSearchAlertSourceJobs.length === 0) return;

        const deliveryMode = getLowerPriorityNotificationDelivery({
            channelEnabled: jobAlertsEnabled,
            digestFrequency: jobAlertDigestFrequency,
        });
        if (deliveryMode === 'suppressed') return;

        const deliverSavedSearchNotifications = async () => {
            const deferredSearchUpdates = new Map<string, SavedJobSearch>();
            const deferredDigestQueueItems: Array<{
                savedSearchId: string;
                savedSearchName: string;
                newMatchCount: number;
                currentMatchCount: number;
                previousMatchCount: number;
            }> = [];

            for (const savedSearch of savedSearches) {
                if (!savedSearch.alertEnabled) continue;

                const currentMatchCount = getSavedSearchCurrentMatchCount(savedSearch);
                const previousMatchCount = savedSearch.lastMatchCount ?? currentMatchCount;
                const newMatchCount = Math.max(currentMatchCount - previousMatchCount, 0);
                if (newMatchCount === 0) continue;

                const deliverySignature = [
                    currentMatchCount,
                    previousMatchCount,
                    newMatchCount,
                    savedSearch.lastCheckedAt || '',
                ].join(':');

                if (savedSearchNotificationStateRef.current[savedSearch.id] === deliverySignature) continue;
                savedSearchNotificationStateRef.current[savedSearch.id] = deliverySignature;

                const checkedAt = new Date().toISOString();
                const updatedSearch = {
                    ...savedSearch,
                    lastMatchCount: currentMatchCount,
                    lastCheckedAt: checkedAt,
                };

                if (deliveryMode === 'defer_to_digest') {
                    deferredSearchUpdates.set(savedSearch.id, updatedSearch);
                    deferredDigestQueueItems.push({
                        savedSearchId: savedSearch.id,
                        savedSearchName: savedSearch.name,
                        newMatchCount,
                        currentMatchCount,
                        previousMatchCount,
                    });
                    continue;
                }

                try {
                    await notificationService.upsertSavedSearchAlertNotification(user.id, {
                        savedSearchId: savedSearch.id,
                        savedSearchName: savedSearch.name,
                        newMatchCount,
                        currentMatchCount,
                        previousMatchCount,
                    });
                    savedSearchNotificationWarningRef.current = false;
                } catch (error) {
                    console.warn('Unable to deliver saved-search notification:', error);
                    if (!savedSearchNotificationWarningRef.current) {
                        savedSearchNotificationWarningRef.current = true;
                        addToast({ type: 'warning', title: 'Job alert saved locally', message: 'In-app notification sync is unavailable.' });
                    }
                }
            }

            if (deferredSearchUpdates.size > 0) {
                persistSavedSearches(savedSearches.map(item => (
                    deferredSearchUpdates.get(item.id) || item
                )));
                deferredSearchUpdates.forEach(updatedSearch => {
                    void syncSavedSearch(updatedSearch);
                });
                deferredDigestQueueItems.forEach(digestItem => {
                    void notificationDigestService.queueSavedSearchDigestItem(user.id, {
                        ...digestItem,
                        digestFrequency: jobAlertDigestFrequency,
                    }).then(() => {
                        savedSearchDigestQueueWarningRef.current = false;
                    }).catch(error => {
                        console.warn('Unable to queue saved-search digest item:', error);
                        if (!savedSearchDigestQueueWarningRef.current) {
                            savedSearchDigestQueueWarningRef.current = true;
                            addToast({
                                type: 'warning',
                                title: 'Digest queue unavailable',
                                message: 'New matches are still tracked here, but digest delivery could not be queued.',
                            });
                        }
                    });
                });

                if (!savedSearchDigestNoticeRef.current) {
                    savedSearchDigestNoticeRef.current = true;
                    addToast({
                        type: 'info',
                        title: 'Immediate saved-search alerts paused',
                        message: `New matches are still tracked here. Immediate job alerts are paused by your ${jobAlertDigestFrequency} digest setting.`,
                    });
                }
            }
        };

        void deliverSavedSearchNotifications();
    }, [addToast, getSavedSearchCurrentMatchCount, jobAlertDigestFrequency, jobAlertsEnabled, persistSavedSearches, savedSearchAlertSourceJobs.length, savedSearches, syncSavedSearch, user?.id]);

    const buildDefaultSavedSearchName = useCallback(() => {
        const labels = [
            searchTerm.trim(),
            jobFilters.location.trim(),
            jobFilters.jobType ? getJobTypeLabel(jobFilters.jobType) : '',
            jobFilters.minSalary ? `Min $${jobFilters.minSalary}` : '',
            jobFilters.maxSalary ? `Max $${jobFilters.maxSalary}` : '',
        ].filter(Boolean);

        return labels.length > 0 ? labels.slice(0, 3).join(' - ') : 'Job search';
    }, [jobFilters.jobType, jobFilters.location, jobFilters.maxSalary, jobFilters.minSalary, searchTerm]);

    const savedSearchFilterCount = [
        searchTerm.trim(),
        jobFilters.jobType,
        jobFilters.location.trim(),
        jobFilters.minSalary,
        jobFilters.maxSalary,
    ].filter(Boolean).length;
    const activeFilterCount = savedSearchFilterCount + excludedExploreJobTypes.length;

    const openSaveSearchModal = () => {
        if (savedSearchFilterCount === 0) {
            addToast({ type: 'warning', title: 'No filters to save', message: 'Add a search term or filter before saving.' });
            return;
        }

        const signature = getSavedSearchSignature(searchTerm, jobFilters);
        const existingSearch = savedSearches.find(savedSearch => getSavedSearchSignature(savedSearch.searchTerm, savedSearch.filters) === signature);

        setSavedSearchName(buildDefaultSavedSearchName());
        setSavedSearchAlertEnabled(Boolean(existingSearch?.alertEnabled));
        setIsSaveSearchModalOpen(true);
    };

    const handleSaveSearch = () => {
        if (savedSearchFilterCount === 0) return;

        const trimmedName = savedSearchName.trim() || buildDefaultSavedSearchName();
        const signature = getSavedSearchSignature(searchTerm, jobFilters);
        const existingIndex = savedSearches.findIndex(savedSearch => getSavedSearchSignature(savedSearch.searchTerm, savedSearch.filters) === signature);
        const existingSearch = existingIndex >= 0 ? savedSearches[existingIndex] : undefined;
        const now = new Date().toISOString();
        const alertMatchCount = getSavedSearchCurrentMatchCount({
            searchTerm: searchTerm.trim(),
            filters: jobFilters,
        });
        const savedSearch: SavedJobSearch = {
            id: existingSearch?.id || createSavedSearchId(),
            name: trimmedName,
            searchTerm: searchTerm.trim(),
            filters: { ...jobFilters },
            createdAt: existingSearch?.createdAt || now,
            lastUsedAt: existingSearch?.lastUsedAt,
            alertEnabled: savedSearchAlertEnabled,
            lastMatchCount: savedSearchAlertEnabled ? alertMatchCount : undefined,
            lastCheckedAt: savedSearchAlertEnabled ? now : undefined,
        };
        const nextSearches = existingIndex >= 0
            ? savedSearches.map((item, index) => index === existingIndex ? savedSearch : item)
            : [savedSearch, ...savedSearches];
        const savedSearchCountAfter = nextSearches.slice(0, 10).length;

        persistSavedSearches(nextSearches);
        void syncSavedSearch(savedSearch);
        recordSavedSearchAnalytics({
            userId: user?.id,
            action: existingIndex >= 0 ? 'saved_search_updated' : 'saved_search_created',
            savedSearch,
            matchCount: alertMatchCount,
            savedSearchCountBefore: savedSearches.length,
            savedSearchCountAfter,
        });
        setIsSaveSearchModalOpen(false);
        setSavedSearchName('');
        setSavedSearchAlertEnabled(false);
        addToast({ type: 'success', title: existingIndex >= 0 ? 'Saved search updated' : 'Search saved' });
    };

    const applySavedSearch = (savedSearch: SavedJobSearch) => {
        setActiveTab('explore');
        setSearchTerm(savedSearch.searchTerm);
        setJobFilters(savedSearch.filters);
        setExcludedExploreJobTypes([]);

        const now = new Date().toISOString();
        const updatedSearch = {
            ...savedSearch,
            lastUsedAt: now,
            lastMatchCount: savedSearch.alertEnabled ? getSavedSearchCurrentMatchCount(savedSearch) : savedSearch.lastMatchCount,
            lastCheckedAt: savedSearch.alertEnabled ? now : savedSearch.lastCheckedAt,
        };

        persistSavedSearches(savedSearches.map(item => (
            item.id === savedSearch.id ? updatedSearch : item
        )));
        void syncSavedSearch(updatedSearch);
        recordSavedSearchAnalytics({
            userId: user?.id,
            action: 'saved_search_applied',
            savedSearch: updatedSearch,
            matchCount: getSavedSearchCurrentMatchCount(savedSearch),
            savedSearchCountBefore: savedSearches.length,
            savedSearchCountAfter: savedSearches.length,
        });
        addToast({ type: 'success', title: 'Saved search applied' });
    };

    const toggleSavedSearchAlert = (savedSearch: SavedJobSearch) => {
        const now = new Date().toISOString();
        const nextEnabled = !savedSearch.alertEnabled;
        const updatedSearch = {
            ...savedSearch,
            alertEnabled: nextEnabled,
            lastMatchCount: nextEnabled ? getSavedSearchCurrentMatchCount(savedSearch) : undefined,
            lastCheckedAt: nextEnabled ? now : undefined,
        };

        persistSavedSearches(savedSearches.map(item => (
            item.id === savedSearch.id ? updatedSearch : item
        )));
        void syncSavedSearch(updatedSearch);
        recordSavedSearchAnalytics({
            userId: user?.id,
            action: nextEnabled ? 'saved_search_alert_enabled' : 'saved_search_alert_disabled',
            savedSearch: updatedSearch,
            matchCount: nextEnabled ? updatedSearch.lastMatchCount : undefined,
            savedSearchCountBefore: savedSearches.length,
            savedSearchCountAfter: savedSearches.length,
        });

        addToast({
            type: 'success',
            title: nextEnabled ? 'New-match tracking enabled' : 'New-match tracking disabled',
            message: nextEnabled && !jobAlertsEnabled
                ? 'This search will track matches here. Job alert notifications are disabled in Settings.'
                : undefined,
        });
    };

    const openSavedSearchDeleteReview = (savedSearch: SavedJobSearch) => {
        setSavedSearchDeleteReview(savedSearch);
        recordSavedSearchAnalytics({
            userId: user?.id,
            action: 'saved_search_delete_review_opened',
            savedSearch,
            matchCount: getSavedSearchCurrentMatchCount(savedSearch),
            savedSearchCountBefore: savedSearches.length,
            savedSearchCountAfter: savedSearches.length,
        });
    };

    const cancelSavedSearchDeleteReview = () => {
        if (!savedSearchDeleteReview) return;

        recordSavedSearchAnalytics({
            userId: user?.id,
            action: 'saved_search_delete_cancelled',
            savedSearch: savedSearchDeleteReview,
            matchCount: getSavedSearchCurrentMatchCount(savedSearchDeleteReview),
            savedSearchCountBefore: savedSearches.length,
            savedSearchCountAfter: savedSearches.length,
        });
        setSavedSearchDeleteReview(null);
    };

    const confirmSavedSearchDelete = () => {
        if (!savedSearchDeleteReview) return;

        const savedSearch = savedSearchDeleteReview;
        const nextSavedSearches = savedSearches.filter(item => item.id !== savedSearch.id);

        persistSavedSearches(nextSavedSearches);
        void syncSavedSearchDelete(savedSearch.id);
        recordSavedSearchAnalytics({
            userId: user?.id,
            action: 'saved_search_deleted',
            savedSearch,
            matchCount: getSavedSearchCurrentMatchCount(savedSearch),
            savedSearchCountBefore: savedSearches.length,
            savedSearchCountAfter: nextSavedSearches.length,
        });
        setSavedSearchDeleteReview(null);
        addToast({ type: 'success', title: 'Saved search deleted' });
    };

    const applyHiddenPreferenceInsight = useCallback((insight: HiddenExplorePreferenceInsight) => {
        if (insight.kind !== 'job_type') return;

        const normalizedJobType = normalizeHiddenExploreJobType(insight.jobType);
        if (!normalizedJobType) return;

        setExcludedExploreJobTypes(prev => (
            prev.some(type => normalizeHiddenExploreJobType(type) === normalizedJobType)
                ? prev
                : [...prev, normalizedJobType]
        ));
        recordJobRecommendationPreferenceAnalytics({
            userId: user?.id,
            action: 'apply_view_filter',
            filterType: 'job_type',
            filterValue: normalizedJobType,
            filterLabel: insight.label,
            hiddenCountBefore: hiddenExploreJobs.length,
            hiddenCountAfter: hiddenExploreJobs.length,
        });
        setHiddenExploreJobsStatus(`${insight.label} roles hidden in this Explore view.`);
        addToast({
            type: 'success',
            title: 'Preference applied',
            message: `${insight.label} roles are hidden in this view until you clear the preference.`,
        });
    }, [addToast, hiddenExploreJobs.length, user?.id]);

    const clearExcludedExploreJobType = useCallback((jobType: string) => {
        const normalizedJobType = normalizeHiddenExploreJobType(jobType);
        if (!normalizedJobType) return;

        setExcludedExploreJobTypes(prev => prev.filter(type => (
            normalizeHiddenExploreJobType(type) !== normalizedJobType
        )));
        recordJobRecommendationPreferenceAnalytics({
            userId: user?.id,
            action: 'clear_view_filter',
            filterType: 'job_type',
            filterValue: normalizedJobType,
            filterLabel: getHiddenExploreJobTypeLabel(normalizedJobType),
            hiddenCountBefore: hiddenExploreJobs.length,
            hiddenCountAfter: hiddenExploreJobs.length,
        });
        setHiddenExploreJobsStatus(`${getHiddenExploreJobTypeLabel(normalizedJobType)} roles restored to this Explore view.`);
    }, [hiddenExploreJobs.length, user?.id]);

    const hideExploreJob = useCallback((job: Job) => {
        const hiddenCountBefore = hiddenExploreJobs.length;
        const nextHiddenJobs = persistHiddenExploreJobs(
            hideExploreJobPreference(hiddenExploreJobs, job)
        );
        const hiddenJob = nextHiddenJobs.find(item => item.jobId === job.id);
        if (hiddenJob) {
            void syncHiddenExploreJob(hiddenJob);
        }
        recordJobRecommendationPreferenceAnalytics({
            userId: user?.id,
            action: 'hide',
            job,
            hiddenCountBefore,
            hiddenCountAfter: nextHiddenJobs.length,
        });

        setHiddenExploreJobsStatus(`${job.title || 'Job'} hidden from Explore. Use Restore Last or Restore All to bring it back.`);
        addToast({
            type: 'success',
            title: 'Job hidden',
            message: `${nextHiddenJobs.length} ${nextHiddenJobs.length === 1 ? 'job is' : 'jobs are'} hidden from Explore.`,
        });
    }, [addToast, hiddenExploreJobs, persistHiddenExploreJobs, syncHiddenExploreJob, user?.id]);

    const restoreLastHiddenExploreJob = useCallback(() => {
        const [lastHiddenJob] = hiddenExploreJobs;
        if (!lastHiddenJob) return;

        const hiddenCountBefore = hiddenExploreJobs.length;
        const nextHiddenJobs = persistHiddenExploreJobs(
            restoreHiddenExploreJobPreference(hiddenExploreJobs, lastHiddenJob.jobId)
        );
        void syncHiddenExploreJobDelete(lastHiddenJob.jobId);
        recordJobRecommendationPreferenceAnalytics({
            userId: user?.id,
            action: 'restore_last',
            job: lastHiddenJob,
            hiddenCountBefore,
            hiddenCountAfter: nextHiddenJobs.length,
            restoredCount: 1,
        });
        const restoredJobType = normalizeHiddenExploreJobType(lastHiddenJob.jobType);
        if (restoredJobType) {
            setExcludedExploreJobTypes(prev => prev.filter(type => (
                normalizeHiddenExploreJobType(type) !== restoredJobType
            )));
        }

        setHiddenExploreJobsStatus(`${lastHiddenJob.title} restored to Explore.`);
        addToast({
            type: 'success',
            title: 'Job restored',
            message: nextHiddenJobs.length > 0
                ? `${nextHiddenJobs.length} ${nextHiddenJobs.length === 1 ? 'job remains' : 'jobs remain'} hidden.`
                : 'All hidden Explore jobs are visible again.',
        });
    }, [addToast, hiddenExploreJobs, persistHiddenExploreJobs, syncHiddenExploreJobDelete, user?.id]);

    const restoreAllHiddenExploreJobs = useCallback(() => {
        if (hiddenExploreJobs.length === 0) return;

        const hiddenCountBefore = hiddenExploreJobs.length;
        persistHiddenExploreJobs([]);
        setExcludedExploreJobTypes([]);
        void syncHiddenExploreJobsClear();
        recordJobRecommendationPreferenceAnalytics({
            userId: user?.id,
            action: 'restore_all',
            hiddenCountBefore,
            hiddenCountAfter: 0,
            restoredCount: hiddenCountBefore,
        });
        setHiddenExploreJobsStatus('All hidden Explore jobs restored.');
        addToast({
            type: 'success',
            title: 'Explore jobs restored',
            message: 'Hidden Explore jobs are visible again.',
        });
    }, [addToast, hiddenExploreJobs.length, persistHiddenExploreJobs, syncHiddenExploreJobsClear, user?.id]);

    const hiddenExploreJobIds = useMemo(() => new Set(
        hiddenExploreJobs.map(hiddenJob => hiddenJob.jobId)
    ), [hiddenExploreJobs]);
    const excludedExploreJobTypeSet = useMemo(() => new Set(
        excludedExploreJobTypes.map(normalizeHiddenExploreJobType).filter(Boolean)
    ), [excludedExploreJobTypes]);
    const hiddenPreferenceInsights = useMemo(() => (
        buildHiddenExplorePreferenceInsights(hiddenExploreJobs, {
            excludedJobTypes: excludedExploreJobTypes,
        })
    ), [excludedExploreJobTypes, hiddenExploreJobs]);

    const filteredJobs = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return jobs.filter(job => {
            if (hiddenExploreJobIds.has(job.id)) return false;
            if (excludedExploreJobTypeSet.has(normalizeHiddenExploreJobType(job.jobType))) return false;

            const salaryFloor = job.salaryMax ?? job.salaryMin;
            const salaryCeiling = job.salaryMin ?? job.salaryMax;
            const matchesSearch = !lowerSearch ||
                job.title.toLowerCase().includes(lowerSearch) ||
                job.description?.toLowerCase().includes(lowerSearch) ||
                job.companyName?.toLowerCase().includes(lowerSearch);
            const matchesType = !jobFilters.jobType || normalizeJobType(job.jobType) === jobFilters.jobType;
            const matchesLocation = !jobFilters.location.trim() ||
                job.location?.toLowerCase().includes(jobFilters.location.trim().toLowerCase());
            const matchesMinSalary = minSalary === undefined ||
                (salaryFloor !== undefined && salaryFloor >= minSalary);
            const matchesMaxSalary = maxSalary === undefined ||
                (salaryCeiling !== undefined && salaryCeiling <= maxSalary);

            return matchesSearch && matchesType && matchesLocation && matchesMinSalary && matchesMaxSalary;
        });
    }, [excludedExploreJobTypeSet, hiddenExploreJobIds, jobs, jobFilters.jobType, jobFilters.location, maxSalary, minSalary, searchTerm]);

    const jobsTotalCount = typeof jobsPageData?.total === 'number' ? jobsPageData.total : knownJobsTotal;
    const hasExactJobsTotal = jobsTotalCount !== null;
    const jobsTotalPages = hasExactJobsTotal
        ? Math.max(1, Math.ceil(jobsTotalCount / jobsPageSize))
        : Math.max(1, jobsPage + (jobsPageData?.hasNext ? 1 : 0));
    const normalizedJobsPage = hasExactJobsTotal
        ? Math.min(Math.max(1, jobsPage), jobsTotalPages)
        : Math.max(1, jobsPage);
    const currentJobsOffset = (normalizedJobsPage - 1) * jobsPageSize;
    const firstJobIndex = filteredJobs.length === 0 ? 0 : currentJobsOffset + 1;
    const lastJobIndex = filteredJobs.length === 0
        ? 0
        : hasExactJobsTotal
            ? Math.min(jobsTotalCount, currentJobsOffset + filteredJobs.length)
            : currentJobsOffset + filteredJobs.length;
    const visibleJobsCountLabel = hasExactJobsTotal
        ? `${jobsTotalCount}`
        : `${lastJobIndex}${jobsPageData?.hasNext ? '+' : ''}`;
    const hasExploreVisibilityPreferences = hiddenExploreJobs.length > 0 || excludedExploreJobTypes.length > 0;
    const exploreResultSummary = hasExploreVisibilityPreferences
        ? `${filteredJobs.length} visible on this page`
        : `${visibleJobsCountLabel} matching ${visibleJobsCountLabel === '1' ? 'job' : 'jobs'}`;
    const canGoToPreviousJobsPage = normalizedJobsPage > 1;
    const canGoToNextJobsPage = Boolean(jobsPageData?.hasNext) && (
        hasExactJobsTotal ? normalizedJobsPage < jobsTotalPages : true
    );

    useEffect(() => {
        setJobsPage(1);
        setJobsPageCursors({});
        setKnownJobsTotal(null);
    }, [jobQueryParams, jobsPageSize]);

    useEffect(() => {
        if (!jobsPageData) return;

        if (typeof jobsPageData.total === 'number') {
            setKnownJobsTotal(jobsPageData.total);
        }

        setJobsPageCursors(prev => {
            const nextPage = jobsPage + 1;
            if (!jobsPageData.nextCursor) {
                if (!prev[nextPage]) return prev;
                const next = { ...prev };
                delete next[nextPage];
                return next;
            }

            if (prev[nextPage] === jobsPageData.nextCursor) return prev;
            return { ...prev, [nextPage]: jobsPageData.nextCursor };
        });
    }, [jobsPage, jobsPageData]);

    useEffect(() => {
        if (!hasExactJobsTotal) return;

        setJobsPage(currentPage => {
            const nextPage = Math.min(Math.max(1, currentPage), jobsTotalPages);
            return nextPage === currentPage ? currentPage : nextPage;
        });
    }, [hasExactJobsTotal, jobsTotalPages]);

    const filteredApplications = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        if (!lowerSearch) return applications;

        return applications.filter(application => {
            const job = application.job as Record<string, any> | undefined;
            return application.status?.toLowerCase().includes(lowerSearch) ||
                job?.title?.toLowerCase().includes(lowerSearch) ||
                job?.companyName?.toLowerCase().includes(lowerSearch);
            });
    }, [applications, searchTerm]);

    const filteredRecruiterJobs = useMemo(() => {
        const lowerSearch = searchTerm.trim().toLowerCase();
        if (!lowerSearch) return recruiterJobs;

        return recruiterJobs.filter(job => (
            job.title?.toLowerCase().includes(lowerSearch) ||
            job.description?.toLowerCase().includes(lowerSearch) ||
            job.location?.toLowerCase().includes(lowerSearch) ||
            getRecruiterPostingCompanyName(job).toLowerCase().includes(lowerSearch) ||
            (job.status || '').toLowerCase().includes(lowerSearch)
        ));
    }, [recruiterJobs, searchTerm]);

    const applicationsByJobId = useMemo(() => {
        return new Map(applications.map(application => [application.jobId, application]));
    }, [applications]);

    const isLoading = activeTab === 'explore'
        ? jobsLoading
        : activeTab === 'postings'
            ? isLoadingRecruiterJobs
            : isLoadingApplications;
    const items = activeTab === 'explore'
        ? filteredJobs
        : activeTab === 'postings'
            ? filteredRecruiterJobs
            : filteredApplications;
    const applicationDraftBadgeVariant = applicationDraftMeta.source === 'profile'
        ? 'success'
        : applicationDraftMeta.source === 'ai'
            ? 'default'
            : applicationDraftMeta.source === 'error'
            ? 'warning'
            : 'outline';
    const canClearApplicationDraft = Boolean(applicationDraft.resumeUrl.trim() || applicationDraft.coverLetter.trim());
    const savedSearchMatchCounts = new Map(savedSearches.map(savedSearch => [
        savedSearch.id,
        getSavedSearchCurrentMatchCount(savedSearch),
    ]));
    const selectedApplicationStatusEvents = selectedApplication
        ? applicationStatusEvents[selectedApplication.id] || []
        : [];
    const pendingPublishIssues = pendingPublishJob ? buildRecruiterPostingPublishIssues(pendingPublishJob) : [];
    const pendingPublishStatus = (pendingPublishJob?.status || '').toUpperCase();
    const isPendingPublishJobPublished = pendingPublishStatus === 'PUBLISHED';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Jobs"
                description={isRecruiter ? "Manage your job postings and find top talent." : "Discover opportunities that match your skills and interests."}
                actions={
                    isRecruiter && (
                        <Button size="sm" onClick={() => navigate('/jobs/post')}>
                            Post a Job
                        </Button>
                    )
                }
            />

            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Tabs
                        tabs={[
                            { id: 'explore', label: 'Explore' },
                            { id: 'applied', label: 'Applied' },
                            ...(isRecruiter ? [{ id: 'postings', label: 'My Posts' }] : []),
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />

                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            aria-label={activeTab === 'explore' ? 'Search jobs' : activeTab === 'postings' ? 'Search my postings' : 'Search applications'}
                            placeholder={activeTab === 'explore' ? 'Search jobs...' : activeTab === 'postings' ? 'Search my postings...' : 'Search applications...'}
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {activeTab === 'explore' && (
                    <div className="space-y-2">
                        {pendingAiApplicationDraftSource && (
                            <div className="flex flex-col gap-3 rounded-lg border border-accent/20 bg-accent/5 p-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">AI application draft ready</p>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                                        Choose a job and click Apply to review the suggested resume link or cover letter before it touches your editable application draft.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPendingAiApplicationDraftSource(null)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_10rem_auto] gap-3 items-end">
                            <Input
                                label="Location"
                                value={jobFilters.location}
                                onChange={(e) => setJobFilters(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="Remote, New York"
                                icon={<MapPin size={14} />}
                            />

                            <div className="flex flex-col gap-1.5 w-full">
                                <label htmlFor="job-type-filter" className="text-sm font-medium text-[var(--text-primary)]">Job Type</label>
                                <select
                                    id="job-type-filter"
                                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                                    value={jobFilters.jobType}
                                    onChange={(e) => setJobFilters(prev => ({ ...prev, jobType: e.target.value }))}
                                >
                                    {jobTypeOptions.map(option => (
                                        <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Min Salary"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={jobFilters.minSalary}
                                onChange={(e) => setJobFilters(prev => ({ ...prev, minSalary: e.target.value }))}
                                placeholder="90000"
                                icon={<DollarSign size={14} />}
                            />

                            <Input
                                label="Max Salary"
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={jobFilters.maxSalary}
                                onChange={(e) => setJobFilters(prev => ({ ...prev, maxSalary: e.target.value }))}
                                placeholder="180000"
                                icon={<DollarSign size={14} />}
                            />

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full lg:w-auto"
                                onClick={clearFilters}
                                disabled={activeFilterCount === 0}
                            >
                                Clear
                            </Button>
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                <Filter size={13} />
                                <span>{jobsFetching ? 'Updating results...' : exploreResultSummary}</span>
                                {activeFilterCount > 0 && <Badge variant="outline">{activeFilterCount} active</Badge>}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full md:w-auto"
                                onClick={openSaveSearchModal}
                                disabled={savedSearchFilterCount === 0}
                            >
                                <Bookmark size={14} />
                                Save Search
                            </Button>
                        </div>

                        {savedSearches.length > 0 && (
                            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3">
                                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                    <BookmarkCheck size={14} className="text-accent" />
                                    <span>Saved Searches</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {savedSearches.map(savedSearch => (
                                        <div key={savedSearch.id} className="inline-flex max-w-full overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
                                            <button
                                                type="button"
                                                onClick={() => applySavedSearch(savedSearch)}
                                                className="flex max-w-64 items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-accent/10"
                                                title={savedSearch.name}
                                            >
                                                <span className="truncate">{savedSearch.name}</span>
                                                {savedSearch.alertEnabled && Math.max((savedSearchMatchCounts.get(savedSearch.id) || 0) - (savedSearch.lastMatchCount ?? 0), 0) > 0 && (
                                                    <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                                        {Math.max((savedSearchMatchCounts.get(savedSearch.id) || 0) - (savedSearch.lastMatchCount ?? 0), 0)} new
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleSavedSearchAlert(savedSearch)}
                                                className={`border-l border-[var(--border-default)] px-2 py-1.5 transition-colors ${savedSearch.alertEnabled ? 'text-accent hover:bg-accent/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`}
                                                aria-label={`${savedSearch.alertEnabled ? 'Disable' : 'Enable'} new match tracking for ${savedSearch.name}`}
                                                aria-pressed={Boolean(savedSearch.alertEnabled)}
                                                title={savedSearch.alertEnabled ? 'Disable new match tracking' : 'Enable new match tracking'}
                                            >
                                                {savedSearch.alertEnabled ? <Bell size={13} /> : <BellOff size={13} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openSavedSearchDeleteReview(savedSearch)}
                                                className="border-l border-[var(--border-default)] px-2 py-1.5 text-[var(--text-muted)] hover:bg-destructive/10 hover:text-destructive"
                                                aria-label={`Delete saved search ${savedSearch.name}`}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {hiddenExploreJobs.length > 0 && (
                            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                            <EyeOff size={14} className="text-accent" />
                                            <span>{hiddenExploreJobs.length} hidden from Explore</span>
                                        </div>
                                        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                                            Last hidden: {hiddenExploreJobs[0].title}{hiddenExploreJobs[0].companyName ? ` at ${hiddenExploreJobs[0].companyName}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={restoreLastHiddenExploreJob}
                                        >
                                            <Undo2 size={14} />
                                            Restore Last
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={restoreAllHiddenExploreJobs}
                                        >
                                            Restore All
                                        </Button>
                                    </div>
                                </div>
                                {(excludedExploreJobTypes.length > 0 || hiddenPreferenceInsights.length > 0) && (
                                    <div className="mt-3 space-y-2 border-t border-[var(--border-default)] pt-3">
                                        {excludedExploreJobTypes.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
                                                    <SlidersHorizontal size={13} className="text-accent" />
                                                    Current view
                                                </span>
                                                {excludedExploreJobTypes.map(jobType => (
                                                    <span key={jobType} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-xs text-accent">
                                                        {getHiddenExploreJobTypeLabel(jobType)} hidden
                                                        <button
                                                            type="button"
                                                            onClick={() => clearExcludedExploreJobType(jobType)}
                                                            className="rounded-full text-accent/80 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                                                            aria-label={`Clear ${getHiddenExploreJobTypeLabel(jobType)} preference filter`}
                                                        >
                                                            <XCircle size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {hiddenPreferenceInsights.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {hiddenPreferenceInsights.map(insight => (
                                                    <Button
                                                        key={insight.id}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => applyHiddenPreferenceInsight(insight)}
                                                        title={insight.description}
                                                    >
                                                        <SlidersHorizontal size={14} />
                                                        {insight.actionLabel}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {hiddenExploreJobsStatus && (
                            <p role="status" aria-live="polite" className="sr-only">
                                {hiddenExploreJobsStatus}
                            </p>
                        )}

                        {exploreProfileStatus && (
                            <p role="status" className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-3 py-2 text-xs text-[var(--text-secondary)]">
                                {exploreProfileStatus}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {activeTab === 'explore' && !isLoading && filteredJobs.length > 0 && (
                <div className="flex flex-col gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p role="status" aria-live="polite" className="text-xs text-[var(--text-secondary)]">
                        Showing <span className="font-medium text-[var(--text-primary)]">{firstJobIndex}-{lastJobIndex}</span>
                        {hasExactJobsTotal ? (
                            <>
                                {' '}of <span className="font-medium text-[var(--text-primary)]">{jobsTotalCount}</span>
                            </>
                        ) : null}
                        {' '}matching jobs
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor="jobs-page-size" className="text-xs font-medium text-[var(--text-secondary)]">Per page</label>
                        <select
                            id="jobs-page-size"
                            aria-label="Jobs per page"
                            className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            value={jobsPageSize}
                            onChange={(event) => {
                                setJobsPageSize(Number(event.target.value));
                                setJobsPage(1);
                            }}
                        >
                            {jobsPageSizeOptions.map(pageSize => (
                                <option key={pageSize} value={pageSize}>{pageSize}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setJobsPage(Math.max(1, normalizedJobsPage - 1))}
                                disabled={!canGoToPreviousJobsPage}
                                aria-label="Previous jobs page"
                            >
                                <ChevronLeft size={14} />
                            </Button>
                            <span className="min-w-16 text-center text-xs text-[var(--text-secondary)]">
                                Page {normalizedJobsPage}{hasExactJobsTotal ? ` of ${jobsTotalPages}` : ''}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setJobsPage(Math.min(jobsTotalPages, normalizedJobsPage + 1))}
                                disabled={!canGoToNextJobsPage}
                                aria-label="Next jobs page"
                            >
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <Skeleton className="w-10 h-10 rounded-lg" />
                                <div className="flex-1">
                                    <Skeleton className="h-4 w-3/4 mb-2" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                            <Skeleton className="h-3 w-full mb-2" />
                            <Skeleton className="h-3 w-2/3 mb-4" />
                            <Skeleton className="h-9 w-full" />
                        </Card>
                    ))}
                </div>
            ) : activeTab === 'applied' && applicationsLoadError && applications.length === 0 ? (
                <EmptyState
                    icon={<AlertCircle className="h-12 w-12" />}
                    title="Applications unavailable"
                    description={applicationsLoadError}
                    action={user?.id ? { label: 'Retry Applications', onClick: () => loadApplications(user.id) } : undefined}
                />
            ) : items.length === 0 ? (
                <EmptyState
                    title={activeTab === 'explore' ? 'No jobs found' : activeTab === 'postings' ? 'No recruiter postings yet' : 'No applications yet'}
                    description={activeTab === 'explore'
                        ? 'Try adjusting your search terms or filters.'
                        : activeTab === 'postings'
                            ? 'Create a reviewed draft to start tracking and publishing your roles.'
                            : 'Start exploring jobs to submit your first application.'}
                    action={activeTab === 'applied'
                        ? { label: 'Explore Jobs', onClick: () => setActiveTab('explore') }
                        : activeTab === 'postings'
                            ? { label: 'Create Draft', onClick: () => navigate('/jobs/post') }
                            : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item: Record<string, any>) => {
                        if (activeTab === 'postings') {
                            const salaryLabel = formatSalary(item);
                            const publishIssues = buildRecruiterPostingPublishIssues(item);
                            const isDraft = (item.status || '').toUpperCase() === 'DRAFT';

                            return (
                                <Card key={item.id} className="p-5 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold leading-snug">{item.title || 'Untitled role'}</h3>
                                                <p className="text-xs text-[var(--text-muted)]">{getRecruiterPostingCompanyName(item)}</p>
                                            </div>
                                            <Badge variant={getRecruiterPostingStatusVariant(item.status)}>
                                                {item.status || 'Draft'}
                                            </Badge>
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                                            <span className="flex items-center gap-1">
                                                <MapPin size={12} /> {item.location || 'Location not set'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Briefcase size={12} /> {getJobTypeLabel(getRecruiterPostingJobType(item))}
                                            </span>
                                            {salaryLabel && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign size={12} /> {salaryLabel}
                                                </span>
                                            )}
                                        </div>

                                        {isDraft && publishIssues.length > 0 && (
                                            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                                                {publishIssues.length} publish checklist {publishIssues.length === 1 ? 'item' : 'items'} need review.
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 border-t border-[var(--border-default)] pt-4">
                                        {isDraft ? (
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => navigate(`/jobs/post?draftId=${encodeURIComponent(item.id)}`)}
                                                >
                                                    <Pencil size={14} />
                                                    Edit Draft
                                                </Button>
                                                <Button size="sm" className="w-full" onClick={() => openPublishReview(item)}>
                                                    Review Publish
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" variant="outline" className="w-full" onClick={() => openPublishReview(item)}>
                                                View Checklist
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            );
                        }

                        const job = activeTab === 'explore' ? item : item.job;
                        if (!job) return null;
                        const salaryLabel = formatSalary(job);
                        const existingApplication = activeTab === 'explore' ? applicationsByJobId.get(job.id) : undefined;
                        const matchExplanation = activeTab === 'explore'
                            ? buildJobMatchExplanation(job, exploreProfile)
                            : null;

                        return (
                            <Card key={item.id} className="p-5 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                                {job.companyLogoUrl ? (
                                                    <img src={job.companyLogoUrl} alt={job.companyName} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Building2 size={18} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-semibold leading-snug">{job.title}</h3>
                                                <p className="text-xs text-[var(--text-muted)]">{job.companyName || 'Company'}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            {job.matchScore && (
                                                <Badge variant="success">{job.matchScore}%</Badge>
                                            )}
                                            {activeTab === 'explore' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    onClick={() => hideExploreJob(job)}
                                                    aria-label={`Hide ${job.title} from Explore`}
                                                >
                                                    <EyeOff size={13} />
                                                    Hide
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} /> {job.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Briefcase size={12} /> {getJobTypeLabel(job.jobType)}
                                        </span>
                                        {salaryLabel && (
                                            <span className="flex items-center gap-1">
                                                <DollarSign size={12} /> {salaryLabel}
                                            </span>
                                        )}
                                    </div>

                                    {matchExplanation && (
                                        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 p-3">
                                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                                                <Sparkles size={13} className="text-accent" />
                                                <span>{matchExplanation.label}</span>
                                            </div>
                                            {matchExplanation.reasons.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {matchExplanation.reasons.map(reason => (
                                                        <span key={reason} className="rounded-full bg-accent/10 px-2 py-1 text-[11px] leading-snug text-accent">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {!exploreProfileStatus && matchExplanation.missingSignals.length > 0 && (
                                                <p className="mt-2 text-xs text-[var(--text-muted)]">
                                                    {matchExplanation.missingSignals[0]}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                                    {activeTab === 'explore' ? (
                                        <Button
                                            variant={existingApplication ? 'outline' : 'default'}
                                            size="sm"
                                            className="w-full"
                                            disabled={isApplying === job.id}
                                            onClick={() => openApplicationModal(job)}
                                            isLoading={isApplying === job.id}
                                        >
                                            {existingApplication ? 'View Application' : 'Apply Now'}
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <Badge variant={getApplicationStatusVariant(item.status)}>
                                                {item.status || 'Pending'}
                                            </Badge>
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedApplication(item as JobApplication)}>Details</Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <AuraModal
                isOpen={Boolean(pendingPublishJob)}
                onClose={() => setPendingPublishJob(null)}
                title={isPendingPublishJobPublished ? 'Published Job Checklist' : 'Review Before Publishing'}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setPendingPublishJob(null)}>Close</Button>
                        {pendingPublishJob && !isPendingPublishJobPublished && (
                            pendingPublishIssues.length > 0 ? (
                                <Button onClick={editPendingPublishDraft}>
                                    Edit Draft
                                </Button>
                            ) : (
                                <Button
                                    onClick={publishRecruiterJob}
                                    isLoading={publishingJobId === pendingPublishJob.id}
                                >
                                    Publish Job
                                </Button>
                            )
                        )}
                    </>
                }
            >
                {pendingPublishJob && (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 p-3">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{pendingPublishJob.title || 'Untitled role'}</p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {getRecruiterPostingCompanyName(pendingPublishJob)} - {pendingPublishJob.location || 'Location not set'} - {getJobTypeLabel(getRecruiterPostingJobType(pendingPublishJob))}
                            </p>
                        </div>

                        {pendingPublishIssues.length > 0 ? (
                            <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                                <p className="text-sm font-medium text-warning">Publish checklist needs review</p>
                                <ul className="mt-2 space-y-1 text-sm text-warning">
                                    {pendingPublishIssues.map(issue => (
                                        <li key={issue} className="flex items-center gap-2">
                                            <Circle size={12} />
                                            <span>{issue}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-success/30 bg-success-muted p-3 text-sm text-success">
                                This draft has title, description, location, company context, and requirements.
                            </div>
                        )}

                        <p className="text-xs text-[var(--text-secondary)]">
                            Publishing makes this job visible in Explore. Required publish details are enforced before the status changes. No candidate is contacted automatically.
                        </p>
                    </div>
                )}
            </AuraModal>

            <AuraModal
                isOpen={isSaveSearchModalOpen}
                onClose={() => {
                    setIsSaveSearchModalOpen(false);
                    setSavedSearchAlertEnabled(false);
                }}
                title="Save Job Search"
                footer={
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsSaveSearchModalOpen(false);
                                setSavedSearchAlertEnabled(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSearch} disabled={savedSearchFilterCount === 0}>Save Search</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Search Name"
                        value={savedSearchName}
                        onChange={(e) => setSavedSearchName(e.target.value)}
                        placeholder="e.g. Remote frontend roles"
                    />
                    <label className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
                        <input
                            type="checkbox"
                            checked={savedSearchAlertEnabled}
                            onChange={(event) => setSavedSearchAlertEnabled(event.target.checked)}
                            className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--accent)]"
                        />
                        <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                            <Bell size={14} className="text-accent" />
                            Track new matches
                        </span>
                    </label>
                    {savedSearchAlertEnabled && !jobAlertsEnabled && (
                        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                            Job alert notifications are disabled in Settings. This search can still show new-match badges here.
                        </p>
                    )}
                    {savedSearchAlertEnabled && jobAlertsEnabled && (jobAlertDigestFrequency === 'daily' || jobAlertDigestFrequency === 'weekly') && (
                        <p role="status" className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                            Immediate alerts are paused by your {jobAlertDigestFrequency} digest setting. New matches will still be tracked for this search.
                        </p>
                    )}
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-secondary)]">
                        <p className="font-medium text-[var(--text-primary)]">Saved filters</p>
                        <p className="mt-1">
                            {[searchTerm.trim(), jobFilters.location.trim(), jobFilters.jobType ? getJobTypeLabel(jobFilters.jobType) : '', jobFilters.minSalary && `Min $${jobFilters.minSalary}`, jobFilters.maxSalary && `Max $${jobFilters.maxSalary}`]
                                .filter(Boolean)
                                .join(' - ')}
                        </p>
                    </div>
                </div>
            </AuraModal>

            <AuraModal
                isOpen={Boolean(savedSearchDeleteReview)}
                onClose={cancelSavedSearchDeleteReview}
                title="Delete Saved Search"
                footer={
                    <>
                        <Button variant="ghost" onClick={cancelSavedSearchDeleteReview}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmSavedSearchDelete}>
                            <Trash2 size={16} />
                            Delete Search
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <p className="text-sm text-[var(--text-secondary)]">
                        This removes <span className="font-medium text-[var(--text-primary)]">{savedSearchDeleteReview?.name || 'this saved search'}</span> from your saved searches.
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                        Saved filters and new-match tracking for this search will stop. Current Explore filters, job cards, applications, and hidden-job preferences are unchanged.
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                        If account sync is unavailable, the search is removed locally and a warning remains visible.
                    </p>
                </div>
            </AuraModal>

            <AuraModal
                isOpen={Boolean(selectedJob)}
                onClose={() => {
                    cancelApplicationDraftClearReview();
                    cancelProfileApplicationDraftReplaceReview();
                    setSelectedJob(null);
                }}
                title="Review Application"
                size="lg"
                footer={
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                cancelApplicationDraftClearReview();
                                cancelProfileApplicationDraftReplaceReview();
                                setSelectedJob(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleApply} isLoading={Boolean(selectedJob && isApplying === selectedJob.id)}>Submit Application</Button>
                    </>
                }
            >
                {selectedJob && (
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-semibold text-white">{selectedJob.title}</h4>
                                <Badge variant="outline">{getJobTypeLabel(selectedJob.jobType)}</Badge>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">{selectedJob.companyName || 'Company'} · {selectedJob.location || 'Location not listed'}</p>
                            {formatSalary(selectedJob) && (
                                <p className="text-sm text-[var(--text-secondary)]">{formatSalary(selectedJob)}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Application draft</p>
                                            <Badge variant={applicationDraftBadgeVariant}>
                                                {isLoadingApplicationDraft ? 'Loading profile' : applicationDraftMeta.source}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">{applicationDraftMeta.message}</p>
                                        {applicationDraftSavedAt && (
                                            <p className="text-xs text-[var(--text-muted)]">
                                                Draft saved {formatDraftSavedAt(applicationDraftSavedAt)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyProfileApplicationDraft()}
                                            disabled={!applicationDraftProfile || isLoadingApplicationDraft}
                                        >
                                            <Sparkles size={14} />
                                            Use Profile Draft
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={openApplicationDraftClearReview}
                                            disabled={!canClearApplicationDraft}
                                        >
                                            <Eraser size={14} />
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                                {profileApplicationDraftReplaceReview && (
                                    <div role="alert" className="mt-3 rounded-lg border border-accent/30 bg-accent/10 p-3">
                                        <p className="text-sm font-medium text-accent">Replace current draft with your profile draft?</p>
                                        <p className="mt-1 text-xs leading-relaxed text-accent">
                                            The current editable draft is kept in Recent draft versions before the profile draft is applied. Submit Application remains separate.
                                        </p>
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/50 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Current draft</p>
                                                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                                    {applicationDraft.resumeUrl.trim() ? 'Resume URL set' : 'No resume URL'} · {applicationDraft.coverLetter.trim() ? 'Cover letter set' : 'No cover letter'}
                                                </p>
                                            </div>
                                            <div className="rounded-md border border-accent/30 bg-[var(--bg-primary)]/50 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-accent">Profile draft</p>
                                                <p className="mt-1 text-xs text-[var(--text-primary)]">
                                                    {profileApplicationDraftReplaceReview.resumeUrl.trim() ? 'Resume URL included' : 'No resume URL'} · {profileApplicationDraftReplaceReview.coverLetter.trim() ? 'Cover letter included' : 'No cover letter'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                            <Button type="button" variant="ghost" size="sm" onClick={cancelProfileApplicationDraftReplaceReview}>
                                                Keep Current
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={confirmProfileApplicationDraftReplace}>
                                                <Sparkles size={14} />
                                                Replace Draft
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {isApplicationDraftClearReviewOpen && (
                                    <div role="alert" className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                                        <p className="text-sm font-medium text-warning">Clear this application draft?</p>
                                        <p className="mt-1 text-xs leading-relaxed text-warning">
                                            This clears the editable resume URL and cover letter fields. A before-clear draft version is kept in Recent draft versions for recovery. Nothing is submitted or sent to the employer.
                                        </p>
                                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                                            <Button type="button" variant="ghost" size="sm" onClick={cancelApplicationDraftClearReview}>
                                                Keep Draft
                                            </Button>
                                            <Button type="button" variant="destructive" size="sm" onClick={clearApplicationDraft}>
                                                <Eraser size={14} />
                                                Clear Draft
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {applicationDraftHistory.length > 0 && (
                                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-3">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-accent" />
                                        <p className="text-sm font-medium text-[var(--text-primary)]">Recent draft versions</p>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {applicationDraftHistory.slice(0, 3).map(entry => (
                                            <div key={entry.id} className="flex flex-col gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]/50 p-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant={entry.source === 'profile' ? 'success' : entry.source === 'ai' ? 'default' : 'outline'}>
                                                            {getApplicationDraftHistoryReasonLabel(entry.reason)}
                                                        </Badge>
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            {formatDraftSavedAt(entry.updatedAt)}
                                                        </span>
                                                    </div>
                                                    <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
                                                        {entry.coverLetter || entry.resumeUrl || 'Saved draft version'}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => restoreApplicationDraftHistoryEntry(entry)}
                                                >
                                                    Restore
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                                        Restoring replaces the editable draft only. Submit Application is still required.
                                    </p>
                                </div>
                            )}

                            {pendingAiApplicationDraft && hasApplicationAiDraftFields(pendingAiApplicationDraft) && (
                                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">AI application draft</p>
                                            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                                                Source: {pendingAiApplicationDraft.sourceLabel || 'TalentSphere AI assistant'}. Applying copies these fields into the editable draft only.
                                            </p>
                                        </div>
                                        <Badge variant="warning" className="w-fit shrink-0">Review before submit</Badge>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {pendingAiApplicationDraft.fields.map(field => (
                                            <div key={field.field} className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 p-2">
                                                <p className="text-xs font-medium text-[var(--text-primary)]">{field.label}</p>
                                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Current</p>
                                                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">{field.currentValue || 'Empty'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wide text-accent">AI draft</p>
                                                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">{field.proposedValue}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={dismissAiApplicationDraft}
                                        >
                                            Dismiss AI draft
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={applyAiApplicationDraft}
                                        >
                                            <Sparkles size={14} />
                                            Apply AI Draft
                                        </Button>
                                    </div>
                                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                                        Submit Application remains a separate confirmation after you review or edit the form.
                                    </p>
                                </div>
                            )}

                            <Input
                                label="Resume or Profile URL"
                                value={applicationDraft.resumeUrl}
                                onChange={(e) => setApplicationDraftField('resumeUrl', e.target.value)}
                                placeholder="https://..."
                                helperText="Optional. This can be a resume, portfolio, LinkedIn, or profile link."
                            />

                            <div className="flex flex-col gap-1.5 w-full">
                                <label htmlFor="cover-letter-draft" className="text-sm font-medium text-[var(--text-primary)]">Cover Letter</label>
                                <textarea
                                    id="cover-letter-draft"
                                    value={applicationDraft.coverLetter}
                                    onChange={(e) => setApplicationDraftField('coverLetter', e.target.value)}
                                    placeholder="Add a short note for the recruiter..."
                                    className="min-h-28 w-full rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-y"
                                />
                                <p className="text-xs text-[var(--text-muted)]">Optional. Review or edit this draft before submitting.</p>
                            </div>
                        </div>
                    </div>
                )}
            </AuraModal>

            <AuraModal
                isOpen={Boolean(selectedApplication)}
                onClose={() => setSelectedApplication(null)}
                title="Application Details"
                size="lg"
                footer={
                    <Button variant="outline" onClick={() => setSelectedApplication(null)}>Close</Button>
                }
            >
                {selectedApplication && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-semibold text-white">{selectedApplication.job?.title || 'Application'}</h4>
                                <Badge variant={getApplicationStatusVariant(selectedApplication.status)}>
                                    {selectedApplication.status || 'PENDING'}
                                </Badge>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {selectedApplication.job?.companyName || 'Company'} · Applied {formatApplicationDate(selectedApplication.appliedAt)}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h5 className="text-sm font-semibold text-[var(--text-primary)]">Status Timeline</h5>
                            <div className="space-y-3">
                                {isLoadingApplicationStatusEvents ? (
                                    <p className="text-sm text-[var(--text-muted)]">Loading status history...</p>
                                ) : selectedApplicationStatusEvents.length > 0 ? (
                                    selectedApplicationStatusEvents.map((event) => (
                                        <div key={event.id} className="flex gap-3">
                                            {event.status === 'REJECTED' ? (
                                                <XCircle size={18} className="mt-0.5 text-destructive shrink-0" />
                                            ) : (
                                                <CheckCircle2 size={18} className="mt-0.5 text-success shrink-0" />
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{event.status}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {event.reason || 'Application status updated'} · {formatDraftSavedAt(event.createdAt)}
                                                </p>
                                                {event.previousStatus && (
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        From {event.previousStatus} to {event.status}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : selectedApplication.status === 'REJECTED' ? (
                                    <div className="flex gap-3">
                                        <XCircle size={18} className="mt-0.5 text-destructive shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Rejected</p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                The recruiter closed this application. Event history is not available yet.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            Event history is not available yet, so this timeline is inferred from the current application status.
                                        </p>
                                        {applicationSteps.map((step) => {
                                            const currentIndex = applicationSteps.findIndex(item => item.status === selectedApplication.status);
                                            const stepIndex = applicationSteps.findIndex(item => item.status === step.status);
                                            const isComplete = stepIndex <= Math.max(currentIndex, 0);

                                            return (
                                                <div key={step.status} className="flex gap-3">
                                                    {isComplete ? (
                                                        <CheckCircle2 size={18} className="mt-0.5 text-success shrink-0" />
                                                    ) : (
                                                        <Circle size={18} className="mt-0.5 text-[var(--text-muted)] shrink-0" />
                                                    )}
                                                    <div>
                                                        <p className={`text-sm font-medium ${isComplete ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{step.label}</p>
                                                        <p className="text-xs text-[var(--text-muted)]">{step.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>

                        {(selectedApplication.resumeUrl || selectedApplication.coverLetter) && (
                            <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-[var(--text-primary)]">Submitted Details</h5>
                                {selectedApplication.resumeUrl && (
                                    <a href={selectedApplication.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline">
                                        Resume link
                                    </a>
                                )}
                                {selectedApplication.coverLetter && (
                                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{selectedApplication.coverLetter}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </AuraModal>
        </div>
    );
};

export default JobsPage;
