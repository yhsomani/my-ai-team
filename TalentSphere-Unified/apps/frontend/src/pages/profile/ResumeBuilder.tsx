import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Clock, Copy, Download, ExternalLink, FileText, GripVertical, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { Tabs } from '../../components/shared/Tabs';
import { AuraModal } from '../../components/shared/AuraModal';
import { useToast } from '../../components/shared/Toast';
import { useAppSelector } from '../../store/hooks';
import { profileService } from '../../services/profileService';
import { fileUploadService } from '../../services/fileUploadService';
import { Skeleton } from '../../components/shared/Skeleton';
import {
  buildResumeExportRecord,
  mergeResumeExportHistories,
  sanitizeResumeExportHistory,
  type ResumeExportRecord,
} from '../../lib/resumeExportHistory';
import {
  buildResumeAiDraftSuggestion,
  getResumeAiDraftFormPatch,
  hasResumeAiDraftFields,
  type ResumeAiDraftSource,
  type ResumeAiDraftSuggestion,
} from '../../lib/resumeAiDrafts';
import { recordAiWorkflowPrefillDecision } from '../../lib/aiWorkflowPrefillAudit';
import {
  getImportDraftEntries,
  getResumeImportEducationSuggestions,
  getResumeImportExperienceSuggestions,
  getResumeImportSkillSuggestions,
  getResumeImportFileType,
  isSupportedResumeImportFile,
  parseResumeImportDraft,
  readResumeImportFileText,
  type ResumeImportDraft,
  type ResumeImportField,
} from '../../lib/resumeImportDrafts';
import {
  recordResumeWorkflowAnalytics,
  type ResumeWorkflowAnalyticsAction,
  type ResumeWorkflowSourceType,
} from '../../lib/resumeWorkflowAnalytics';
import { buildResumePdfBlob, type ResumePdfDocumentData } from '../../lib/resumePdfExport';
import {
  addResumeArtifactRecord,
  addResumeArtifactTombstone,
  buildResumeArtifactRecord,
  copyResumeArtifactUrl,
  filterDeletedResumeArtifacts,
  mergeResumeArtifactLibraries,
  removeResumeArtifactRecord,
  sanitizeResumeArtifactLibrary,
  sanitizeResumeArtifactTombstones,
  type ResumeArtifactRecord,
  type ResumeArtifactTombstone,
} from '../../lib/resumeArtifactLibrary';

interface ResumeDraft {
  fullName: string;
  email: string;
  headline: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
}

type ResumeRouteState = {
  aiResumeDraft?: ResumeAiDraftSource;
} | null;

const initialResumeDraft: ResumeDraft = {
  fullName: '',
  email: '',
  headline: '',
  phone: '',
  location: '',
  website: '',
  summary: '',
};

