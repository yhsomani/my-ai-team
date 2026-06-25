import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Briefcase, Building2, Filter, DollarSign, CheckCircle2, Circle, XCircle, Bookmark, BookmarkCheck, Trash2, Sparkles, Eraser } from 'lucide-react';
import { applicationService } from '../../services/applicationService';
import { jobService } from '../../services/jobService';
import { profileService } from '../../services/profileService';
import { Job, JobApplication } from '../../types/job';
import { useAppSelector } from '../../store/hooks';
import { useGetJobsQuery } from '../../store/slices/jobSlice';
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

type JobFilters = {
    jobType: string;
    location: string;
    minSalary: string;
    maxSalary: string;
};

interface SavedJobSearch {
    id: string;
    name: string;
    searchTerm: string;
    filters: JobFilters;
    createdAt: string;
    lastUsedAt?: string;
}

type ApplicationDraft = {
    resumeUrl: string;
    coverLetter: string;
};

type ApplicationDraftMeta = {
    source: 'manual' | 'profile' | 'unavailable' | 'error';
    message: string;
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
    const min = job.salaryMin;
    const max = job.salaryMax;
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `From ${formatter.format(min)}`;
    if (max) return `Up to ${formatter.format(max)}`;
    return null;
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

const getTabFromSearchParams = (searchParams: URLSearchParams) => (
    searchParams.get('tab') === 'applied' ? 'applied' : 'explore'
);

const sanitizeSavedSearches = (value: unknown): SavedJobSearch[] => {
    if (!Array.isArray(value)) return [];

    return value
        .filter((item): item is SavedJobSearch => {
            const candidate = item as Partial<SavedJobSearch>;
            return Boolean(
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
        })
        .slice(0, 10);
};

const JobsPage: React.FC = () => {
    const { user } = useAppSelector((state: RootState) => state.auth);
    const { addToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [searchTerm, setSearchTerm] = useState('');
    const [jobFilters, setJobFilters] = useState<JobFilters>(emptyJobFilters);
    const [activeTab, setActiveTabState] = useState(() => getTabFromSearchParams(searchParams));
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [isLoadingApplications, setIsLoadingApplications] = useState(false);
    const [isApplying, setIsApplying] = useState<string | null>(null);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
    const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>(emptyApplicationDraft);
    const [applicationDraftMeta, setApplicationDraftMeta] = useState<ApplicationDraftMeta>(defaultApplicationDraftMeta);
    const [applicationDraftProfile, setApplicationDraftProfile] = useState<Record<string, any> | null>(null);
    const [isLoadingApplicationDraft, setIsLoadingApplicationDraft] = useState(false);
    const applicationDraftTouchedRef = useRef(false);
    const [savedSearches, setSavedSearches] = useState<SavedJobSearch[]>([]);
    const [isSaveSearchModalOpen, setIsSaveSearchModalOpen] = useState(false);
    const [savedSearchName, setSavedSearchName] = useState('');

    const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
    const [isPostingJob, setIsPostingJob] = useState(false);
    const [jobData, setJobData] = useState({ title: '', description: '', company: '', location: '', type: 'FULL_TIME' });

    const minSalary = parseSalaryFilter(jobFilters.minSalary);
    const maxSalary = parseSalaryFilter(jobFilters.maxSalary);
    const savedSearchStorageKey = useMemo(() => getSavedSearchStorageKey(user?.id), [user?.id]);

    const setActiveTab = useCallback((nextTab: string) => {
        const normalizedTab = nextTab === 'applied' ? 'applied' : 'explore';
        const nextParams = new URLSearchParams(searchParams);

        setActiveTabState(normalizedTab);

        if (normalizedTab === 'applied') {
            nextParams.set('tab', 'applied');
        } else {
            nextParams.delete('tab');
        }

        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const nextTab = getTabFromSearchParams(searchParams);
        setActiveTabState(currentTab => currentTab === nextTab ? currentTab : nextTab);
    }, [searchParams]);

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

    const {
        data: jobs = [],
        isLoading: jobsLoading,
        isFetching: jobsFetching,
        refetch: refetchJobs,
    } = useGetJobsQuery(jobQueryParams);

    const loadApplications = useCallback(async (userId: string) => {
        setIsLoadingApplications(true);
        try {
            const data = await applicationService.getUserApplications(userId);
            setApplications(data);
        } catch (error) {
            console.error('Failed to load applications:', error);
            addToast({ type: 'error', title: 'Error', message: 'Failed to load applications. Please try again.' });
        } finally {
            setIsLoadingApplications(false);
        }
    }, [addToast]);

    useEffect(() => {
        if (activeTab === 'explore') {
            refetchJobs();
        }
    }, [activeTab, refetchJobs]);

    useEffect(() => {
        if (user?.id) {
            loadApplications(user.id);
        }
    }, [loadApplications, user?.id]);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(savedSearchStorageKey);
            setSavedSearches(stored ? sanitizeSavedSearches(JSON.parse(stored)) : []);
        } catch (error) {
            console.error('Failed to load saved job searches:', error);
            setSavedSearches([]);
        }
    }, [savedSearchStorageKey]);

    const persistSavedSearches = useCallback((nextSearches: SavedJobSearch[]) => {
        const limitedSearches = nextSearches.slice(0, 10);
        setSavedSearches(limitedSearches);

        try {
            window.localStorage.setItem(savedSearchStorageKey, JSON.stringify(limitedSearches));
        } catch (error) {
            console.error('Failed to save job searches:', error);
            addToast({ type: 'error', title: 'Saved search not stored', message: 'Your browser blocked local storage for this search.' });
        }
    }, [addToast, savedSearchStorageKey]);

    const setApplicationDraftField = (field: keyof ApplicationDraft, value: string) => {
        applicationDraftTouchedRef.current = true;
        setApplicationDraft(prev => ({ ...prev, [field]: value }));
        setApplicationDraftMeta({
            source: 'manual',
            message: 'You are editing this draft. Nothing is submitted until you click Submit Application.',
        });
    };

    const applyProfileApplicationDraft = useCallback((profile: Record<string, any> | null = applicationDraftProfile) => {
        if (!selectedJob || !profile) return;

        const nextDraft = buildProfileApplicationDraft(selectedJob, profile, user);
        setApplicationDraft(nextDraft);
        setApplicationDraftMeta({
            source: 'profile',
            message: 'Editable draft generated from your profile. Review or change it before submitting.',
        });
        applicationDraftTouchedRef.current = false;
    }, [applicationDraftProfile, selectedJob, user]);

    const clearApplicationDraft = () => {
        applicationDraftTouchedRef.current = true;
        setApplicationDraft(emptyApplicationDraft);
        setApplicationDraftMeta({
            source: 'manual',
            message: 'Draft cleared. Add details manually or reuse your profile draft.',
        });
    };

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
                        message: 'Profile draft is available. Use it only if you want to replace your current edits.',
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

        setSelectedJob(job);
        setApplicationDraft(emptyApplicationDraft);
        setApplicationDraftMeta(defaultApplicationDraftMeta);
        setApplicationDraftProfile(null);
        applicationDraftTouchedRef.current = false;
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
            addToast({ type: 'success', title: 'Application submitted successfully!' });
            setSelectedJob(null);
            setSelectedApplication(normalizedApplication);
        } catch (error) {
            console.error('Application failed:', error);
            addToast({ type: 'error', title: 'Application failed', message: 'Please try again later.' });
        } finally {
            setIsApplying(null);
        }
    };

    const handlePostJob = async () => {
        if (!jobData.title || !jobData.company || !jobData.location) {
            addToast({ type: 'warning', title: 'Missing fields', message: 'Please fill out all required fields.' });
            return;
        }
        setIsPostingJob(true);
        try {
            if (!user?.id) throw new Error('User not authenticated');
            await jobService.postJob({
                title: jobData.title,
                description: jobData.description || '',
                location: jobData.location,
                jobType: jobData.type,
                companyId: undefined // Will need to be set from company selection
            }, user.id);
            addToast({ type: 'success', title: 'Job posted successfully!' });
            setIsPostJobModalOpen(false);
            setJobData({ title: '', description: '', company: '', location: '', type: 'FULL_TIME' });
            refetchJobs(); // Refresh list
        } catch (error) {
            console.error('Failed to post job:', error);
            addToast({ type: 'error', title: 'Failed to post job', message: 'Please try again later.' });
        } finally {
            setIsPostingJob(false);
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setJobFilters(emptyJobFilters);
    };

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

    const activeFilterCount = [
        searchTerm.trim(),
        jobFilters.jobType,
        jobFilters.location.trim(),
        jobFilters.minSalary,
        jobFilters.maxSalary,
    ].filter(Boolean).length;

    const openSaveSearchModal = () => {
        if (activeFilterCount === 0) {
            addToast({ type: 'warning', title: 'No filters to save', message: 'Add a search term or filter before saving.' });
            return;
        }

        setSavedSearchName(buildDefaultSavedSearchName());
        setIsSaveSearchModalOpen(true);
    };

    const handleSaveSearch = () => {
        if (activeFilterCount === 0) return;

        const trimmedName = savedSearchName.trim() || buildDefaultSavedSearchName();
        const signature = JSON.stringify({ searchTerm: searchTerm.trim(), filters: jobFilters });
        const existingIndex = savedSearches.findIndex(savedSearch => JSON.stringify({
            searchTerm: savedSearch.searchTerm,
            filters: savedSearch.filters,
        }) === signature);
        const now = new Date().toISOString();
        const savedSearch: SavedJobSearch = {
            id: existingIndex >= 0 ? savedSearches[existingIndex].id : `search-${Date.now()}`,
            name: trimmedName,
            searchTerm: searchTerm.trim(),
            filters: { ...jobFilters },
            createdAt: existingIndex >= 0 ? savedSearches[existingIndex].createdAt : now,
        };
        const nextSearches = existingIndex >= 0
            ? savedSearches.map((item, index) => index === existingIndex ? savedSearch : item)
            : [savedSearch, ...savedSearches];

        persistSavedSearches(nextSearches);
        setIsSaveSearchModalOpen(false);
        setSavedSearchName('');
        addToast({ type: 'success', title: existingIndex >= 0 ? 'Saved search updated' : 'Search saved' });
    };

    const applySavedSearch = (savedSearch: SavedJobSearch) => {
        setActiveTab('explore');
        setSearchTerm(savedSearch.searchTerm);
        setJobFilters(savedSearch.filters);

        const now = new Date().toISOString();
        persistSavedSearches(savedSearches.map(item => (
            item.id === savedSearch.id ? { ...item, lastUsedAt: now } : item
        )));
        addToast({ type: 'success', title: 'Saved search applied' });
    };

    const deleteSavedSearch = (savedSearchId: string) => {
        persistSavedSearches(savedSearches.filter(savedSearch => savedSearch.id !== savedSearchId));
        addToast({ type: 'success', title: 'Saved search deleted' });
    };

    const filteredJobs = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return jobs.filter(job => {
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
    }, [jobs, jobFilters.jobType, jobFilters.location, maxSalary, minSalary, searchTerm]);

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

    const applicationsByJobId = useMemo(() => {
        return new Map(applications.map(application => [application.jobId, application]));
    }, [applications]);

    const isLoading = activeTab === 'explore' ? jobsLoading : isLoadingApplications;
    const items = activeTab === 'explore' ? filteredJobs : filteredApplications;
    const applicationDraftBadgeVariant = applicationDraftMeta.source === 'profile'
        ? 'success'
        : applicationDraftMeta.source === 'error'
            ? 'warning'
            : 'outline';
    const canClearApplicationDraft = Boolean(applicationDraft.resumeUrl.trim() || applicationDraft.coverLetter.trim());

    return (
        <div className="space-y-6">
            <PageHeader
                title="Jobs"
                description={user?.roles?.includes('ROLE_RECRUITER') ? "Manage your job postings and find top talent." : "Discover opportunities that match your skills and interests."}
                actions={
                    user?.roles?.includes('ROLE_RECRUITER') && (
                        <Button size="sm" onClick={() => setIsPostJobModalOpen(true)}>
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
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />

                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            aria-label={activeTab === 'explore' ? 'Search jobs' : 'Search applications'}
                            placeholder={activeTab === 'explore' ? 'Search jobs...' : 'Search applications...'}
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {activeTab === 'explore' && (
                    <div className="space-y-2">
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
                                <span>{jobsFetching ? 'Updating results...' : `${filteredJobs.length} matching ${filteredJobs.length === 1 ? 'job' : 'jobs'}`}</span>
                                {activeFilterCount > 0 && <Badge variant="outline">{activeFilterCount} active</Badge>}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full md:w-auto"
                                onClick={openSaveSearchModal}
                                disabled={activeFilterCount === 0}
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
                                                className="max-w-56 truncate px-3 py-1.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-accent/10"
                                                title={savedSearch.name}
                                            >
                                                {savedSearch.name}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteSavedSearch(savedSearch.id)}
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
                    </div>
                )}
            </div>

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
            ) : items.length === 0 ? (
                <EmptyState
                    title={activeTab === 'explore' ? 'No jobs found' : 'No applications yet'}
                    description={activeTab === 'explore' ? 'Try adjusting your search terms or filters.' : 'Start exploring jobs to submit your first application.'}
                    action={activeTab === 'applied' ? { label: 'Explore Jobs', onClick: () => setActiveTab('explore') } : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item: Record<string, any>) => {
                        const job = activeTab === 'explore' ? item : item.job;
                        if (!job) return null;
                        const salaryLabel = formatSalary(job);
                        const existingApplication = activeTab === 'explore' ? applicationsByJobId.get(job.id) : undefined;

                        return (
                            <Card key={item.id} className="p-5 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                                {job.companyLogoUrl ? (
                                                    <img src={job.companyLogoUrl} alt={job.companyName} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <Building2 size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold leading-snug">{job.title}</h3>
                                                <p className="text-xs text-[var(--text-muted)]">{job.companyName || 'Company'}</p>
                                            </div>
                                        </div>
                                        {job.matchScore && (
                                            <Badge variant="success">{job.matchScore}%</Badge>
                                        )}
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
                isOpen={isSaveSearchModalOpen}
                onClose={() => setIsSaveSearchModalOpen(false)}
                title="Save Job Search"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsSaveSearchModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSearch} disabled={activeFilterCount === 0}>Save Search</Button>
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
                isOpen={isPostJobModalOpen}
                onClose={() => setIsPostJobModalOpen(false)}
                title="Post a New Job"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsPostJobModalOpen(false)}>Cancel</Button>
                        <Button onClick={handlePostJob} isLoading={isPostingJob}>Post Job</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input 
                        label="Job Title" 
                        value={jobData.title} 
                        onChange={(e) => setJobData({ ...jobData, title: e.target.value })} 
                        placeholder="e.g. Senior Frontend Engineer" 
                    />
                    <Input 
                        label="Company Name" 
                        value={jobData.company} 
                        onChange={(e) => setJobData({ ...jobData, company: e.target.value })} 
                        placeholder="e.g. TechCorp Inc." 
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Location" 
                            value={jobData.location} 
                            onChange={(e) => setJobData({ ...jobData, location: e.target.value })} 
                            placeholder="e.g. Remote, NY" 
                        />
                        <div>
                            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Job Type</label>
                            <select 
                                className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                                value={jobData.type}
                                onChange={(e) => setJobData({ ...jobData, type: e.target.value })}
                            >
                                <option value="FULL_TIME">Full-time</option>
                                <option value="PART_TIME">Part-time</option>
                                <option value="CONTRACT">Contract</option>
                                <option value="FREELANCE">Freelance</option>
                                <option value="INTERNSHIP">Internship</option>
                            </select>
                        </div>
                    </div>
                </div>
            </AuraModal>

            <AuraModal
                isOpen={Boolean(selectedJob)}
                onClose={() => setSelectedJob(null)}
                title="Review Application"
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setSelectedJob(null)}>Cancel</Button>
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
                                            onClick={clearApplicationDraft}
                                            disabled={!canClearApplicationDraft}
                                        >
                                            <Eraser size={14} />
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            </div>

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
                                {selectedApplication.status === 'REJECTED' ? (
                                    <div className="flex gap-3">
                                        <XCircle size={18} className="mt-0.5 text-destructive shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Rejected</p>
                                            <p className="text-xs text-[var(--text-muted)]">The recruiter closed this application. You keep full control to apply elsewhere.</p>
                                        </div>
                                    </div>
                                ) : (
                                    applicationSteps.map((step) => {
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
                                    })
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
