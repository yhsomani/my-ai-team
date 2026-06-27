import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { AuraModal } from '../../components/shared/AuraModal';
import { ArrowLeft, Briefcase, Building2, CheckCircle2, Copy, DollarSign, Eye, FileText, History, MapPin, RotateCcw, Save, Trash2 } from 'lucide-react';
import { jobService } from '../../services/jobService';
import { recruiterService } from '../../services/recruiterService';
import { companyService, type Company } from '../../services/companyService';
import { getCompanyProfileCompletion } from '../../lib/companyProfileCompletion';
import {
  applyJobPostTemplate,
  buildJobPostTemplateFromDraft,
  defaultJobPostDraft,
  getJobPostTemplateStorageKey,
  hasJobPostDraftContent,
  mergeJobPostTemplates,
  sanitizeJobPostTemplates,
  toJobPostRequirements,
  type JobPostFormDraft,
  type JobPostTemplate,
} from '../../lib/jobPostTemplates';
import {
  buildJobPostCompanyContextSummary,
  buildJobPostDraftChangeSummary,
  buildJobPostDuplicateMatches,
  buildJobPostDraftMissingFields,
  buildJobPostReviewSummary,
  canReviewJobPostDraft,
  type JobPostCompanyContext,
  type JobPostDuplicateCandidate,
} from '../../lib/jobPostReview';
import {
  appendJobPostDraftHistory,
  getJobPostDraftHistoryStorageKey,
  hasJobPostDraftHistoryContent,
  mergeJobPostDraftHistories,
  sanitizeJobPostDraftHistory,
  toJobPostDraftFromHistoryEntry,
  type JobPostDraftHistoryEntry,
  type JobPostDraftHistoryReason,
} from '../../lib/jobPostDraftHistory';
import { recordOnboardingAnalytics } from '../../lib/onboardingAnalytics';

const compact = (value?: string | null) => (value || '').trim();

const toJobPostDraftRequirementText = (requirements: unknown) => {
  if (Array.isArray(requirements)) {
    return requirements.map(requirement => compact(String(requirement))).filter(Boolean).join('\n');
  }

  return typeof requirements === 'string' ? requirements : '';
};

const toJobPostDraftNumberText = (value: unknown) => (
  value === undefined || value === null || value === '' ? '' : String(value)
);

const getJobDraftCompanyContext = (job: Record<string, any>): JobPostCompanyContext | null => {
  const id = compact(job.companyId || job.company_id);
  const name = compact(job.companyName || job.company?.name || job.companies?.name);

  if (!id && !name) return null;

  return { id, name: name || 'Attached company' };
};

const buildJobPostDraftFromJob = (job: Record<string, any>): JobPostFormDraft => ({
  title: job.title || '',
  description: job.description || '',
  location: job.location || '',
  jobType: job.jobType || job.job_type || defaultJobPostDraft.jobType,
  salaryMin: toJobPostDraftNumberText(job.salaryMin ?? job.salary_min),
  salaryMax: toJobPostDraftNumberText(job.salaryMax ?? job.salary_max),
  requirements: toJobPostDraftRequirementText(job.requirements),
});

const mapRecruiterJobToDuplicateCandidate = (job: Record<string, any>): JobPostDuplicateCandidate => ({
  id: compact(job.id),
  title: compact(job.title),
  location: compact(job.location),
  jobType: compact(job.jobType || job.job_type),
  job_type: compact(job.job_type || job.jobType),
  status: compact(job.status),
});

const defaultCompanyDraft = {
  name: '',
  industry: '',
  location: '',
  website: '',
  description: '',
  employeeCount: '',
};

const toCompanyDraft = (company?: Partial<Company> | null) => ({
  name: company?.name || '',
  industry: company?.industry || '',
  location: company?.location || '',
  website: company?.website || '',
  description: company?.description || '',
  employeeCount: toJobPostDraftNumberText(company?.employeeCount),
});