const getSkillName = (skill: Record<string, any> | string) => typeof skill === 'string' ? skill : skill.name;
const getExperienceStartDate = (experience: Record<string, any>) => experience.startDate || experience.start_date;
const getExperienceEndDate = (experience: Record<string, any>) => experience.endDate || experience.end_date;
const getEducationStartDate = (education: Record<string, any>) => education.startDate || education.start_date;
const getEducationEndDate = (education: Record<string, any>) => education.endDate || education.end_date;
const getResumeEducationRows = (profile: Record<string, any> | null) => profile?.education || profile?.educations || [];
const getResumeExportStorageKey = (userId: string) => `talentsphere:resume-export-history:${userId}`;
const getResumeArtifactStorageKey = (userId: string) => `talentsphere:resume-artifacts:${userId}`;
const getResumeArtifactTombstoneStorageKey = (userId: string) => `talentsphere:resume-artifact-deletions:${userId}`;
const maxResumeExportHistory = 5;
const maxResumeArtifactUploads = 5;
const resumeEditableFields: Array<keyof ResumeDraft> = ['headline', 'phone', 'location', 'website', 'summary'];
const getResumeWorkflowErrorCategory = (error: unknown, fallback = 'request_error') => {
  if (!error) return fallback;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('auth') || message.includes('login') || message.includes('sign in')) return 'auth_required';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return 'network_error';
  if (message.includes('storage') || message.includes('local')) return 'storage_error';
  if (message.includes('permission') || message.includes('forbidden')) return 'permission_denied';
  return fallback;
};
const getResumeWorkflowMetrics = (
  profile: Record<string, any> | null,
  exportHistoryCount?: number,
  artifactCount?: number
) => ({
  profileSkillCount: Array.isArray(profile?.skills) ? profile.skills.length : 0,
  experienceCount: Array.isArray(profile?.experiences) ? profile.experiences.length : 0,
  educationCount: Array.isArray(getResumeEducationRows(profile)) ? getResumeEducationRows(profile).length : 0,
  exportHistoryCount,
  artifactCount,
});
const getChangedResumeFields = (profile: Record<string, any> | null, draft: ResumeDraft) => (
  resumeEditableFields.filter(field => {
    const profileValue = field === 'summary' ? (profile?.summary || profile?.bio || '') : (profile?.[field] || '');
    return String(profileValue || '') !== String(draft[field] || '');
  })
);
const getImportSourceType = (pendingAiDraft: ResumeAiDraftSuggestion | null, importFileName: string): ResumeWorkflowSourceType => {
  if (pendingAiDraft) return 'ai_draft';
  return importFileName ? 'file_import' : 'manual_import';
};
const getFileTypeLabel = (file: Pick<File, 'name' | 'type'>) => {
  const importType = getResumeImportFileType(file);
  if (importType === 'docx') return 'docx';
  if (importType === 'pdf') return 'pdf';
  if (importType === 'markdown') return 'markdown';
  if (importType === 'text') return 'text';
  return file.type || 'unsupported';
};
const formatResumeDate = (date?: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const formatExportTime = (date: string) => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const getResumeFileStem = (name?: string) => {
  const normalized = (name || 'Resume')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'Resume';
};

const getExportStatusLabel = (record: ResumeExportRecord) => {
  if (record.status === 'blocked') return 'Blocked';
  if (record.method === 'provider-pdf') return 'Uploaded PDF';
  if (record.method === 'native-pdf') return 'Downloaded PDF';
  return record.method === 'html-download' ? 'Downloaded' : 'Print ready';
};

const escapeHtml = (value?: string | number | null) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const buildPrintableResume = (
  draft: ResumeDraft,
  experiences: Record<string, any>[],
  education: Record<string, any>[],
  skills: Array<Record<string, any> | string>,
  options: { autoPrint?: boolean } = {}
) => {
  const contact = [draft.location, draft.email, draft.phone, draft.website].filter(Boolean).map(escapeHtml).join(' | ');
  const printScript = options.autoPrint ? '<script>window.addEventListener(\'load\', function () { window.print(); });</script>' : '';
  const experienceHtml = experiences.length
    ? experiences.map((exp) => `
      <section class="item">
        <div class="item-header">
          <strong>${escapeHtml(exp.title)}</strong>
          <span>${escapeHtml(formatResumeDate(getExperienceStartDate(exp)))} - ${escapeHtml(exp.current ? 'Present' : formatResumeDate(getExperienceEndDate(exp)) || 'Present')}</span>
        </div>
        <div>${escapeHtml(exp.company)}${exp.location ? ` | ${escapeHtml(exp.location)}` : ''}</div>
        ${exp.description ? `<p>${escapeHtml(exp.description)}</p>` : ''}
      </section>
    `).join('')
    : '<p class="muted">No work experience added yet.</p>';
  const educationHtml = education.length
    ? education.map((edu) => `
      <section class="item">
        <div class="item-header">
          <strong>${escapeHtml(edu.degree || edu.fieldOfStudy || edu.field_of_study || 'Education')}</strong>
          <span>${escapeHtml(formatResumeDate(getEducationEndDate(edu) || getEducationStartDate(edu)))}</span>
        </div>
        <div>${escapeHtml(edu.institution)}</div>
      </section>
    `).join('')
    : '<p class="muted">No education added yet.</p>';
  const skillsHtml = skills.length
    ? `<div class="skills">${skills.map((skill) => `<span>${escapeHtml(getSkillName(skill))}</span>`).join('')}</div>`
    : '<p class="muted">No skills added yet.</p>';

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(draft.fullName || 'Resume')}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 40px; line-height: 1.5; }
          h1 { margin: 0; font-size: 28px; }
          h2 { margin: 28px 0 10px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #2563eb; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
          .headline, .contact, .muted { color: #6b7280; }
          .contact { margin-top: 6px; font-size: 12px; }
          .summary { white-space: pre-wrap; }
          .item { margin-bottom: 14px; }
          .item-header { display: flex; justify-content: space-between; gap: 16px; font-size: 14px; }
          .item p { margin: 6px 0 0; color: #374151; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; }
          .skills span { border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 8px; font-size: 12px; }
          @media print { body { margin: 24px; } }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(draft.fullName || 'Resume')}</h1>
          <div class="headline">${escapeHtml(draft.headline || 'Professional')}</div>
          <div class="contact">${contact}</div>
        </header>
        <h2>Summary</h2>
        <p class="summary">${escapeHtml(draft.summary || 'No summary provided.')}</p>
        <h2>Experience</h2>
        ${experienceHtml}
        <h2>Education</h2>
        ${educationHtml}
        <h2>Skills</h2>
        ${skillsHtml}
        ${printScript}
      </body>
    </html>
  `;
};

const buildResumePdfData = (
  draft: ResumeDraft,
  experiences: Record<string, any>[],
  education: Record<string, any>[],
  skills: Array<Record<string, any> | string>
): ResumePdfDocumentData => ({
  fullName: draft.fullName || 'Resume',
  headline: draft.headline || 'Professional',
  contactParts: [draft.location, draft.email, draft.phone, draft.website].filter(Boolean),
  summary: draft.summary || 'No summary provided.',
  experiences: experiences.map(exp => ({
    title: exp.title || 'Experience',
    subtitle: [exp.company, exp.location].filter(Boolean).join(' | '),
    meta: `${formatResumeDate(getExperienceStartDate(exp)) || 'Start'} - ${exp.current ? 'Present' : formatResumeDate(getExperienceEndDate(exp)) || 'Present'}`,
    description: exp.description,
  })),
  education: education.map(edu => ({
    title: edu.degree || edu.fieldOfStudy || edu.field_of_study || 'Education',
    subtitle: edu.institution,
    meta: formatResumeDate(getEducationEndDate(edu) || getEducationStartDate(edu)),
  })),
  skills: skills.map(getSkillName).filter(Boolean),
});

const ResumeBuilder: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as ResumeRouteState;
  const aiResumeDraftState = routeState?.aiResumeDraft;
  const [activeTab, setActiveTab] = useState('editor');
  const { addToast } = useToast();

  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft>(initialResumeDraft);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importDraft, setImportDraft] = useState<ResumeImportDraft | null>(null);
  const [selectedImportFields, setSelectedImportFields] = useState<ResumeImportField[]>([]);
  const [selectedImportSkills, setSelectedImportSkills] = useState<string[]>([]);
  const [selectedImportExperienceIds, setSelectedImportExperienceIds] = useState<string[]>([]);
  const [selectedImportEducationIds, setSelectedImportEducationIds] = useState<string[]>([]);
  const [isSavingImportSkills, setIsSavingImportSkills] = useState(false);
  const [isSavingImportRows, setIsSavingImportRows] = useState(false);
  const [pendingAiResumeDraft, setPendingAiResumeDraft] = useState<ResumeAiDraftSuggestion | null>(null);
  const [exportHistory, setExportHistory] = useState<ResumeExportRecord[]>([]);
  const [resumeArtifactUploads, setResumeArtifactUploads] = useState<ResumeArtifactRecord[]>([]);
  const [resumeArtifactDeletionReceipts, setResumeArtifactDeletionReceipts] = useState<ResumeArtifactTombstone[]>([]);
  const [isUploadingResumePdf, setIsUploadingResumePdf] = useState(false);
  const [copyingResumeArtifactUrl, setCopyingResumeArtifactUrl] = useState<string | null>(null);
  const [deletingResumeArtifactUrl, setDeletingResumeArtifactUrl] = useState<string | null>(null);
  const [pendingResumeArtifactDelete, setPendingResumeArtifactDelete] = useState<ResumeArtifactRecord | null>(null);
  const exportHistorySyncWarningRef = useRef(false);
  const resumeArtifactSyncWarningRef = useRef(false);

  const recordResumeAction = useCallback((
    action: ResumeWorkflowAnalyticsAction,
    extra: Omit<Parameters<typeof recordResumeWorkflowAnalytics>[0], 'action' | 'userId'> = {}
  ) => {
    recordResumeWorkflowAnalytics({
      userId: user?.id,
      action,
      ...extra,
    });
  }, [user?.id]);

  const getResumeAnalyticsContext = useCallback((
    entryPoint?: string,
    profileOverride: Record<string, any> | null = profile
  ) => ({
    entryPoint,
    ...getResumeWorkflowMetrics(profileOverride, exportHistory.length, resumeArtifactUploads.length),
  }), [exportHistory.length, profile, resumeArtifactUploads.length]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const data = await profileService.getProfile(user.id);
        setProfile(data);
        setResumeDraft({
          fullName: data?.fullName || data?.full_name || data?.profiles?.full_name || user.email?.split('@')[0] || '',
          email: data?.profiles?.email || user.email || '',
          headline: data?.headline || '',
          phone: data?.phone || '',
          location: data?.location || '',
          website: data?.website || '',
          summary: data?.summary || data?.bio || '',
        });
        recordResumeAction('resume_loaded', {
          entryPoint: 'page_load',
          ...getResumeWorkflowMetrics(data),
        });
      } catch (err) {
        console.error('Failed to fetch profile for resume:', err);
        recordResumeAction('resume_load_failed', {
          entryPoint: 'page_load',
          errorCategory: getResumeWorkflowErrorCategory(err, 'resume_load_failed'),
        });
        addToast({ type: 'error', title: 'Unable to load resume data', message: 'Please refresh and try again.' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [addToast, recordResumeAction, user]);

  const readLocalExportHistory = useCallback(() => {
    if (!user?.id) return [];

    try {
      const storedHistory = window.localStorage.getItem(getResumeExportStorageKey(user.id));
      return storedHistory
        ? sanitizeResumeExportHistory(JSON.parse(storedHistory), {
          userId: user.id,
          maxItems: maxResumeExportHistory,
        })
        : [];
    } catch (err) {
      console.error('Failed to load resume export history:', err);
      return [];
    }
  }, [user?.id]);

  const writeLocalExportHistory = useCallback((nextHistory: ResumeExportRecord[]) => {
    if (!user?.id) return;

    try {
      window.localStorage.setItem(getResumeExportStorageKey(user.id), JSON.stringify(
        sanitizeResumeExportHistory(nextHistory, {
          userId: user.id,
          maxItems: maxResumeExportHistory,
        })
      ));
    } catch (err) {
      console.error('Failed to save resume export history:', err);
    }
  }, [user?.id]);

  const readLocalResumeArtifacts = useCallback(() => {
    if (!user?.id) return [];

    try {
      const storedArtifacts = window.localStorage.getItem(getResumeArtifactStorageKey(user.id));
      return storedArtifacts
        ? sanitizeResumeArtifactLibrary(JSON.parse(storedArtifacts), {
          maxItems: maxResumeArtifactUploads,
        })
        : [];
    } catch (err) {
      console.error('Failed to load resume artifact library:', err);
      return [];
    }
  }, [user?.id]);

  const writeLocalResumeArtifacts = useCallback((nextArtifacts: ResumeArtifactRecord[]) => {
    if (!user?.id) return;

    try {
      window.localStorage.setItem(getResumeArtifactStorageKey(user.id), JSON.stringify(
        sanitizeResumeArtifactLibrary(nextArtifacts, {
          maxItems: maxResumeArtifactUploads,
        })
      ));
    } catch (err) {
      console.error('Failed to save resume artifact library:', err);
    }
  }, [user?.id]);

  const readLocalResumeArtifactTombstones = useCallback(() => {
    if (!user?.id) return [];

    try {
      const storedTombstones = window.localStorage.getItem(getResumeArtifactTombstoneStorageKey(user.id));
      return storedTombstones ? sanitizeResumeArtifactTombstones(JSON.parse(storedTombstones)) : [];
    } catch (err) {
      console.error('Failed to load resume artifact delete markers:', err);
      return [];
    }
  }, [user?.id]);

  const writeLocalResumeArtifactTombstones = useCallback((nextTombstones: ResumeArtifactTombstone[]) => {
    if (!user?.id) return;

    try {
      window.localStorage.setItem(
        getResumeArtifactTombstoneStorageKey(user.id),
        JSON.stringify(sanitizeResumeArtifactTombstones(nextTombstones))
      );
    } catch (err) {
      console.error('Failed to save resume artifact delete markers:', err);
    }
  }, [user?.id]);

  const syncExportRecord = useCallback(async (record: ResumeExportRecord) => {
    if (!user?.id) return;

    try {
      const syncedRecord = await profileService.saveResumeExportRecord(record);
      exportHistorySyncWarningRef.current = false;
      setExportHistory(prev => {
        const nextHistory = sanitizeResumeExportHistory([
          syncedRecord,
          ...prev.filter(item => item.id !== syncedRecord.id),
        ], {
          userId: user.id,
          maxItems: maxResumeExportHistory,
        });
        writeLocalExportHistory(nextHistory);
        return nextHistory;
      });
    } catch (error) {
      console.warn('Resume export history stored locally only:', error);
      if (!exportHistorySyncWarningRef.current) {
        exportHistorySyncWarningRef.current = true;
        recordResumeAction('resume_export_history_sync_failed', {
          ...getResumeAnalyticsContext('export_record_sync'),
          exportMethod: record.method,
          exportStatus: record.status,
          persistedTo: 'local',
          errorCategory: getResumeWorkflowErrorCategory(error, 'export_history_sync_failed'),
        });
        addToast({ type: 'warning', title: 'Export history saved locally', message: 'Account sync is unavailable for this export activity.' });
      }
    }
  }, [addToast, getResumeAnalyticsContext, recordResumeAction, user?.id, writeLocalExportHistory]);

  const syncResumeArtifactRecord = useCallback(async (artifact: ResumeArtifactRecord) => {
    if (!user?.id) return;

    try {
      const syncedArtifact = await profileService.saveResumeArtifactRecord({
        ...artifact,
        userId: user.id,
      });
      resumeArtifactSyncWarningRef.current = false;
      setResumeArtifactUploads(prev => {
        const nextArtifacts = addResumeArtifactRecord(prev, syncedArtifact, {
          maxItems: maxResumeArtifactUploads,
        });
        writeLocalResumeArtifacts(nextArtifacts);
        return nextArtifacts;
      });
    } catch (error) {
      console.warn('Resume artifact metadata stored locally only:', error);
      if (!resumeArtifactSyncWarningRef.current) {
        resumeArtifactSyncWarningRef.current = true;
        recordResumeAction('resume_artifact_sync_failed', {
          ...getResumeAnalyticsContext('artifact_sync'),
          exportMethod: 'provider-pdf',
          persistedTo: 'local',
          errorCategory: getResumeWorkflowErrorCategory(error, 'artifact_sync_failed'),
        });
        addToast({ type: 'warning', title: 'Artifact saved locally', message: 'Account sync is unavailable for this uploaded PDF link.' });
      }
    }
  }, [addToast, getResumeAnalyticsContext, recordResumeAction, user?.id, writeLocalResumeArtifacts]);

  const syncResumeArtifactDeleted = useCallback(async (
    artifact: ResumeArtifactRecord,
    deletedAt: string
  ) => {
    if (!user?.id) return;

    try {
      await profileService.markResumeArtifactDeleted({
        id: artifact.id,
        userId: user.id,
        deletedAt,
      });
      resumeArtifactSyncWarningRef.current = false;
    } catch (error) {
      console.warn('Resume artifact delete metadata stored locally only:', error);
      if (!resumeArtifactSyncWarningRef.current) {
        resumeArtifactSyncWarningRef.current = true;
        recordResumeAction('resume_artifact_sync_failed', {
          ...getResumeAnalyticsContext('artifact_delete_sync'),
          artifactCount: resumeArtifactUploads.length,
          exportMethod: 'provider-pdf',
          persistedTo: 'local',
          errorCategory: getResumeWorkflowErrorCategory(error, 'artifact_delete_sync_failed'),
        });
        addToast({ type: 'warning', title: 'Delete status saved locally', message: 'The artifact was removed here, but account sync is unavailable.' });
      }
    }
  }, [addToast, getResumeAnalyticsContext, recordResumeAction, resumeArtifactUploads.length, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setExportHistory([]);
      return;
    }

    const localHistory = readLocalExportHistory();
    setExportHistory(localHistory);

    let isActive = true;
    const loadAccountExportHistory = async () => {
      try {
        const serverHistory = await profileService.getResumeExportHistory(user.id, maxResumeExportHistory);
        if (!isActive) return;

        setExportHistory(prev => {
          const mergedHistory = mergeResumeExportHistories(serverHistory, prev, maxResumeExportHistory);
          writeLocalExportHistory(mergedHistory);
          recordResumeAction('resume_export_history_loaded', {
            entryPoint: 'page_load',
            exportHistoryCount: mergedHistory.length,
          });
          return mergedHistory;
        });
      } catch (error) {
        console.warn('Using local resume export history fallback:', error);
        recordResumeAction('resume_export_history_load_failed', {
          entryPoint: 'page_load',
          exportHistoryCount: localHistory.length,
          errorCategory: getResumeWorkflowErrorCategory(error, 'export_history_load_failed'),
        });
      }
    };

    loadAccountExportHistory();

    return () => {
      isActive = false;
    };
  }, [readLocalExportHistory, recordResumeAction, user?.id, writeLocalExportHistory]);

  useEffect(() => {
    if (!user?.id) {
      setResumeArtifactUploads([]);
      setResumeArtifactDeletionReceipts([]);
      return;
    }

    const localArtifacts = readLocalResumeArtifacts();
    const localTombstones = readLocalResumeArtifactTombstones();
    setResumeArtifactUploads(localArtifacts);
    setResumeArtifactDeletionReceipts(localTombstones.slice(0, 3));

    if (localArtifacts.length > 0) {
      recordResumeAction('resume_artifact_library_loaded', {
        entryPoint: 'page_load',
        artifactCount: localArtifacts.length,
      });
    }

    let isActive = true;
    const loadAccountResumeArtifacts = async () => {
      try {
        const serverArtifacts = await profileService.getResumeArtifacts(user.id, maxResumeArtifactUploads);
        if (!isActive) return;

        setResumeArtifactUploads(prev => {
          const filteredServerArtifacts = filterDeletedResumeArtifacts(serverArtifacts, localTombstones);
          const mergedArtifacts = mergeResumeArtifactLibraries(filteredServerArtifacts, prev, maxResumeArtifactUploads);
          writeLocalResumeArtifacts(mergedArtifacts);
          recordResumeAction('resume_artifact_library_loaded', {
            entryPoint: 'page_load',
            artifactCount: mergedArtifacts.length,
            persistedTo: 'server',
          });
          return mergedArtifacts;
        });
      } catch (error) {
        console.warn('Using local resume artifact library fallback:', error);
        recordResumeAction('resume_artifact_library_load_failed', {
          entryPoint: 'page_load',
          artifactCount: localArtifacts.length,
          persistedTo: 'local',
          errorCategory: getResumeWorkflowErrorCategory(error, 'artifact_library_load_failed'),
        });
      }
    };

    loadAccountResumeArtifacts();

    return () => {
      isActive = false;
    };
  }, [
    readLocalResumeArtifacts,
    readLocalResumeArtifactTombstones,
    recordResumeAction,
    user?.id,
    writeLocalResumeArtifacts,
  ]);

  const experiences = profile?.experiences || [];
  const education = profile?.education || profile?.educations || [];
  const skills = profile?.skills || [];
  const importDraftEntries = importDraft ? getImportDraftEntries(importDraft) : [];
  const importSkillSuggestions = importDraft ? getResumeImportSkillSuggestions(importDraft, skills) : [];
  const importExperienceSuggestions = importDraft ? getResumeImportExperienceSuggestions(importDraft, experiences) : [];
  const importEducationSuggestions = importDraft ? getResumeImportEducationSuggestions(importDraft, education) : [];
  const selectedImportFieldCount = importDraftEntries.filter(entry => selectedImportFields.includes(entry.key)).length;
  const selectedImportSkillCount = importSkillSuggestions.filter(skill => selectedImportSkills.includes(skill)).length;
  const selectedImportExperienceCount = importExperienceSuggestions.filter(experience => selectedImportExperienceIds.includes(experience.id)).length;
  const selectedImportEducationCount = importEducationSuggestions.filter(educationRow => selectedImportEducationIds.includes(educationRow.id)).length;
  const selectedImportProfileRowCount = selectedImportExperienceCount + selectedImportEducationCount;
  const isDeletingPendingResumeArtifact = Boolean(
    pendingResumeArtifactDelete && deletingResumeArtifactUrl === pendingResumeArtifactDelete.url
  );

  useEffect(() => {
    if (!aiResumeDraftState?.recommendationText || loading) return;

    navigate(location.pathname, { replace: true, state: null });

    const draft = buildResumeAiDraftSuggestion(resumeDraft, aiResumeDraftState);
    if (!hasResumeAiDraftFields(draft)) {
      recordResumeAction('resume_ai_draft_review_failed', {
        ...getResumeAnalyticsContext('ai_handoff'),
        sourceType: 'ai_draft',
        errorCategory: 'no_structured_fields',
      });
      addToast({
        type: 'info',
        title: 'Resume Builder opened',
        message: 'The AI recommendation did not include structured Headline, Phone, Location, Website, or Summary fields to pre-fill.'
      });
      return;
    }

    const patch = getResumeAiDraftFormPatch(draft);
    const entries = getImportDraftEntries(patch);
    setPendingAiResumeDraft(draft);
    setImportText(aiResumeDraftState.recommendationText);
    setImportFileName('');
    setImportDraft(patch);
    setSelectedImportFields(entries.map(entry => entry.key));
    setSelectedImportSkills([]);
    setSelectedImportExperienceIds([]);
    setSelectedImportEducationIds([]);
    setIsImportModalOpen(true);
    setActiveTab('editor');
    recordResumeAction('resume_ai_draft_review_opened', {
      ...getResumeAnalyticsContext('ai_handoff'),
      sourceType: 'ai_draft',
      fieldKeys: entries.map(entry => entry.key),
      detectedFieldCount: entries.length,
      selectedFieldCount: entries.length,
      detectedExperienceCount: 0,
      selectedExperienceCount: 0,
      detectedEducationCount: 0,
      selectedEducationCount: 0,
      aiFieldCount: draft.fields.length,
      inputLength: aiResumeDraftState.recommendationText.length,
    });
    addToast({
      type: 'info',
      title: 'AI resume draft ready',
      message: 'Review and select suggested fields before applying them to the editor.'
    });
  }, [addToast, aiResumeDraftState, getResumeAnalyticsContext, loading, location.pathname, navigate, recordResumeAction, resumeDraft]);

  const recordResumeAiDraftDecision = (
    decision: 'used' | 'rejected',
    metadata?: Record<string, unknown>
  ) => {
    if (!pendingAiResumeDraft) return;

    recordAiWorkflowPrefillDecision({
      userId: user?.id,
      suggestionId: pendingAiResumeDraft.recommendationId,
      workflow: 'resume',
      decision,
      sourceLabel: pendingAiResumeDraft.sourceLabel,
      metadata: {
        fieldCount: pendingAiResumeDraft.fields.length,
        fields: pendingAiResumeDraft.fields.map(field => field.field),
        ...metadata,
      },
    });
  };

  const resetImportModalState = () => {
    setIsImportModalOpen(false);
    if (pendingAiResumeDraft) {
      setImportText('');
      setImportFileName('');
      setImportDraft(null);
      setSelectedImportFields([]);
      setSelectedImportSkills([]);
      setSelectedImportExperienceIds([]);
      setSelectedImportEducationIds([]);
    }
    setPendingAiResumeDraft(null);
  };

  const closeImportModal = () => {
    const sourceType = getImportSourceType(pendingAiResumeDraft, importFileName);
    recordResumeAction(pendingAiResumeDraft ? 'resume_ai_draft_discarded' : 'resume_import_cancelled', {
      ...getResumeAnalyticsContext('import_modal'),
      sourceType,
      fieldKeys: importDraftEntries.map(entry => entry.key),
      detectedFieldCount: importDraftEntries.length,
      selectedFieldCount: selectedImportFieldCount,
      detectedSkillCount: importSkillSuggestions.length,
      selectedSkillCount: selectedImportSkillCount,
      detectedExperienceCount: importExperienceSuggestions.length,
      selectedExperienceCount: selectedImportExperienceCount,
      detectedEducationCount: importEducationSuggestions.length,
      selectedEducationCount: selectedImportEducationCount,
      aiFieldCount: pendingAiResumeDraft?.fields.length,
      inputLength: importText.length,
    });
    recordResumeAiDraftDecision('rejected', { decisionReason: 'cancel' });
    resetImportModalState();
  };

  const openImportModal = () => {
    recordResumeAction('resume_import_opened', getResumeAnalyticsContext('page_header'));
    setIsImportModalOpen(true);
  };

  const handleResumeTabChange = (tabId: string) => {
    recordResumeAction('resume_tab_selected', {
      ...getResumeAnalyticsContext('resume_tabs'),
      tabId,
    });
    setActiveTab(tabId);
  };

  const handleToggleImportField = (field: ResumeImportField) => {
    setSelectedImportFields(prev =>
      prev.includes(field) ? prev.filter(item => item !== field) : [...prev, field]
    );
  };

  const handleToggleImportSkill = (skill: string) => {
    setSelectedImportSkills(prev =>
      prev.includes(skill) ? prev.filter(item => item !== skill) : [...prev, skill]
    );
  };

  const handleToggleImportExperience = (experienceId: string) => {
    setSelectedImportExperienceIds(prev =>
      prev.includes(experienceId) ? prev.filter(item => item !== experienceId) : [...prev, experienceId]
    );
  };

  const handleToggleImportEducation = (educationId: string) => {
    setSelectedImportEducationIds(prev =>
      prev.includes(educationId) ? prev.filter(item => item !== educationId) : [...prev, educationId]
    );
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!isSupportedResumeImportFile(file)) {
      recordResumeAction('resume_import_file_unsupported', {
        ...getResumeAnalyticsContext('import_modal'),
        sourceType: 'file_import',
        fileType: getFileTypeLabel(file),
        unsupportedFileType: true,
        errorCategory: 'unsupported_file_type',
      });
      addToast({ type: 'warning', title: 'Unsupported file', message: 'Upload a .txt, .md, .docx, or searchable .pdf resume file, or paste the resume text instead.' });
      return;
    }

    try {
      const fileText = await readResumeImportFileText(file);
      setImportText(fileText);
      setImportFileName(file.name);
      setImportDraft(null);
      setSelectedImportFields([]);
      setSelectedImportSkills([]);
      setSelectedImportExperienceIds([]);
      setSelectedImportEducationIds([]);
      setPendingAiResumeDraft(null);
      recordResumeAction('resume_import_file_loaded', {
        ...getResumeAnalyticsContext('import_modal'),
        sourceType: 'file_import',
        inputLength: fileText.length,
        fileType: getFileTypeLabel(file),
      });
      addToast({ type: 'success', title: 'File loaded', message: 'Review the imported text, then generate a draft.' });
    } catch (err) {
      console.error('Failed to read resume import file:', err);
      recordResumeAction('resume_import_file_failed', {
        ...getResumeAnalyticsContext('import_modal'),
        sourceType: 'file_import',
        fileType: getFileTypeLabel(file),
        errorCategory: 'file_read_failed',
      });
      addToast({ type: 'error', title: 'File read failed', message: 'Please try another supported file, or paste the resume text. Scanned image-only PDFs need manual text paste.' });
    }
  };

  const handleImportTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;
    if (pendingAiResumeDraft) {
      recordResumeAction('resume_ai_draft_discarded', {
        ...getResumeAnalyticsContext('import_text_edit'),
        sourceType: 'ai_draft',
        fieldKeys: importDraftEntries.map(entry => entry.key),
        detectedFieldCount: importDraftEntries.length,
        selectedFieldCount: selectedImportFieldCount,
        detectedSkillCount: importSkillSuggestions.length,
        selectedSkillCount: selectedImportSkillCount,
        detectedExperienceCount: importExperienceSuggestions.length,
        selectedExperienceCount: selectedImportExperienceCount,
        detectedEducationCount: importEducationSuggestions.length,
        selectedEducationCount: selectedImportEducationCount,
        aiFieldCount: pendingAiResumeDraft.fields.length,
        inputLength: importText.length,
      });
      recordResumeAiDraftDecision('rejected', { decisionReason: 'manual_import_text_edit' });
    }

    setImportText(nextValue);
    setImportFileName('');
    setImportDraft(null);
    setSelectedImportFields([]);
    setSelectedImportSkills([]);
    setSelectedImportExperienceIds([]);
    setSelectedImportEducationIds([]);
    setPendingAiResumeDraft(null);
  };

  const addExportRecord = (record: Omit<ResumeExportRecord, 'id' | 'createdAt' | 'userId' | 'persistedTo'>) => {
    if (!user?.id) return;

    const nextRecord = buildResumeExportRecord({
      ...record,
      userId: user.id,
    });

    setExportHistory(prev => {
      const nextHistory = sanitizeResumeExportHistory([nextRecord, ...prev], {
        userId: user.id,
        maxItems: maxResumeExportHistory,
      });
      writeLocalExportHistory(nextHistory);
      return nextHistory;
    });
    void syncExportRecord(nextRecord);
  };

  const handleAnalyzeImport = () => {
    if (!importText.trim()) {
      recordResumeAction('resume_import_analysis_failed', {
        ...getResumeAnalyticsContext('import_modal'),
        sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
        inputLength: importText.length,
        errorCategory: 'missing_resume_text',
      });
      addToast({ type: 'warning', title: 'Resume text required', message: 'Paste resume text before generating a draft.' });
      return;
    }

    const parsedDraft = parseResumeImportDraft(importText);
    const entries = getImportDraftEntries(parsedDraft);
    const skillSuggestions = getResumeImportSkillSuggestions(parsedDraft, skills);
    const experienceSuggestions = getResumeImportExperienceSuggestions(parsedDraft, experiences);
    const educationSuggestions = getResumeImportEducationSuggestions(parsedDraft, education);
    setPendingAiResumeDraft(null);
    setImportDraft(parsedDraft);
    setSelectedImportFields(entries.map(entry => entry.key));
    setSelectedImportSkills(skillSuggestions);
    setSelectedImportExperienceIds(experienceSuggestions.map(experience => experience.id));
    setSelectedImportEducationIds(educationSuggestions.map(educationRow => educationRow.id));

    if (entries.length === 0 && skillSuggestions.length === 0 && experienceSuggestions.length === 0 && educationSuggestions.length === 0) {
      recordResumeAction('resume_import_analysis_failed', {
        ...getResumeAnalyticsContext('import_modal'),
        sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
        inputLength: importText.length,
        detectedFieldCount: 0,
        detectedSkillCount: 0,
        detectedExperienceCount: 0,
        detectedEducationCount: 0,
        errorCategory: 'no_supported_fields',
      });
      addToast({ type: 'warning', title: 'No supported fields found', message: 'Try text with a summary, contact details, skills, work experience, or education section.' });
      return;
    }

    recordResumeAction('resume_import_analyzed', {
      ...getResumeAnalyticsContext('import_modal'),
      sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
      inputLength: importText.length,
      fieldKeys: entries.map(entry => entry.key),
      detectedFieldCount: entries.length,
      selectedFieldCount: entries.length,
      detectedSkillCount: skillSuggestions.length,
      selectedSkillCount: skillSuggestions.length,
      detectedExperienceCount: experienceSuggestions.length,
      selectedExperienceCount: experienceSuggestions.length,
      detectedEducationCount: educationSuggestions.length,
      selectedEducationCount: educationSuggestions.length,
    });
    addToast({ type: 'success', title: 'Draft ready', message: 'Review the detected fields before applying them to the editor.' });
  };

  const handleApplyImportDraft = () => {
    if (!importDraft) return;
    const selectedEntries = getImportDraftEntries(importDraft).filter(entry => selectedImportFields.includes(entry.key));

    if (selectedEntries.length === 0) {
      recordResumeAction('resume_import_apply_failed', {
        ...getResumeAnalyticsContext('import_modal'),
        sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
        detectedFieldCount: importDraftEntries.length,
        selectedFieldCount: 0,
        detectedSkillCount: importSkillSuggestions.length,
        selectedSkillCount: selectedImportSkillCount,
        detectedExperienceCount: importExperienceSuggestions.length,
        selectedExperienceCount: selectedImportExperienceCount,
        detectedEducationCount: importEducationSuggestions.length,
        selectedEducationCount: selectedImportEducationCount,
        aiFieldCount: pendingAiResumeDraft?.fields.length,
        errorCategory: 'no_selected_fields',
      });
      addToast({ type: 'warning', title: 'Select fields to apply', message: 'Choose at least one detected field before applying the draft.' });
      return;
    }

    setResumeDraft(prev => {
      const nextDraft = { ...prev };
      selectedEntries.forEach((entry) => {
        if (entry.value) {
          nextDraft[entry.key] = entry.value;
        }
      });
      return nextDraft;
    });
    recordResumeAiDraftDecision('used', {
      decisionReason: 'apply_selected',
      selectedFieldCount: selectedEntries.length,
      selectedFields: selectedEntries.map(entry => entry.key),
    });
    recordResumeAction('resume_import_draft_applied', {
      ...getResumeAnalyticsContext('import_modal'),
      sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
      fieldKeys: selectedEntries.map(entry => entry.key),
      detectedFieldCount: importDraftEntries.length,
      selectedFieldCount: selectedEntries.length,
      detectedSkillCount: importSkillSuggestions.length,
      selectedSkillCount: selectedImportSkillCount,
      detectedExperienceCount: importExperienceSuggestions.length,
      selectedExperienceCount: selectedImportExperienceCount,
      detectedEducationCount: importEducationSuggestions.length,
      selectedEducationCount: selectedImportEducationCount,
      aiFieldCount: pendingAiResumeDraft?.fields.length,
      inputLength: importText.length,
    });
    setActiveTab('editor');
    resetImportModalState();
    addToast({ type: 'success', title: 'Draft applied', message: `${selectedEntries.length} field${selectedEntries.length === 1 ? '' : 's'} applied. Review the editor and choose Save Changes when ready.` });
  };

  const handleSaveImportSkills = async () => {
    if (!user?.id) return;

    const skillsToSave = importSkillSuggestions.filter(skill => selectedImportSkills.includes(skill));
    if (skillsToSave.length === 0) {
      recordResumeAction('resume_import_skills_validation_failed', {
        ...getResumeAnalyticsContext('import_skills'),
        sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
        detectedSkillCount: importSkillSuggestions.length,
        selectedSkillCount: 0,
        savedSkillCount: 0,
        failedSkillCount: 0,
        errorCategory: 'no_selected_skills',
      });
      addToast({ type: 'warning', title: 'Select skills to save', message: 'Choose at least one detected skill before saving it to your profile.' });
      return;
    }

    setIsSavingImportSkills(true);
    const results = await Promise.allSettled(
      skillsToSave.map(skill => profileService.addSkill(user.id, {
        name: skill,
        proficiency: 'INTERMEDIATE',
      }))
    );
    const savedSkills = results
      .filter((result): result is PromiseFulfilledResult<Record<string, any>> => result.status === 'fulfilled')
      .map(result => result.value);
    const savedNames = new Set(savedSkills.map(skill => getSkillName(skill).toLowerCase()));

    if (savedSkills.length > 0) {
      setProfile(prev => ({
        ...prev,
        skills: [...(prev?.skills || []), ...savedSkills],
      }));
      setSelectedImportSkills(prev => prev.filter(skill => !savedNames.has(skill.toLowerCase())));
    }

    setIsSavingImportSkills(false);
    const failedSkillCount = skillsToSave.length - savedSkills.length;
    const skillAnalyticsContext = {
      ...getResumeAnalyticsContext('import_skills', savedSkills.length > 0
        ? {
          ...(profile || {}),
          skills: [...(profile?.skills || []), ...savedSkills],
        }
        : profile),
      sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
      detectedSkillCount: importSkillSuggestions.length,
      selectedSkillCount: skillsToSave.length,
      savedSkillCount: savedSkills.length,
      failedSkillCount,
    };

    if (savedSkills.length === skillsToSave.length) {
      recordResumeAction('resume_import_skills_saved', skillAnalyticsContext);
      addToast({
        type: 'success',
        title: 'Skills saved',
        message: `${savedSkills.length} skill${savedSkills.length === 1 ? '' : 's'} added to your profile. You can edit or remove them from Profile.`,
      });
      return;
    }

    if (savedSkills.length > 0) {
      recordResumeAction('resume_import_skills_partial', {
        ...skillAnalyticsContext,
        errorCategory: 'partial_skill_save_failed',
      });
      addToast({
        type: 'warning',
        title: 'Some skills saved',
        message: `${savedSkills.length} skill${savedSkills.length === 1 ? '' : 's'} were added. Review the remaining selected skills and try again.`,
      });
      return;
    }

    recordResumeAction('resume_import_skills_failed', {
      ...skillAnalyticsContext,
      errorCategory: 'skill_save_failed',
    });
    addToast({ type: 'error', title: 'Skill save failed', message: 'No skills were saved. Please try again from Profile.' });
  };

  const handleSaveImportRows = async () => {
    if (!user?.id) return;

    const experiencesToSave = importExperienceSuggestions.filter(experience => selectedImportExperienceIds.includes(experience.id));
    const educationToSave = importEducationSuggestions.filter(educationRow => selectedImportEducationIds.includes(educationRow.id));
    const selectedRowCount = experiencesToSave.length + educationToSave.length;

    if (selectedRowCount === 0) {
      recordResumeAction('resume_import_rows_validation_failed', {
        ...getResumeAnalyticsContext('import_rows'),
        sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
        detectedExperienceCount: importExperienceSuggestions.length,
        selectedExperienceCount: 0,
        savedExperienceCount: 0,
        failedExperienceCount: 0,
        detectedEducationCount: importEducationSuggestions.length,
        selectedEducationCount: 0,
        savedEducationCount: 0,
        failedEducationCount: 0,
        errorCategory: 'no_selected_profile_rows',
      });
      addToast({ type: 'warning', title: 'Select rows to save', message: 'Choose at least one detected experience or education row before saving it to your profile.' });
      return;
    }

    setIsSavingImportRows(true);
    const experienceResults = await Promise.allSettled(
      experiencesToSave.map(experience => profileService.addExperience(user.id, {
        title: experience.title,
        company: experience.company,
        location: experience.location,
        startDate: experience.startDate,
        endDate: experience.current ? undefined : experience.endDate,
        current: experience.current,
        description: experience.description,
      }))
    );
    const educationResults = await Promise.allSettled(
      educationToSave.map(educationRow => profileService.addEducation(user.id, {
        institution: educationRow.institution,
        degree: educationRow.degree,
        fieldOfStudy: educationRow.fieldOfStudy,
        startDate: educationRow.startDate,
        endDate: educationRow.endDate,
      }))
    );
    const savedExperiences = experienceResults
      .filter((result): result is PromiseFulfilledResult<Record<string, any>> => result.status === 'fulfilled')
      .map(result => result.value);
    const savedEducation = educationResults
      .filter((result): result is PromiseFulfilledResult<Record<string, any>> => result.status === 'fulfilled')
      .map(result => result.value);
    const savedExperienceIds = new Set(experienceResults.reduce<string[]>((acc, result, index) => {
      if (result.status === 'fulfilled') acc.push(experiencesToSave[index].id);
      return acc;
    }, []));
    const savedEducationIds = new Set(educationResults.reduce<string[]>((acc, result, index) => {
      if (result.status === 'fulfilled') acc.push(educationToSave[index].id);
      return acc;
    }, []));

    if (savedExperiences.length > 0 || savedEducation.length > 0) {
      setProfile(prev => {
        const currentEducation = Array.isArray(prev?.educations) ? prev.educations : (Array.isArray(prev?.education) ? prev.education : []);
        const nextEducation = [...currentEducation, ...savedEducation];

        return {
          ...prev,
          experiences: [...(prev?.experiences || []), ...savedExperiences],
          educations: nextEducation,
          education: Array.isArray(prev?.education) ? nextEducation : prev?.education,
        };
      });
      setSelectedImportExperienceIds(prev => prev.filter(experienceId => !savedExperienceIds.has(experienceId)));
      setSelectedImportEducationIds(prev => prev.filter(educationId => !savedEducationIds.has(educationId)));
    }

    setIsSavingImportRows(false);
    const savedRowCount = savedExperiences.length + savedEducation.length;
    const failedExperienceCount = experiencesToSave.length - savedExperiences.length;
    const failedEducationCount = educationToSave.length - savedEducation.length;
    const rowAnalyticsContext = {
      ...getResumeAnalyticsContext('import_rows', savedRowCount > 0
        ? {
          ...(profile || {}),
          experiences: [...(profile?.experiences || []), ...savedExperiences],
          educations: [...education, ...savedEducation],
          education: Array.isArray(profile?.education) ? [...education, ...savedEducation] : profile?.education,
        }
        : profile),
      sourceType: getImportSourceType(pendingAiResumeDraft, importFileName),
      detectedExperienceCount: importExperienceSuggestions.length,
      selectedExperienceCount: experiencesToSave.length,
      savedExperienceCount: savedExperiences.length,
      failedExperienceCount,
      detectedEducationCount: importEducationSuggestions.length,
      selectedEducationCount: educationToSave.length,
      savedEducationCount: savedEducation.length,
      failedEducationCount,
    };

    if (savedRowCount === selectedRowCount) {
      recordResumeAction('resume_import_rows_saved', rowAnalyticsContext);
      addToast({
        type: 'success',
        title: 'Profile rows saved',
        message: `${savedRowCount} profile row${savedRowCount === 1 ? '' : 's'} added. You can edit or remove them from Profile.`,
      });
      return;
    }

    if (savedRowCount > 0) {
      recordResumeAction('resume_import_rows_partial', {
        ...rowAnalyticsContext,
        errorCategory: 'partial_profile_row_save_failed',
      });
      addToast({
        type: 'warning',
        title: 'Some rows saved',
        message: `${savedRowCount} profile row${savedRowCount === 1 ? '' : 's'} were added. Review the remaining selected rows and try again.`,
      });
      return;
    }

    recordResumeAction('resume_import_rows_failed', {
      ...rowAnalyticsContext,
      errorCategory: 'profile_row_save_failed',
    });
    addToast({ type: 'error', title: 'Profile row save failed', message: 'No rows were saved. Please try again from Profile.' });
  };

  const handleExport = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    const fileName = `${getResumeFileStem(resumeDraft.fullName)} print`;

    if (!printWindow) {
      addExportRecord({
        status: 'blocked',
        method: 'browser-print',
        fileName,
        detail: 'Popup was blocked before the print-ready resume could open.'
      });
      recordResumeAction('resume_export_blocked', {
        ...getResumeAnalyticsContext('export'),
        exportMethod: 'browser-print',
        exportStatus: 'blocked',
        persistedTo: 'local',
        errorCategory: 'popup_blocked',
      });
      addToast({ type: 'error', title: 'Export blocked', message: 'Allow popups to open the print-ready resume.' });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableResume(resumeDraft, experiences, education, skills, { autoPrint: true }));
    printWindow.document.close();
    addExportRecord({
      status: 'ready',
      method: 'browser-print',
      fileName,
      detail: 'Print dialog opened for browser PDF export.'
    });
    recordResumeAction('resume_export_completed', {
      ...getResumeAnalyticsContext('export'),
      exportMethod: 'browser-print',
      exportStatus: 'ready',
      persistedTo: 'local',
    });
    addToast({ type: 'success', title: 'Export ready', message: 'Use the print dialog to save the resume as PDF.' });
  };

  const handleDownloadHtml = () => {
    const fileName = `${getResumeFileStem(resumeDraft.fullName)}-resume.html`;

    try {
      const html = buildPrintableResume(resumeDraft, experiences, education, skills);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addExportRecord({
        status: 'ready',
        method: 'html-download',
        fileName,
        detail: 'Downloaded a print-ready HTML resume file locally.'
      });
      recordResumeAction('resume_export_completed', {
        ...getResumeAnalyticsContext('export'),
        exportMethod: 'html-download',
        exportStatus: 'ready',
        persistedTo: 'local',
      });
      addToast({ type: 'success', title: 'Resume downloaded', message: 'A print-ready HTML resume file was created locally.' });
    } catch (err) {
      console.error('Failed to download resume HTML:', err);
      recordResumeAction('resume_export_failed', {
        ...getResumeAnalyticsContext('export'),
        exportMethod: 'html-download',
        exportStatus: 'failed',
        persistedTo: 'local',
        errorCategory: getResumeWorkflowErrorCategory(err, 'download_failed'),
      });
      addToast({ type: 'error', title: 'Download failed', message: 'Please try again or use Print PDF.' });
    }
  };

  const handleDownloadPdf = () => {
    const fileName = `${getResumeFileStem(resumeDraft.fullName)}-resume.pdf`;

    try {
      const blob = buildResumePdfBlob(buildResumePdfData(resumeDraft, experiences, education, skills));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addExportRecord({
        status: 'ready',
        method: 'native-pdf',
        fileName,
        detail: 'Downloaded a native PDF resume file locally.'
      });
      recordResumeAction('resume_export_completed', {
        ...getResumeAnalyticsContext('export'),
        exportMethod: 'native-pdf',
        exportStatus: 'ready',
        persistedTo: 'local',
      });
      addToast({ type: 'success', title: 'PDF downloaded', message: 'A native PDF resume file was created locally.' });
    } catch (err) {
      console.error('Failed to download resume PDF:', err);
      recordResumeAction('resume_export_failed', {
        ...getResumeAnalyticsContext('export'),
        exportMethod: 'native-pdf',
        exportStatus: 'failed',
        persistedTo: 'local',
        errorCategory: getResumeWorkflowErrorCategory(err, 'pdf_download_failed'),
      });
      addToast({ type: 'error', title: 'PDF download failed', message: 'Please try again, or use Download HTML or Print PDF.' });
    }
  };

  const handleUploadPdf = async () => {
    const fileName = `${getResumeFileStem(resumeDraft.fullName)}-resume.pdf`;
    setIsUploadingResumePdf(true);

    try {
      const blob = buildResumePdfBlob(buildResumePdfData(resumeDraft, experiences, education, skills));
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const result = await fileUploadService.uploadFile(file, 'resumes');
      const uploadedAt = new Date().toISOString();
      const artifact = buildResumeArtifactRecord({
        url: result.url,
        fileName,
        uploadedAt,
        userId: user?.id,
      });

      if (!artifact) {
        throw new Error('Upload completed without a usable file URL.');
      }

      setResumeArtifactUploads(prev => {
        const nextArtifacts = addResumeArtifactRecord(prev, artifact, {
          maxItems: maxResumeArtifactUploads,
        });
        writeLocalResumeArtifacts(nextArtifacts);
        return nextArtifacts;
      });
      void syncResumeArtifactRecord(artifact);
      addExportRecord({
        status: 'ready',
        method: 'provider-pdf',
        fileName,
        detail: 'Uploaded a native PDF resume artifact through file service.'
      });
      recordResumeAction('resume_export_completed', {
        ...getResumeAnalyticsContext('export'),
        exportMethod: 'provider-pdf',
        exportStatus: 'ready',
        persistedTo: 'server',
      });
      addToast({ type: 'success', title: 'PDF uploaded', message: 'Your reviewed PDF artifact is available from the link in Export Activity.' });
    } catch (err) {
      console.error('Failed to upload resume PDF:', err);
      recordResumeAction('resume_export_failed', {
        ...getResumeAnalyticsContext('export'),
        exportMethod: 'provider-pdf',
        exportStatus: 'failed',
        persistedTo: 'local',
        errorCategory: getResumeWorkflowErrorCategory(err, 'provider_pdf_upload_failed'),
      });
      addToast({ type: 'error', title: 'PDF upload failed', message: 'Please try again, or use Download PDF to keep a local copy.' });
    } finally {
      setIsUploadingResumePdf(false);
    }
  };

  const handleOpenDeleteResumeArtifact = (artifact: ResumeArtifactRecord) => {
    if (deletingResumeArtifactUrl) return;
    setPendingResumeArtifactDelete(artifact);
    recordResumeAction('resume_artifact_delete_review_opened', {
      ...getResumeAnalyticsContext('artifact_delete_review'),
      artifactCount: resumeArtifactUploads.length,
      exportMethod: 'provider-pdf',
      persistedTo: artifact.persistedTo,
    });
  };

  const handleCancelDeleteResumeArtifact = () => {
    if (!pendingResumeArtifactDelete || isDeletingPendingResumeArtifact) return;
    recordResumeAction('resume_artifact_delete_cancelled', {
      ...getResumeAnalyticsContext('artifact_delete_review'),
      artifactCount: resumeArtifactUploads.length,
      exportMethod: 'provider-pdf',
      persistedTo: pendingResumeArtifactDelete.persistedTo,
    });
    setPendingResumeArtifactDelete(null);
  };

  const handleConfirmDeleteResumeArtifact = async () => {
    const artifact = pendingResumeArtifactDelete;
    if (!artifact) return;

    setDeletingResumeArtifactUrl(artifact.url);
    try {
      await fileUploadService.deleteFile(artifact.url);
      const deletedAt = new Date().toISOString();
      const nextArtifacts = removeResumeArtifactRecord(resumeArtifactUploads, artifact.url, {
        maxItems: maxResumeArtifactUploads,
      });
      const nextTombstones = addResumeArtifactTombstone(readLocalResumeArtifactTombstones(), artifact, deletedAt);

      setResumeArtifactUploads(nextArtifacts);
      setResumeArtifactDeletionReceipts(nextTombstones.slice(0, 3));
      writeLocalResumeArtifacts(nextArtifacts);
      writeLocalResumeArtifactTombstones(nextTombstones);
      void syncResumeArtifactDeleted(artifact, deletedAt);
      recordResumeAction('resume_artifact_deleted', {
        ...getResumeAnalyticsContext('artifact_library'),
        artifactCount: nextArtifacts.length,
        exportMethod: 'provider-pdf',
        persistedTo: artifact.persistedTo,
      });
      setPendingResumeArtifactDelete(null);
      addToast({ type: 'success', title: 'Uploaded PDF deleted', message: 'The uploaded resume artifact link was removed.' });
    } catch (err) {
      console.error('Failed to delete uploaded resume PDF:', err);
      recordResumeAction('resume_artifact_delete_failed', {
        ...getResumeAnalyticsContext('artifact_library'),
        artifactCount: resumeArtifactUploads.length,
        exportMethod: 'provider-pdf',
        persistedTo: artifact.persistedTo,
        errorCategory: getResumeWorkflowErrorCategory(err, 'provider_pdf_delete_failed'),
      });
      addToast({ type: 'error', title: 'Delete failed', message: 'The uploaded PDF is still listed. Please try again later.' });
    } finally {
      setDeletingResumeArtifactUrl(null);
    }
  };

  const handleCopyResumeArtifactLink = async (artifact: ResumeArtifactRecord) => {
    setCopyingResumeArtifactUrl(artifact.url);
    try {
      await copyResumeArtifactUrl(artifact.url);
      recordResumeAction('resume_artifact_link_copied', {
        ...getResumeAnalyticsContext('artifact_library'),
        artifactCount: resumeArtifactUploads.length,
        exportMethod: 'provider-pdf',
        persistedTo: artifact.persistedTo,
      });
      addToast({ type: 'success', title: 'Link copied', message: 'The uploaded PDF link is ready to share.' });
    } catch (err) {
      console.error('Failed to copy uploaded resume PDF link:', err);
      recordResumeAction('resume_artifact_link_copy_failed', {
        ...getResumeAnalyticsContext('artifact_library'),
        artifactCount: resumeArtifactUploads.length,
        exportMethod: 'provider-pdf',
        persistedTo: artifact.persistedTo,
        errorCategory: getResumeWorkflowErrorCategory(err, 'provider_pdf_link_copy_failed'),
      });
      addToast({ type: 'error', title: 'Copy failed', message: 'Open the PDF and copy the link from your browser instead.' });
    } finally {
      setCopyingResumeArtifactUrl(null);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const changedFields = getChangedResumeFields(profile, resumeDraft);
    setIsSaving(true);
    try {
      const updatedProfile = await profileService.updateProfile(user.id, {
        headline: resumeDraft.headline,
        summary: resumeDraft.summary,
        phone: resumeDraft.phone,
        location: resumeDraft.location,
        website: resumeDraft.website,
      });
      const nextProfile = {
        ...(profile || {}),
        ...updatedProfile,
        headline: resumeDraft.headline,
        summary: resumeDraft.summary,
        phone: resumeDraft.phone,
        location: resumeDraft.location,
        website: resumeDraft.website,
      };
      setProfile(nextProfile);
      recordResumeAction('resume_saved', {
        ...getResumeAnalyticsContext('editor_save', nextProfile),
        fieldKeys: changedFields,
        fieldCount: changedFields.length,
      });
      addToast({ type: 'success', title: 'Saved', message: 'Resume profile fields have been saved.' });
    } catch (err) {
      console.error('Failed to save resume fields:', err);
      recordResumeAction('resume_save_failed', {
        ...getResumeAnalyticsContext('editor_save'),
        fieldKeys: changedFields,
        fieldCount: changedFields.length,
        errorCategory: getResumeWorkflowErrorCategory(err, 'profile_update_failed'),
      });
      addToast({ type: 'error', title: 'Save failed', message: 'Please try again later.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="p-8">
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume Builder"
        description="Create and customize your professional resume."
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={openImportModal}>
              <FileText size={14} className="mr-1" /> Import Text
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download size={14} className="mr-1" /> Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadPdf}
              isLoading={isUploadingResumePdf}
            >
              <Upload size={14} className="mr-1" /> Upload PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadHtml}>
              <Download size={14} className="mr-1" /> Download HTML
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download size={14} className="mr-1" /> Print PDF
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              <Save size={14} className="mr-1" /> Save Changes
            </Button>
          </div>
        }
      />

      <AuraModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        title={pendingAiResumeDraft ? 'Review AI Resume Draft' : 'Import Resume Text'}
        footer={
          <>
            <Button variant="ghost" onClick={closeImportModal}>Cancel</Button>
            {!pendingAiResumeDraft && <Button variant="outline" onClick={handleAnalyzeImport}>Generate Draft</Button>}
            <Button onClick={handleApplyImportDraft} disabled={!importDraft || selectedImportFieldCount === 0}>
              Apply Selected
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="resume-import-text" className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Resume text</label>
            <div className="mb-3 rounded-lg border border-dashed border-[var(--border-default)] p-3">
              <label htmlFor="resume-import-file" className="block text-sm font-medium text-[var(--text-primary)]">Upload text file</label>
              <input
                id="resume-import-file"
                type="file"
                accept=".txt,.md,.markdown,.docx,.pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={handleImportFileChange}
                className="mt-2 block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--bg-secondary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--text-primary)]"
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Supported file types: .txt, .md, .docx, and searchable .pdf. Scanned PDFs are not OCR-read here.
              </p>
              {importFileName && <p className="mt-1 text-xs text-[var(--text-muted)]">Loaded: {importFileName}</p>}
            </div>
            {pendingAiResumeDraft && (
              <div className="mb-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">AI resume draft</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Source: {pendingAiResumeDraft.sourceLabel || 'TalentSphere AI assistant'}. Applying selected fields only updates the editor draft; Save Changes is still required.
                </p>
              </div>
            )}
            <textarea
              id="resume-import-text"
              className="w-full min-h-[180px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              value={importText}
              onChange={handleImportTextChange}
              placeholder="Paste resume text here, or upload a supported text file. Supported draft fields: headline, phone, location, website, summary, skills, work experience, and education."
            />
          </div>
          {importDraft && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{pendingAiResumeDraft ? 'Review AI draft fields' : 'Review detected fields'}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Source: {pendingAiResumeDraft?.sourceLabel || 'pasted resume text'}. Applying only updates the editor draft.
                </p>
              </div>
              {importDraftEntries.length > 0 ? importDraftEntries.map((entry) => (
                <label key={entry.key} className="flex items-start gap-3 rounded-lg border border-[var(--border-default)] p-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedImportFields.includes(entry.key)}
                    onChange={() => handleToggleImportField(entry.key)}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-[var(--text-muted)]">{entry.label}</span>
                    <span className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <span>
                        <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Current</span>
                        <span className="mt-1 block text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{resumeDraft[entry.key] || 'Empty'}</span>
                      </span>
                      <span>
                        <span className="block text-[10px] uppercase tracking-wide text-accent">{pendingAiResumeDraft ? 'AI draft' : 'Detected'}</span>
                        <span className="mt-1 block text-sm text-[var(--text-primary)] whitespace-pre-wrap">{entry.value}</span>
                      </span>
                    </span>
                  </span>
                </label>
              )) : (
                <p className="rounded-lg border border-[var(--border-default)] p-3 text-sm text-[var(--text-muted)]">
                  No supported resume fields were detected.
                </p>
              )}
              {importSkillSuggestions.length > 0 && (
                <div className="space-y-3 rounded-lg border border-[var(--border-default)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Review detected skills</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Saving selected skills updates your Profile immediately. You can edit or remove them from Profile.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveImportSkills}
                      disabled={selectedImportSkillCount === 0 || isSavingImportSkills}
                      isLoading={isSavingImportSkills}
                    >
                      <Plus size={14} className="mr-1" />
                      Save Skills
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {importSkillSuggestions.map(skill => (
                      <label key={skill} className="flex items-center gap-2 rounded-md border border-[var(--border-default)] px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedImportSkills.includes(skill)}
                          onChange={() => handleToggleImportSkill(skill)}
                        />
                        <span>{skill}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {(importExperienceSuggestions.length > 0 || importEducationSuggestions.length > 0) && (
                <div className="space-y-3 rounded-lg border border-[var(--border-default)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Review detected profile rows</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Saving selected rows updates your Profile immediately. You can edit or remove them from Profile.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveImportRows}
                      disabled={selectedImportProfileRowCount === 0 || isSavingImportRows}
                      isLoading={isSavingImportRows}
                    >
                      <Plus size={14} className="mr-1" />
                      Save Rows
                    </Button>
                  </div>

                  {importExperienceSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Work Experience</p>
                      {importExperienceSuggestions.map(experience => (
                        <label key={experience.id} className="flex items-start gap-3 rounded-md border border-[var(--border-default)] px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedImportExperienceIds.includes(experience.id)}
                            onChange={() => handleToggleImportExperience(experience.id)}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-[var(--text-primary)]">{experience.title}</span>
                            <span className="block text-xs text-[var(--text-secondary)]">
                              {[experience.company, experience.location].filter(Boolean).join(' | ')}
                            </span>
                            <span className="block text-xs text-[var(--text-muted)]">
                              {formatResumeDate(experience.startDate)} - {experience.current ? 'Present' : formatResumeDate(experience.endDate) || 'Present'}
                            </span>
                            {experience.description && (
                              <span className="mt-1 line-clamp-2 block text-xs text-[var(--text-muted)]">{experience.description}</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {importEducationSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Education</p>
                      {importEducationSuggestions.map(educationRow => (
                        <label key={educationRow.id} className="flex items-start gap-3 rounded-md border border-[var(--border-default)] px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selectedImportEducationIds.includes(educationRow.id)}
                            onChange={() => handleToggleImportEducation(educationRow.id)}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-[var(--text-primary)]">{educationRow.institution}</span>
                            {(educationRow.degree || educationRow.fieldOfStudy) && (
                              <span className="block text-xs text-[var(--text-secondary)]">
                                {[educationRow.degree, educationRow.fieldOfStudy].filter(Boolean).join(' | ')}
                              </span>
                            )}
                            <span className="block text-xs text-[var(--text-muted)]">
                              {formatResumeDate(educationRow.startDate)} - {formatResumeDate(educationRow.endDate) || 'Present'}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </AuraModal>

      <AuraModal
        isOpen={Boolean(pendingResumeArtifactDelete)}
        onClose={handleCancelDeleteResumeArtifact}
        title="Delete Uploaded PDF"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleCancelDeleteResumeArtifact}
              disabled={isDeletingPendingResumeArtifact}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteResumeArtifact}
              isLoading={isDeletingPendingResumeArtifact}
            >
              <Trash2 size={16} className="mr-1.5" /> Delete PDF
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            This removes <span className="font-medium text-[var(--text-primary)]">{pendingResumeArtifactDelete?.fileName || 'this uploaded PDF'}</span> from uploaded PDFs and asks the file service to delete the provider artifact.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            The active link will disappear after deletion. A local receipt will remain in Export Activity so you can verify the cleanup from this browser.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            No deleted artifact URL is shown in the receipt.
          </p>
        </div>
      </AuraModal>

      <Tabs
        tabs={[
          { id: 'editor', label: 'Editor' },
          { id: 'preview', label: 'Preview' },
        ]}
        activeTab={activeTab}
        onTabChange={handleResumeTabChange}
      />

      {(exportHistory.length > 0 || resumeArtifactUploads.length > 0 || resumeArtifactDeletionReceipts.length > 0) && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold">Export Activity</h3>
          </div>
          {resumeArtifactUploads.length > 0 && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Uploaded PDFs</p>
                  <p className="text-xs text-[var(--text-muted)]">{resumeArtifactUploads.length} stored link{resumeArtifactUploads.length === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {resumeArtifactUploads.map(artifact => (
                  <div key={artifact.url} className="flex flex-col gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{artifact.fileName}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatExportTime(artifact.uploadedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={artifact.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border-default)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                      >
                        Open PDF <ExternalLink size={12} />
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyResumeArtifactLink(artifact)}
                        isLoading={copyingResumeArtifactUrl === artifact.url}
                      >
                        <Copy size={12} className="mr-1" />
                        Copy Link
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDeleteResumeArtifact(artifact)}
                        isLoading={deletingResumeArtifactUrl === artifact.url}
                      >
                        <Trash2 size={12} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {resumeArtifactDeletionReceipts.length > 0 && (
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Deleted PDF Receipts</p>
                  <p className="text-xs text-[var(--text-muted)]">Recent provider delete confirmations from this browser</p>
                </div>
              </div>
              <div className="space-y-2">
                {resumeArtifactDeletionReceipts.map(receipt => (
                  <div key={receipt.url} className="flex flex-col gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{receipt.fileName || 'Uploaded PDF'}</p>
                      <p className="text-xs text-[var(--text-muted)]">Provider delete confirmed</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-medium text-success">Deleted</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {receipt.persistedTo === 'server' ? 'Account metadata sync requested' : 'Local receipt'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{formatExportTime(receipt.deletedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            {exportHistory.map((record) => (
              <div key={record.id} className="flex flex-col gap-1 rounded-lg border border-[var(--border-default)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{record.fileName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{record.detail}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className={`text-xs font-medium ${record.status === 'ready' ? 'text-success' : 'text-destructive'}`}>
                    {getExportStatusLabel(record)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {record.persistedTo === 'server' ? 'Account synced' : 'Local only'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{formatExportTime(record.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Full Name" value={resumeDraft.fullName} disabled helperText="Managed from your account profile." />
              <Input label="Email" value={resumeDraft.email} type="email" disabled helperText="Managed from your account profile." />
              <Input
                label="Headline"
                value={resumeDraft.headline}
                onChange={(e) => setResumeDraft({ ...resumeDraft, headline: e.target.value })}
                placeholder="e.g. Senior Software Engineer"
              />
              <Input
                label="Phone"
                value={resumeDraft.phone}
                onChange={(e) => setResumeDraft({ ...resumeDraft, phone: e.target.value })}
                placeholder="+1 555 0100"
              />
              <Input
                label="Location"
                value={resumeDraft.location}
                onChange={(e) => setResumeDraft({ ...resumeDraft, location: e.target.value })}
                className="sm:col-span-2"
                placeholder="Remote, or New York, NY"
              />
              <Input
                label="Website"
                value={resumeDraft.website}
                onChange={(e) => setResumeDraft({ ...resumeDraft, website: e.target.value })}
                className="sm:col-span-2"
                placeholder="https://..."
              />
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Professional Summary</h3>
            <textarea
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-3 py-2 text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-y"
              value={resumeDraft.summary}
              onChange={(e) => setResumeDraft({ ...resumeDraft, summary: e.target.value })}
              placeholder="Summarize your experience, strengths, and target role."
            />
            <p className="text-xs text-[var(--text-muted)]">
              Saved summary is reused by your profile and resume preview.
            </p>
          </Card>

          <Card className="p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Work Experience</h3>
              <p className="text-xs text-[var(--text-muted)]">Manage entries from Profile completion.</p>
            </div>
            {experiences.map((exp: Record<string, any>, i: number) => (
              <div key={exp.id || i} className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
                <GripVertical size={16} className="text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{exp.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {exp.company} - {formatResumeDate(getExperienceStartDate(exp))} to {exp.current ? 'Present' : formatResumeDate(getExperienceEndDate(exp)) || 'Present'}
                  </p>
                  {exp.description && <p className="text-sm text-[var(--text-secondary)] mt-2">{exp.description}</p>}
                </div>
              </div>
            ))}
            {experiences.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-4">No experience listed.</p>}
          </Card>

          <Card className="p-5 space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Skills</h3>
              <p className="text-xs text-[var(--text-muted)]">Manage skills from Profile completion.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s: Record<string, any> | string, i: number) => (
                <span key={`${getSkillName(s)}-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm bg-[var(--bg-primary)]">
                  {getSkillName(s)}
                </span>
              ))}
              {skills.length === 0 && <p className="text-sm text-[var(--text-muted)]">No skills added.</p>}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="text-center border-b border-[var(--border-default)] pb-6">
              <h2 className="text-2xl font-semibold">{resumeDraft.fullName || 'Resume'}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{resumeDraft.headline || 'Professional'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {[resumeDraft.location, resumeDraft.email, resumeDraft.phone, resumeDraft.website].filter(Boolean).join(' - ')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-accent uppercase tracking-wide">Summary</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {resumeDraft.summary || 'No summary provided.'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-accent uppercase tracking-wide">Experience</h3>
              <div className="space-y-4">
                {experiences.map((exp: Record<string, any>, i: number) => (
                  <div key={exp.id || i}>
                    <p className="text-sm font-medium">{exp.title} - {exp.company}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatResumeDate(getExperienceStartDate(exp))} - {exp.current ? 'Present' : formatResumeDate(getExperienceEndDate(exp)) || 'Present'}
                    </p>
                    {exp.description && <p className="text-sm text-[var(--text-secondary)] mt-1">{exp.description}</p>}
                  </div>
                ))}
                {experiences.length === 0 && <p className="text-sm text-[var(--text-muted)]">No work experience added yet.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-accent uppercase tracking-wide">Education</h3>
              <div className="space-y-4">
                {education.map((edu: Record<string, any>, i: number) => (
                  <div key={edu.id || i}>
                    <p className="text-sm font-medium">{edu.degree || edu.fieldOfStudy || edu.field_of_study || 'Education'}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {edu.institution} - {formatResumeDate(getEducationEndDate(edu) || getEducationStartDate(edu))}
                    </p>
                  </div>
                ))}
                {education.length === 0 && <p className="text-sm text-[var(--text-muted)]">No education added yet.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-accent uppercase tracking-wide">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: Record<string, any> | string, i: number) => (
                  <span key={`${getSkillName(skill)}-${i}`} className="text-xs rounded-md border border-[var(--border-default)] px-2 py-1">
                    {getSkillName(skill)}
                  </span>
                ))}
                {skills.length === 0 && <p className="text-sm text-[var(--text-muted)]">No skills added yet.</p>}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResumeBuilder;