const parseCompanyEmployeeCount = (value: string) => {
  const trimmed = compact(value);
  if (!trimmed) return undefined;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const maxJobPostDraftHistory = 5;
const maxStoredJobPostDraftHistory = 50;
const unsavedJobPostDraftKey = 'new';

const formatDraftHistoryTime = (value: string) => (
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
);

const getDraftHistoryReasonLabel = (reason: JobPostDraftHistoryReason) => {
  switch (reason) {
    case 'template_applied':
      return 'Template applied';
    case 'reviewed':
      return 'Reviewed';
    case 'saved':
      return 'Saved';
    case 'restored':
      return 'Restored';
    case 'autosave':
    default:
      return 'Autosaved';
  }
};

const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector((state: any) => state.auth);
  const editingDraftId = searchParams.get('draftId') || '';
  const isEditingDraft = Boolean(editingDraftId);
  const isCompanySetupOnboarding = searchParams.get('companySetup') === '1' && !isEditingDraft;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(defaultJobPostDraft);
  const [templates, setTemplates] = useState<JobPostTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateDeleteReview, setTemplateDeleteReview] = useState<JobPostTemplate | null>(null);
  const [templateStatus, setTemplateStatus] = useState('');
  const [formStatus, setFormStatus] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [recruiterJobs, setRecruiterJobs] = useState<JobPostDuplicateCandidate[]>([]);
  const [duplicateCheckStatus, setDuplicateCheckStatus] = useState('');
  const [companyContext, setCompanyContext] = useState<JobPostCompanyContext | null>(null);
  const [attachCompany, setAttachCompany] = useState(false);
  const [companyStatus, setCompanyStatus] = useState('');
  const [companyDraft, setCompanyDraft] = useState(defaultCompanyDraft);
  const [companySetupStatus, setCompanySetupStatus] = useState('');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isSavingCompanyProfile, setIsSavingCompanyProfile] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Record<string, any> | null>(null);
  const [editDraftStatus, setEditDraftStatus] = useState('');
  const [draftHistory, setDraftHistory] = useState<JobPostDraftHistoryEntry[]>([]);
  const [draftHistoryStatus, setDraftHistoryStatus] = useState('');
  const templatesRef = useRef<JobPostTemplate[]>([]);
  const draftHistoryRef = useRef<JobPostDraftHistoryEntry[]>([]);
  const draftHistorySyncWarningRef = useRef(false);
  const templateSyncWarningRef = useRef(false);
  const companySetupAnalyticsTrackedRef = useRef(false);
  const templateStorageKey = useMemo(() => getJobPostTemplateStorageKey(user?.id), [user?.id]);
  const draftHistoryStorageKey = useMemo(() => getJobPostDraftHistoryStorageKey(user?.id), [user?.id]);
  const currentDraftKey = editingDraftId || unsavedJobPostDraftKey;
  const selectedTemplate = useMemo(
    () => templates.find(template => template.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );
  const reviewSummary = useMemo(() => buildJobPostReviewSummary(formData), [formData]);
  const originalEditDraft = useMemo(
    () => editingDraft ? buildJobPostDraftFromJob(editingDraft) : null,
    [editingDraft]
  );
  const originalEditCompanyContext = useMemo(
    () => editingDraft ? getJobDraftCompanyContext(editingDraft) : null,
    [editingDraft]
  );
  const companySummary = useMemo(
    () => buildJobPostCompanyContextSummary(companyContext, attachCompany),
    [attachCompany, companyContext]
  );
  const companyCompletion = useMemo(
    () => getCompanyProfileCompletion(companyDraft),
    [companyDraft]
  );
  const attachedCompanyId = attachCompany
    ? companyContext?.id || editingDraft?.companyId || editingDraft?.company_id
    : undefined;
  const editChangeSummary = useMemo(
    () => (isEditingDraft && originalEditDraft
      ? buildJobPostDraftChangeSummary(originalEditDraft, formData, {
        originalCompanyAttached: Boolean(originalEditCompanyContext?.id || originalEditCompanyContext?.name),
        originalCompanyId: originalEditCompanyContext?.id,
        originalCompanyLabel: originalEditCompanyContext?.name,
        nextCompanyAttached: companySummary.isAttached,
        nextCompanyId: attachedCompanyId,
        nextCompanyLabel: companySummary.label,
      })
      : []),
    [attachedCompanyId, companySummary, formData, isEditingDraft, originalEditCompanyContext, originalEditDraft]
  );
  const duplicateCandidates = useMemo(
    () => editingDraftId ? recruiterJobs.filter(job => job.id !== editingDraftId) : recruiterJobs,
    [editingDraftId, recruiterJobs]
  );
  const duplicateMatches = useMemo(
    () => buildJobPostDuplicateMatches(formData, duplicateCandidates),
    [duplicateCandidates, formData]
  );
  let primaryActionLabel = 'Review Draft';
  if (isEditingDraft) primaryActionLabel = 'Review Changes';
  if (isReviewing) {
    primaryActionLabel = duplicateMatches.length > 0
      ? (isEditingDraft ? 'Save Changes Anyway' : 'Save Draft Anyway')
      : (isEditingDraft ? 'Save Changes' : 'Save Draft');
    if (loading) primaryActionLabel = 'Saving...';
  }
  const pageTitle = isEditingDraft
    ? 'Edit Job Draft'
    : isCompanySetupOnboarding
      ? 'Set Up Company Context'
      : 'Create Job Draft';
  const pageDescription = isEditingDraft
    ? 'Update the saved draft, then publish separately from My Posts'
    : isCompanySetupOnboarding
      ? 'Create reusable company context first, then draft a role when ready'
      : 'Review role details before saving them to your jobs workspace';

  const readLocalTemplates = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(templateStorageKey);
      return stored ? sanitizeJobPostTemplates(JSON.parse(stored)) : [];
    } catch (error) {
      console.error('Failed to load job post templates:', error);
      setTemplateStatus('Saved templates could not be loaded in this browser.');
      return [];
    }
  }, [templateStorageKey]);

  const writeLocalTemplates = useCallback((nextTemplates: JobPostTemplate[]) => {
    const limitedTemplates = mergeJobPostTemplates(nextTemplates, [], 5);

    try {
      window.localStorage.setItem(templateStorageKey, JSON.stringify(limitedTemplates));
    } catch (error) {
      console.error('Failed to save job post templates:', error);
      setTemplateStatus('Template changes could not be saved in this browser.');
    }

    return limitedTemplates;
  }, [templateStorageKey]);

  const readAllLocalDraftHistory = useCallback(() => {
    if (!user?.id) return [];

    try {
      const stored = window.localStorage.getItem(draftHistoryStorageKey);
      return stored
        ? sanitizeJobPostDraftHistory(JSON.parse(stored), {
          recruiterId: user.id,
          maxItems: maxStoredJobPostDraftHistory,
        })
        : [];
    } catch (error) {
      console.error('Failed to load job-post draft history:', error);
      return [];
    }
  }, [draftHistoryStorageKey, user?.id]);

  const readLocalDraftHistory = useCallback((draftKey = currentDraftKey) => (
    sanitizeJobPostDraftHistory(readAllLocalDraftHistory(), {
      recruiterId: user?.id,
      draftKey,
      maxItems: maxJobPostDraftHistory,
    })
  ), [currentDraftKey, readAllLocalDraftHistory, user?.id]);

  const writeLocalDraftHistory = useCallback((nextHistory: JobPostDraftHistoryEntry[], draftKey = currentDraftKey) => {
    if (!user?.id) return;

    try {
      const sanitizedHistory = sanitizeJobPostDraftHistory(nextHistory, {
        recruiterId: user.id,
        draftKey,
        maxItems: maxJobPostDraftHistory,
      });
      const otherHistory = readAllLocalDraftHistory().filter(entry => entry.draftKey !== draftKey);
      const nextAllHistory = sanitizeJobPostDraftHistory([
        ...sanitizedHistory,
        ...otherHistory,
      ], {
        recruiterId: user.id,
        maxItems: maxStoredJobPostDraftHistory,
      });

      window.localStorage.setItem(draftHistoryStorageKey, JSON.stringify(nextAllHistory));
    } catch (error) {
      console.error('Failed to save job-post draft history:', error);
      setDraftHistoryStatus('Draft history could not be saved in this browser.');
    }
  }, [currentDraftKey, draftHistoryStorageKey, readAllLocalDraftHistory, user?.id]);

  const syncJobPostDraftHistoryEntry = useCallback(async (entry: JobPostDraftHistoryEntry) => {
    if (!user?.id) return;

    try {
      const syncedEntry = await jobService.saveJobPostDraftHistoryEntry(entry);
      draftHistorySyncWarningRef.current = false;

      const baseHistory = syncedEntry.draftKey === currentDraftKey
        ? draftHistoryRef.current
        : readLocalDraftHistory(syncedEntry.draftKey);
      const nextHistory = sanitizeJobPostDraftHistory([
        syncedEntry,
        ...baseHistory.filter(item => item.id !== syncedEntry.id),
      ], {
        recruiterId: user.id,
        draftKey: syncedEntry.draftKey,
        maxItems: maxJobPostDraftHistory,
      });

      if (syncedEntry.draftKey === currentDraftKey) {
        draftHistoryRef.current = nextHistory;
        setDraftHistory(nextHistory);
      }
      writeLocalDraftHistory(nextHistory, syncedEntry.draftKey);
      setDraftHistoryStatus('');
    } catch (error) {
      console.warn('Job-post draft history stored locally only:', error);
      if (!draftHistorySyncWarningRef.current) {
        draftHistorySyncWarningRef.current = true;
        setDraftHistoryStatus('Draft history saved locally. Account sync is unavailable.');
      }
    }
  }, [currentDraftKey, readLocalDraftHistory, user?.id, writeLocalDraftHistory]);

  const commitJobPostDraftHistory = useCallback((
    reason: JobPostDraftHistoryReason,
    draft = formData,
    options: {
      draftKey?: string;
      jobId?: string | null;
      companyId?: string | null;
      companyName?: string;
      companyAttached?: boolean;
    } = {}
  ) => {
    if (!user?.id || !hasJobPostDraftHistoryContent(draft)) return;

    const targetDraftKey = options.draftKey || currentDraftKey;
    const baseHistory = targetDraftKey === currentDraftKey
      ? draftHistoryRef.current
      : readLocalDraftHistory(targetDraftKey);
    const nextHistory = appendJobPostDraftHistory(baseHistory, {
      recruiterId: user.id,
      draftKey: targetDraftKey,
      jobId: options.jobId ?? (targetDraftKey === unsavedJobPostDraftKey ? null : targetDraftKey),
      draft,
      companyId: (options.companyAttached ?? companySummary.isAttached) ? options.companyId ?? attachedCompanyId ?? null : null,
      companyName: (options.companyAttached ?? companySummary.isAttached) ? options.companyName ?? companySummary.label : '',
      companyAttached: options.companyAttached ?? companySummary.isAttached,
      reason,
    }, {
      maxItems: maxJobPostDraftHistory,
    });
    const previousLatest = baseHistory[0];
    const nextLatest = nextHistory[0];

    if (targetDraftKey === currentDraftKey) {
      draftHistoryRef.current = nextHistory;
      setDraftHistory(nextHistory);
    }

    writeLocalDraftHistory(nextHistory, targetDraftKey);

    if (
      nextLatest &&
      (
        !previousLatest ||
        previousLatest.id !== nextLatest.id ||
        previousLatest.updatedAt !== nextLatest.updatedAt ||
        previousLatest.persistedTo !== nextLatest.persistedTo
      )
    ) {
      void syncJobPostDraftHistoryEntry(nextLatest);
    }
  }, [
    attachedCompanyId,
    companySummary.isAttached,
    companySummary.label,
    currentDraftKey,
    formData,
    readLocalDraftHistory,
    syncJobPostDraftHistoryEntry,
    user?.id,
    writeLocalDraftHistory,
  ]);

  useEffect(() => {
    const localTemplates = readLocalTemplates();
    templatesRef.current = localTemplates;
    setTemplates(localTemplates);
    setSelectedTemplateId('');
    setTemplateStatus(current => current === 'Saved templates could not be loaded in this browser.' ? current : '');

    if (!user?.id) return;

    let isCurrent = true;

    const loadAccountTemplates = async () => {
      try {
        const serverTemplates = await jobService.getJobPostTemplates(user.id, 5);
        if (!isCurrent) return;

        const fallbackTemplates = templatesRef.current.length > 0 ? templatesRef.current : localTemplates;
        const mergedTemplates = mergeJobPostTemplates(serverTemplates, fallbackTemplates, 5);
        templatesRef.current = mergedTemplates;
        setTemplates(mergedTemplates);
        writeLocalTemplates(mergedTemplates);
        templateSyncWarningRef.current = false;
        setTemplateStatus('');
      } catch (error) {
        if (!isCurrent) return;
        console.warn('Using local job-post template fallback:', error);
        setTemplateStatus(localTemplates.length > 0 ? 'Showing local templates. Account sync is unavailable.' : '');
      }
    };

    loadAccountTemplates();

    return () => {
      isCurrent = false;
    };
  }, [readLocalTemplates, user?.id, writeLocalTemplates]);

  useEffect(() => {
    if (!user?.id) {
      draftHistoryRef.current = [];
      setDraftHistory([]);
      setDraftHistoryStatus('');
      return;
    }

    const localHistory = readLocalDraftHistory(currentDraftKey);
    draftHistoryRef.current = localHistory;
    setDraftHistory(localHistory);

    let isCurrent = true;
    const loadAccountDraftHistory = async () => {
      try {
        const serverHistory = await jobService.getJobPostDraftHistory(user.id, currentDraftKey, maxJobPostDraftHistory);
        if (!isCurrent) return;

        const mergedHistory = mergeJobPostDraftHistories(serverHistory, draftHistoryRef.current, maxJobPostDraftHistory);
        draftHistoryRef.current = mergedHistory;
        setDraftHistory(mergedHistory);
        writeLocalDraftHistory(mergedHistory, currentDraftKey);
        setDraftHistoryStatus('');
      } catch (error) {
        console.warn('Using local job-post draft history fallback:', error);
        setDraftHistoryStatus(localHistory.length > 0 ? 'Showing local draft history. Account sync is unavailable.' : '');
      }
    };

    loadAccountDraftHistory();

    return () => {
      isCurrent = false;
    };
  }, [currentDraftKey, readLocalDraftHistory, user?.id, writeLocalDraftHistory]);

  useEffect(() => {
    if (!user?.id || isReviewing || !hasJobPostDraftHistoryContent(formData)) return;

    const autosaveTimer = window.setTimeout(() => {
      commitJobPostDraftHistory('autosave');
    }, 1000);

    return () => {
      window.clearTimeout(autosaveTimer);
    };
  }, [commitJobPostDraftHistory, formData, isReviewing, user?.id]);

  useEffect(() => {
    if (!isCompanySetupOnboarding || companySetupAnalyticsTrackedRef.current) return;

    companySetupAnalyticsTrackedRef.current = true;
    recordOnboardingAnalytics({
      userId: user?.id,
      action: 'company_setup_opened',
      accountType: 'RECRUITER',
      entryPoint: 'registration_or_dashboard_handoff',
      nextStepPath: '/jobs/post',
    });
  }, [isCompanySetupOnboarding, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setRecruiterJobs([]);
      return;
    }

    let isCurrent = true;

    recruiterService.getRecruiterJobs(user.id)
      .then((jobs) => {
        if (!isCurrent) return;
        setRecruiterJobs(jobs.map(mapRecruiterJobToDuplicateCandidate));
        setDuplicateCheckStatus('');

        if (!editingDraftId) {
          setEditingDraft(null);
          setEditDraftStatus('');
          return;
        }

        const draft = jobs.find((job: Record<string, any>) => job.id === editingDraftId);
        if (!draft) {
          setEditingDraft(null);
          setEditDraftStatus('This draft could not be found in your recruiter jobs.');
          return;
        }

        if ((draft.status || '').toUpperCase() !== 'DRAFT') {
          setEditingDraft(null);
          setEditDraftStatus('Only draft jobs can be edited here. Published jobs remain available from My Posts.');
          return;
        }

        const draftCompanyContext = getJobDraftCompanyContext(draft);
        setEditingDraft(draft);
        setFormData(buildJobPostDraftFromJob(draft));
        setCompanyContext(current => draftCompanyContext || current);
        setAttachCompany(Boolean(draftCompanyContext?.id));
        setIsReviewing(false);
        setFormStatus('Draft loaded. Review changes before saving; publishing remains a separate action.');
        setEditDraftStatus('Editing saved draft. Save Changes updates this draft instead of creating a duplicate.');
      })
      .catch((error) => {
        if (!isCurrent) return;
        console.error('Failed to check existing recruiter jobs:', error);
        setRecruiterJobs([]);
        setDuplicateCheckStatus('Existing job check is unavailable. Review this draft carefully before saving.');
      });

    return () => {
      isCurrent = false;
    };
  }, [editingDraftId, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setCompanyContext(null);
      setAttachCompany(false);
      setCompanyStatus('');
      setCompanySetupStatus('');
      return;
    }

    let isCurrent = true;
    setCompanyStatus('Checking recruiter company profile...');

    companyService.getCompanyByUser(user.id)
      .then((company) => {
        if (!isCurrent) return;
        setCompanyContext(company);
        setCompanyDraft(toCompanyDraft(company));
        setAttachCompany(current => isEditingDraft ? current : true);
        setCompanyStatus(isEditingDraft
          ? `${company.name} is available for this draft.`
          : isCompanySetupOnboarding
            ? `${company.name} is ready. Save any profile updates here or continue to the role draft.`
            : `${company.name} will be attached to this draft.`);
      })
      .catch((error) => {
        if (!isCurrent) return;
        console.warn('Failed to load recruiter company context:', error);
        if (!isEditingDraft) {
          setCompanyContext(null);
          setAttachCompany(false);
        }
        setCompanyStatus(isEditingDraft
          ? 'Company profile lookup is unavailable. Existing draft company context is preserved when available.'
          : isCompanySetupOnboarding
            ? 'No company profile is attached. Add company context here before drafting the first role, or skip for now.'
            : 'No company profile is attached. You can save this draft and attach company context before publishing.');
      });

    return () => {
      isCurrent = false;
    };
  }, [isCompanySetupOnboarding, isEditingDraft, user?.id]);

  useEffect(() => {
    if (companyContext?.id || companyDraft.location || !formData.location) return;
    if (formData.location.toLowerCase().includes('remote')) return;

    setCompanyDraft(current => ({ ...current, location: formData.location }));
  }, [companyContext?.id, companyDraft.location, formData.location]);

  const persistTemplates = useCallback((nextTemplates: JobPostTemplate[]) => {
    const limitedTemplates = writeLocalTemplates(nextTemplates);
    templatesRef.current = limitedTemplates;
    setTemplates(limitedTemplates);
    return limitedTemplates;
  }, [writeLocalTemplates]);

  const syncJobPostTemplate = useCallback(async (
    template: JobPostTemplate,
    baseTemplates: JobPostTemplate[]
  ) => {
    if (!user?.id) return;

    try {
      const syncedTemplate = await jobService.saveJobPostTemplate(user.id, {
        ...template,
        recruiterId: user.id,
      });
      templateSyncWarningRef.current = false;
      persistTemplates([
        syncedTemplate,
        ...baseTemplates.filter(item => item.id !== syncedTemplate.id),
      ]);
      setTemplateStatus(current => current.includes('Account sync is unavailable') ? '' : current);
    } catch (error) {
      console.warn('Job-post template stored locally only:', error);
      if (!templateSyncWarningRef.current) {
        templateSyncWarningRef.current = true;
        setTemplateStatus('Template saved locally. Account sync is unavailable.');
      }
    }
  }, [persistTemplates, user?.id]);

  const deleteSyncedJobPostTemplate = useCallback(async (template: JobPostTemplate) => {
    if (!user?.id) return;

    try {
      await jobService.deleteJobPostTemplate(user.id, template.id);
      templateSyncWarningRef.current = false;
      setTemplateStatus(current => current.includes('Account sync is unavailable') ? '' : current);
    } catch (error) {
      console.warn('Job-post template deleted locally only:', error);
      setTemplateStatus('Template deleted locally. Account sync is unavailable.');
    }
  }, [user?.id]);

  const saveCurrentAsTemplate = () => {
    if (!hasJobPostDraftContent(formData)) {
      setTemplateStatus('Add a title, description, location, or requirements before saving a template.');
      return;
    }

    const nextTemplate = {
      ...buildJobPostTemplateFromDraft(formData, selectedTemplate),
      recruiterId: user?.id || selectedTemplate?.recruiterId,
      persistedTo: 'local' as const,
    };
    const nextTemplates = persistTemplates([
      nextTemplate,
      ...templates.filter(template => template.id !== nextTemplate.id),
    ]);
    setSelectedTemplateId(nextTemplate.id);
    setTemplateStatus(`${nextTemplate.name} saved as a reusable draft. Review every field before saving.`);
    void syncJobPostTemplate(nextTemplate, nextTemplates);
  };

  const applySelectedTemplate = () => {
    if (!selectedTemplate) {
      setTemplateStatus('Select a saved template to insert into this form.');
      return;
    }

    const nextDraft = applyJobPostTemplate(selectedTemplate);
    setFormData(nextDraft);
    setIsReviewing(false);
    setFormStatus('');
    setTemplateStatus(`${selectedTemplate.name} inserted as an editable draft. Nothing has been posted.`);
    commitJobPostDraftHistory('template_applied', nextDraft);
  };

  const openTemplateDeleteReview = () => {
    if (!selectedTemplate) return;
    setTemplateDeleteReview(selectedTemplate);
  };

  const cancelTemplateDeleteReview = () => {
    setTemplateDeleteReview(null);
  };

  const confirmTemplateDelete = () => {
    if (!templateDeleteReview) return;
    const templateToDelete = templateDeleteReview;
    persistTemplates(templates.filter(template => template.id !== templateToDelete.id));
    setSelectedTemplateId('');
    setTemplateDeleteReview(null);
    setTemplateStatus(`${templateToDelete.name} template deleted. Current form fields are unchanged.`);
    void deleteSyncedJobPostTemplate(templateToDelete);
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((current) => ({ ...current, ...updates }));
    setFormStatus('');
    if (editDraftStatus) {
      setEditDraftStatus('Unsaved changes. Review before saving updates to this draft.');
    }
  };

  const updateCompanyAttachment = (checked: boolean) => {
    setAttachCompany(checked);
    if (!companyContext?.name) return;

    setCompanyStatus(checked
      ? `${companyContext.name} will be attached to this draft.`
      : `${companyContext.name} will not be attached to this draft.`);
  };

  const updateCompanyDraft = (updates: Partial<typeof companyDraft>) => {
    setCompanyDraft(current => ({ ...current, ...updates }));
    setCompanySetupStatus('');
  };

  const leaveCompanySetupForDashboard = () => {
    recordOnboardingAnalytics({
      userId: user?.id,
      action: 'company_setup_dashboard_clicked',
      accountType: 'RECRUITER',
      entryPoint: 'company_setup_onboarding',
      nextStepPath: '/dashboard',
      companyId: companyContext?.id,
    });
    navigate('/dashboard');
  };

  const continueCompanySetupToDraft = () => {
    recordOnboardingAnalytics({
      userId: user?.id,
      action: 'company_setup_role_draft_clicked',
      accountType: 'RECRUITER',
      entryPoint: 'company_setup_onboarding',
      nextStepPath: '/jobs/post',
      companyId: companyContext?.id,
    });
    navigate('/jobs/post');
  };

  const createAndAttachCompany = async () => {
    if (!user?.id) {
      setCompanySetupStatus('Sign in before creating a company profile.');
      return;
    }

    const name = compact(companyDraft.name);
    if (!name) {
      setCompanySetupStatus('Add a company name before creating company context.');
      return;
    }
    const employeeCount = parseCompanyEmployeeCount(companyDraft.employeeCount);
    if (companyDraft.employeeCount && employeeCount === null) {
      setCompanySetupStatus('Employee count must be a positive whole number.');
      return;
    }

    setIsCreatingCompany(true);
    try {
      const createdCompany = await companyService.registerCompany({
        name,
        description: compact(companyDraft.description) || undefined,
        industry: compact(companyDraft.industry) || undefined,
        location: compact(companyDraft.location) || undefined,
        website: compact(companyDraft.website) || undefined,
        employeeCount: employeeCount ?? undefined,
        ownerUserId: user.id,
      });

      setCompanyContext(createdCompany);
      setCompanyDraft(toCompanyDraft(createdCompany));
      setAttachCompany(true);
      setCompanyStatus(isCompanySetupOnboarding
        ? `${createdCompany.name} created. Continue to a role draft when you are ready.`
        : `${createdCompany.name} created and attached. Review remains required before saving.`);
      setCompanySetupStatus(isCompanySetupOnboarding
        ? `${createdCompany.name} created. No job draft was saved or published.`
        : `${createdCompany.name} created and attached. Review remains required before saving.`);
      recordOnboardingAnalytics({
        userId: user.id,
        action: 'company_setup_company_created',
        accountType: 'RECRUITER',
        companyId: createdCompany.id,
        entryPoint: isCompanySetupOnboarding ? 'company_setup_onboarding' : 'post_job_form',
        nextStepPath: '/jobs/post',
      });
    } catch (error) {
      console.error('Failed to create company context:', error);
      setCompanySetupStatus('Company profile could not be created. Review the details and try again.');
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const saveCompanyProfileDetails = async () => {
    if (!companyContext?.id) {
      setCompanySetupStatus('Create company context before saving company profile details.');
      return;
    }

    const name = compact(companyDraft.name);
    if (!name) {
      setCompanySetupStatus('Company name is required before saving profile details.');
      return;
    }
    const employeeCount = parseCompanyEmployeeCount(companyDraft.employeeCount);
    if (companyDraft.employeeCount && employeeCount === null) {
      setCompanySetupStatus('Employee count must be a positive whole number.');
      return;
    }

    setIsSavingCompanyProfile(true);
    try {
      const updatedCompany = await companyService.updateCompany(companyContext.id, {
        name,
        description: compact(companyDraft.description),
        industry: compact(companyDraft.industry),
        location: compact(companyDraft.location),
        website: compact(companyDraft.website),
        employeeCount: employeeCount ?? undefined,
      });

      setCompanyContext(updatedCompany);
      setCompanyDraft(toCompanyDraft(updatedCompany));
      setCompanyStatus(`${updatedCompany.name} profile details saved. Review remains required before job changes are saved.`);
      setCompanySetupStatus(`${updatedCompany.name} profile is ${getCompanyProfileCompletion(updatedCompany).percent}% complete.`);
      recordOnboardingAnalytics({
        userId: user?.id,
        action: 'company_setup_company_updated',
        accountType: 'RECRUITER',
        companyId: updatedCompany.id,
        entryPoint: isCompanySetupOnboarding ? 'company_setup_onboarding' : 'post_job_form',
        nextStepPath: '/jobs/post',
      });
    } catch (error) {
      console.error('Failed to update company profile:', error);
      setCompanySetupStatus('Company profile details could not be saved. Review the fields and try again.');
    } finally {
      setIsSavingCompanyProfile(false);
    }
  };

  const restoreJobPostDraftVersion = (entry: JobPostDraftHistoryEntry) => {
    const restoredDraft = toJobPostDraftFromHistoryEntry(entry);

    setFormData(restoredDraft);
    setIsReviewing(false);
    setFormStatus('Draft version restored. Review before saving; publishing remains separate.');
    setDraftHistoryStatus('Draft version restored into the editable form.');

    if (entry.companyAttached && (entry.companyId || entry.companyName)) {
      setCompanyContext(current => ({
        ...current,
        id: entry.companyId || current?.id,
        name: entry.companyName || current?.name || 'Attached company',
      }));
      setAttachCompany(true);
      setCompanyStatus(`${entry.companyName || 'Company context'} restored for this draft.`);
    } else {
      setAttachCompany(false);
      setCompanyStatus('No company context is attached to the restored draft.');
    }

    commitJobPostDraftHistory('restored', restoredDraft, {
      draftKey: entry.draftKey,
      jobId: entry.jobId || null,
      companyId: entry.companyId || null,
      companyName: entry.companyName,
      companyAttached: entry.companyAttached,
    });
  };

  const handleReviewDraft = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditingDraft && !editingDraft?.id) {
      setFormStatus('Load a valid draft before reviewing changes.');
      return;
    }

    const missingFields = buildJobPostDraftMissingFields(formData);

    if (missingFields.length > 0) {
      setFormStatus(`Complete ${missingFields.join(', ')} before reviewing this draft.`);
      return;
    }

    setIsReviewing(true);
    setFormStatus(isEditingDraft
      ? 'Review ready. Changes are not saved until you select Save Changes.'
      : 'Review ready. No job has been saved or published yet.');
    commitJobPostDraftHistory('reviewed');
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setFormStatus('Sign in before saving a job draft.');
      return;
    }

    if (isEditingDraft && !editingDraft?.id) {
      setIsReviewing(false);
      setFormStatus('Load a valid draft before saving changes.');
      return;
    }

    if (!canReviewJobPostDraft(formData)) {
      setIsReviewing(false);
      setFormStatus('Complete the required fields before saving this draft.');
      return;
    }

    setLoading(true);
    try {
      const jobPayload = {
        title: formData.title,
        description: formData.description,
        companyId: attachedCompanyId,
        location: formData.location,
        jobType: formData.jobType,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
        requirements: toJobPostRequirements(formData.requirements),
        status: 'DRAFT'
      };

      const savedJob = editingDraftId
        ? await jobService.updateJob(editingDraftId, {
          ...jobPayload,
          companyId: attachedCompanyId || null,
        })
        : await jobService.postJob(jobPayload, user.id);

      commitJobPostDraftHistory('saved', formData, {
        draftKey: savedJob.id || editingDraftId || currentDraftKey,
        jobId: savedJob.id || editingDraftId || null,
      });

      navigate('/jobs?tab=postings');
    } catch (err) {
      console.error(err);
      setFormStatus(isEditingDraft
        ? 'Draft changes could not be saved. Review the draft and try again.'
        : 'Draft could not be saved. Review the draft and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />

      {isCompanySetupOnboarding && !isReviewing && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Recruiter onboarding</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Set up reusable company context for job drafts and candidate review. Creating or updating company details here does not save a job draft, publish a role, contact candidates, or send notifications.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={leaveCompanySetupForDashboard}>
                Dashboard
              </Button>
              <Button type="button" size="sm" onClick={continueCompanySetupToDraft}>
                Continue to Role Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      <AuraModal
        isOpen={Boolean(templateDeleteReview)}
        onClose={cancelTemplateDeleteReview}
        title="Delete Job Template"
        footer={
          <>
            <Button variant="ghost" onClick={cancelTemplateDeleteReview}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmTemplateDelete}>
              <Trash2 size={16} className="mr-1.5" /> Delete Template
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            This removes <span className="font-medium text-[var(--text-primary)]">{templateDeleteReview?.name || 'this template'}</span> from your saved job templates.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Current form fields, draft history, saved jobs, published jobs, candidates, and notifications are unchanged.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            If account sync is unavailable, the template is removed locally and a status message remains visible.
          </p>
        </div>
      </AuraModal>

      <Card className="p-8">
        <form onSubmit={isReviewing ? handleSaveDraft : handleReviewDraft} className="space-y-6">
          {isReviewing ? (
            <section aria-labelledby="job-draft-review-heading" className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Draft review</p>
                  <h2 id="job-draft-review-heading" className="mt-1 text-2xl font-semibold text-white">
                    {reviewSummary.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {reviewSummary.jobTypeLabel} - {reviewSummary.location}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-200">
                  <CheckCircle2 size={16} />
                  {isEditingDraft ? 'Updates Draft' : 'Saves as Draft'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Salary range</p>
                  <p className="mt-1 text-sm text-slate-200">{reviewSummary.salaryLabel}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</p>
                  <p className="mt-1 text-sm text-slate-200">{reviewSummary.requirementCount} listed</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</p>
                  <p className="mt-1 text-sm text-slate-200">{companySummary.label}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">
                  {reviewSummary.descriptionPreview}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requirement preview</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {reviewSummary.requirements.map((requirement) => (
                    <li key={requirement} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-300" />
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {isEditingDraft && (
                <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                  <p className="text-sm font-semibold text-accent">Changes to save</p>
                  {editChangeSummary.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {editChangeSummary.map(change => (
                        <li key={change.label} className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)]">
                          <span className="font-medium text-white">{change.label}</span>
                          <span>
                            <span className="text-slate-400">{change.before}</span>
                            <span className="px-2 text-slate-500">to</span>
                            <span>{change.after}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">
                      No field changes detected. Save Changes will leave the draft content unchanged.
                    </p>
                  )}
                </div>
              )}

              {duplicateMatches.length > 0 && (
                <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Possible duplicate job</p>
                  <p className="mt-1 text-sm text-amber-100/80">
                    {duplicateMatches.length === 1
                      ? 'An active draft or published job already matches this title, location, and job type.'
                      : `${duplicateMatches.length} active drafts or published jobs already match this title, location, and job type.`}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-amber-50/90">
                    {duplicateMatches.map((match) => (
                      <li key={match.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                        <span>{match.title} - {match.location} - {match.jobTypeLabel}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide">{match.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ) : (
            <>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                {editDraftStatus && (
                  <p role="status" aria-live="polite" className="mb-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                    {editDraftStatus}
                  </p>
                )}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="job-template-select" className="block text-sm font-medium text-slate-300 mb-1">
                      Job templates
                    </label>
                    <select
                      id="job-template-select"
                      value={selectedTemplateId}
                      onChange={(event) => setSelectedTemplateId(event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                    >
                      <option value="">Select a saved template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.persistedTo === 'server' ? '(synced)' : '(local)'}
                        </option>
                      ))}
                    </select>
                    <p role="status" aria-live="polite" className="mt-2 text-xs text-slate-400">
                      {templateStatus || 'Templates sync to your recruiter account when available and remain editable drafts. Saving still requires review.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applySelectedTemplate}
                      disabled={!selectedTemplate}
                    >
                      <Copy size={14} />
                      Use Template
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={saveCurrentAsTemplate}
                      disabled={!hasJobPostDraftContent(formData)}
                    >
                      <Save size={14} />
                      Save Current
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={openTemplateDeleteReview}
                      disabled={!selectedTemplate}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              {(draftHistory.length > 0 || draftHistoryStatus) && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-slate-400" />
                    <p className="text-sm font-medium text-slate-200">Recent draft versions</p>
                  </div>
                  {draftHistoryStatus && (
                    <p role="status" aria-live="polite" className="mt-2 text-xs text-slate-400">
                      {draftHistoryStatus}
                    </p>
                  )}
                  {draftHistory.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {draftHistory.map(entry => (
                        <div key={entry.id} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{entry.title || 'Untitled role'}</p>
                            <p className="text-xs text-slate-400">
                              {getDraftHistoryReasonLabel(entry.reason)} - {entry.location || 'No location'} - {formatDraftHistoryTime(entry.updatedAt)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.persistedTo === 'server' ? 'Account synced' : 'Local only'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => restoreJobPostDraftVersion(entry)}
                          >
                            <RotateCcw size={14} />
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 flex-none text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">Company context</p>
                      <p className="mt-1 text-sm text-white">{companySummary.label}</p>
                      <p role="status" aria-live="polite" className="mt-1 text-xs text-slate-400">
                        {companyStatus || companySummary.detail}
                      </p>
                    </div>
                  </div>
                  {companyContext?.id && (
                    <label htmlFor="attach-company-context" className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        id="attach-company-context"
                        type="checkbox"
                        checked={attachCompany}
                        onChange={(event) => updateCompanyAttachment(event.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
                      />
                      Attach company
                    </label>
                  )}
                </div>

                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-200">Company profile details</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {companyCompletion.isComplete
                          ? 'Company profile details are complete.'
                          : `Missing ${companyCompletion.missingFields.join(', ')}.`}
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                      {companyCompletion.percent}% complete
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="company-name" className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
                      <input
                        id="company-name"
                        type="text"
                        value={companyDraft.name}
                        onChange={(event) => updateCompanyDraft({ name: event.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="e.g. Acme Labs"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-industry" className="block text-xs font-medium text-slate-300 mb-1">Industry</label>
                      <input
                        id="company-industry"
                        type="text"
                        value={companyDraft.industry}
                        onChange={(event) => updateCompanyDraft({ industry: event.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="e.g. Software"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-location" className="block text-xs font-medium text-slate-300 mb-1">Company Location</label>
                      <input
                        id="company-location"
                        type="text"
                        value={companyDraft.location}
                        onChange={(event) => updateCompanyDraft({ location: event.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder={formData.location || 'e.g. New York'}
                      />
                    </div>
                    <div>
                      <label htmlFor="company-website" className="block text-xs font-medium text-slate-300 mb-1">Website</label>
                      <input
                        id="company-website"
                        type="url"
                        value={companyDraft.website}
                        onChange={(event) => updateCompanyDraft({ website: event.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="company-employee-count" className="block text-xs font-medium text-slate-300 mb-1">Employee Count</label>
                      <input
                        id="company-employee-count"
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={companyDraft.employeeCount}
                        onChange={(event) => updateCompanyDraft({ employeeCount: event.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="e.g. 250"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="company-description" className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                      <textarea
                        id="company-description"
                        value={companyDraft.description}
                        onChange={(event) => updateCompanyDraft({ description: event.target.value })}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="Short company summary for candidates"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p role="status" aria-live="polite" className="text-xs text-slate-400">
                      {companySetupStatus || (companyContext?.id
                        ? 'Company profile changes save separately from this job draft.'
                        : 'Create company context here, then review the draft before saving.')}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={companyContext?.id ? saveCompanyProfileDetails : createAndAttachCompany}
                      disabled={!compact(companyDraft.name) || isCreatingCompany || isSavingCompanyProfile}
                      isLoading={companyContext?.id ? isSavingCompanyProfile : isCreatingCompany}
                    >
                      <Building2 size={14} />
                      {companyContext?.id ? 'Save Company Profile' : 'Create & Attach Company'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="job-title" className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      id="job-title"
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => updateFormData({ title: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                      placeholder="e.g. Senior Frontend Engineer"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="job-description" className="block text-sm font-medium text-slate-300 mb-1">Job Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                    <textarea
                      id="job-description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => updateFormData({ description: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent resize-none"
                      placeholder="Describe the role and responsibilities..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="job-location" className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        id="job-location"
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => updateFormData({ location: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="e.g. Remote, NY, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="job-type" className="block text-sm font-medium text-slate-300 mb-1">Job Type</label>
                    <select
                      id="job-type"
                      value={formData.jobType}
                      onChange={(e) => updateFormData({ jobType: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent appearance-none"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="job-salary-min" className="block text-sm font-medium text-slate-300 mb-1">Min Salary (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        id="job-salary-min"
                        type="number"
                        value={formData.salaryMin}
                        onChange={(e) => updateFormData({ salaryMin: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="e.g. 100000"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="job-salary-max" className="block text-sm font-medium text-slate-300 mb-1">Max Salary (USD)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        id="job-salary-max"
                        type="number"
                        value={formData.salaryMax}
                        onChange={(e) => updateFormData({ salaryMax: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent"
                        placeholder="e.g. 150000"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="job-requirements" className="block text-sm font-medium text-slate-300 mb-1">Requirements (One per line)</label>
                  <textarea
                    id="job-requirements"
                    rows={4}
                    required
                    value={formData.requirements}
                    onChange={(e) => updateFormData({ requirements: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent resize-none"
                    placeholder="- 5+ years React experience&#10;- Strong CS fundamentals&#10;..."
                  />
                </div>
              </div>
            </>
          )}

          {formStatus && (
            <p role="status" aria-live="polite" className="text-sm text-slate-300">
              {formStatus}
            </p>
          )}

          {duplicateCheckStatus && (
            <p role="status" aria-live="polite" className="text-sm text-amber-200">
              {duplicateCheckStatus}
            </p>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
            {isReviewing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsReviewing(false);
                  setFormStatus('');
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEditingDraft ? '/jobs?tab=postings' : '/jobs')}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              {isReviewing ? <Save className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {primaryActionLabel}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PostJobPage;
