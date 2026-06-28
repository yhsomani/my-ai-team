import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Camera, MapPin, Link as LinkIcon, Calendar, Edit2, Briefcase, GraduationCap, Award, Save, Plus, CheckCircle2, Circle, Trash2, Upload, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { AuraModal } from '../../components/shared/AuraModal';
import { Badge } from '../../components/shared/Badge';
import { Tabs } from '../../components/shared/Tabs';
import { Skeleton } from '../../components/shared/Skeleton';
import { useAppSelector } from '../../store/hooks';
import { profileService } from '../../services/profileService';
import { fileUploadService } from '../../services/fileUploadService';
import { useToast } from '../../components/shared/Toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  buildProfileAiDraftSuggestion,
  getProfileAiDraftFormPatch,
  hasProfileAiDraftFields,
  type ProfileAiDraftSource,
  type ProfileAiDraftSuggestion,
} from '../../lib/profileAiDrafts';
import { recordAiWorkflowPrefillDecision } from '../../lib/aiWorkflowPrefillAudit';
import {
  recordProfileWorkflowAnalytics,
  type ProfileWorkflowAnalyticsAction,
} from '../../lib/profileWorkflowAnalytics';
import {
  createCroppedProfileAvatarFile,
  defaultProfileAvatarCrop,
  getProfileAvatarCropPreviewStyle,
  normalizeProfileAvatarCrop,
  type ProfileAvatarCrop,
} from '../../lib/profileAvatarCrop';

type CompletionTaskType = 'skill' | 'experience' | 'education';
type EditingProfileRow = { type: CompletionTaskType; id: string } | null;
type PendingProfileDelete =
  | { type: 'skill'; id: string; label: string; row: Record<string, any> | string }
  | { type: 'experience'; id: string; label: string; row: Record<string, any> }
  | { type: 'education'; id: string; label: string; row: Record<string, any> }
  | null;
type ProfileSuggestion =
  | { id: 'headline' | 'location' | 'bio'; label: string; value: string; source: string; actionLabel: string; field: 'headline' | 'location' | 'bio' }
  | { id: 'skill'; label: string; value: string; source: string; actionLabel: string; field: 'skill' };
type ProfileRouteState = {
  aiProfileDraft?: ProfileAiDraftSource;
} | null;

const PROFILE_SKILL_KEYWORDS = [
  { name: 'React', aliases: ['react', 'react.js'] },
  { name: 'TypeScript', aliases: ['typescript', 'ts'] },
  { name: 'JavaScript', aliases: ['javascript', 'js'] },
  { name: 'Java', aliases: ['java'] },
  { name: 'Python', aliases: ['python'] },
  { name: 'Spring Boot', aliases: ['spring boot', 'spring'] },
  { name: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { name: 'Product Strategy', aliases: ['product strategy', 'roadmap', 'product'] },
  { name: 'Data Analysis', aliases: ['data analysis', 'analytics', 'sql'] },
  { name: 'Machine Learning', aliases: ['machine learning', 'ml', 'ai'] }
];

const getSkillName = (skill: Record<string, any> | string) => typeof skill === 'string' ? skill : skill.name;
const getSkillId = (skill: Record<string, any> | string) => typeof skill === 'string' ? undefined : skill.id;
const getSkillProficiency = (skill: Record<string, any> | string) => typeof skill === 'string' ? 'INTERMEDIATE' : skill.proficiency || 'INTERMEDIATE';
const getSkillYears = (skill: Record<string, any> | string) => typeof skill === 'string' ? undefined : skill.yearsOfExperience ?? skill.years_of_experience;
const getProfileRowId = (row: Record<string, any>) => row?.id ? String(row.id) : undefined;
const formatProfileDate = (date?: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};
const getExperienceStartDate = (experience: Record<string, any>) => experience.startDate || experience.start_date;
const getExperienceEndDate = (experience: Record<string, any>) => experience.endDate || experience.end_date;
const getEducationStartDate = (education: Record<string, any>) => education.startDate || education.start_date;
const getEducationEndDate = (education: Record<string, any>) => education.endDate || education.end_date;
const formatDateInput = (date?: string) => date ? String(date).slice(0, 10) : '';
const getProfileBasicFormData = (profile: Record<string, any> | null) => ({
  headline: profile?.headline || '',
  location: profile?.location || '',
  bio: profile?.bio || ''
});
const getProfileEducationRows = (profile: Record<string, any> | null) => (
  Array.isArray(profile?.educations) ? profile.educations : (Array.isArray(profile?.education) ? profile.education : [])
);
const getProfileAvatarUrl = (profile: Record<string, any> | null) => (
  profile?.avatarUrl || profile?.avatar_url || profile?.profiles?.avatar_url || ''
);
const maxProfileAvatarBytes = 2 * 1024 * 1024;
const profileLoadFailureMessage = 'Profile data did not respond. Retry to reload profile details, skills, experience, education, and achievements.';
const profileBasicSaveFailureMessage = 'Profile changes were not saved. Review the fields and try Save Changes again.';
const profileCompletionSaveFailureMessage = 'Profile item was not saved. Review the fields and try Save again.';
const profileAvatarUploadFailureMessage = 'Profile photo was not uploaded. Review the image and try Upload Photo again.';
const profileAvatarRemoveFailureMessage = 'Profile photo was not removed. Try Remove Photo again from this review.';
const profileRowDeleteFailureMessage = 'Profile item was not removed. Try Remove again from this review.';
const isSupportedProfileAvatarFile = (file: File) => (
  file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name)
);
const getProfileCompletionMetrics = (profile: Record<string, any> | null) => {
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  const experiences = Array.isArray(profile?.experiences) ? profile.experiences : [];
  const education = getProfileEducationRows(profile);
  const achievements = Array.isArray(profile?.achievements) ? profile.achievements : [];
  const completedTaskCount = [
    Boolean(profile?.headline && profile?.location && profile?.bio),
    skills.length > 0,
    experiences.length > 0,
    education.length > 0,
  ].filter(Boolean).length;

  return {
    skillCount: skills.length,
    experienceCount: experiences.length,
    educationCount: education.length,
    achievementCount: achievements.length,
    completedTaskCount,
    completionPercentage: Math.round((completedTaskCount / 4) * 100),
  };
};
const getProfileWorkflowErrorCategory = (error: unknown, fallback = 'request_error') => {
  if (!error) return fallback;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('auth') || message.includes('login') || message.includes('sign in')) return 'auth_required';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return 'network_error';
  if (message.includes('permission') || message.includes('forbidden') || message.includes('read-only')) return 'permission_denied';
  if (message.includes('crop')) return 'avatar_crop_failed';
  return fallback;
};
const getChangedBasicProfileFields = (profile: Record<string, any> | null, formData: ReturnType<typeof getProfileBasicFormData>) => (
  (['headline', 'location', 'bio'] as const).filter(field => (profile?.[field] || '') !== formData[field])
);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const profileTextHasAlias = (text: string, alias: string) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias.toLowerCase())}([^a-z0-9]|$)`).test(text);
const getPrimaryExperience = (experiences: Record<string, any>[]) => experiences.find(exp => exp.current) || experiences[0];

const ProfileActionFailureAlert: React.FC<{ message: string }> = ({ message }) => (
  <div
    role="alert"
    className="rounded-md border border-destructive/20 bg-destructive-muted p-3"
  >
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  </div>
);

const buildProfileSuggestions = (
  profile: Record<string, any> | null,
  experiences: Record<string, any>[],
  skills: Array<Record<string, any> | string>
): ProfileSuggestion[] => {
  if (!profile) return [];

  const suggestions: ProfileSuggestion[] = [];
  const primaryExperience = getPrimaryExperience(experiences);
  const skillNames = skills.map(getSkillName).filter(Boolean);
  const existingSkillNames = new Set(skillNames.map(name => name.toLowerCase()));

  if (!profile.headline && primaryExperience?.title) {
    suggestions.push({
      id: 'headline',
      label: 'Suggested headline',
      value: primaryExperience.company ? `${primaryExperience.title} at ${primaryExperience.company}` : primaryExperience.title,
      source: 'Work history',
      actionLabel: 'Apply draft',
      field: 'headline'
    });
  }

  if (!profile.location && primaryExperience?.location) {
    suggestions.push({
      id: 'location',
      label: 'Suggested location',
      value: primaryExperience.location,
      source: 'Work history',
      actionLabel: 'Apply draft',
      field: 'location'
    });
  }

  if (!profile.bio && (primaryExperience || skillNames.length > 0)) {
    const role = profile.headline || primaryExperience?.title || profile.currentRole || profile.current_role || 'professional';
    const focus = skillNames.length > 0 ? ` with experience in ${skillNames.slice(0, 3).join(', ')}` : '';
    suggestions.push({
      id: 'bio',
      label: 'Suggested bio',
      value: `I am a ${role}${focus}, focused on practical outcomes and clear collaboration.`,
      source: skillNames.length > 0 ? 'Skills and work history' : 'Work history',
      actionLabel: 'Apply draft',
      field: 'bio'
    });
  }

  const profileText = [
    profile.headline,
    profile.bio,
    profile.summary,
    profile.currentRole,
    profile.current_role,
    ...experiences.flatMap(exp => [exp.title, exp.company, exp.description])
  ].filter(Boolean).join(' ').toLowerCase();
  const inferredSkill = PROFILE_SKILL_KEYWORDS.find(skill =>
    !existingSkillNames.has(skill.name.toLowerCase()) &&
    skill.aliases.some(alias => profileTextHasAlias(profileText, alias))
  );

  if (inferredSkill) {
    suggestions.push({
      id: 'skill',
      label: 'Suggested skill',
      value: inferredSkill.name,
      source: 'Profile text',
      actionLabel: 'Review skill',
      field: 'skill'
    });
  }

  return suggestions;
};

const ProfilePage: React.FC = () => {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const routeState = location.state as ProfileRouteState;
  const aiProfileDraftState = routeState?.aiProfileDraft;
  const profileUserId = routeUserId || user?.id;
  const isOwnProfile = !routeUserId || routeUserId === user?.id;
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ headline: '', location: '', bio: '' });
  const [basicSaveError, setBasicSaveError] = useState<string | null>(null);
  const [pendingAiProfileDraft, setPendingAiProfileDraft] = useState<ProfileAiDraftSuggestion | null>(null);
  const [activeCompletionTask, setActiveCompletionTask] = useState<CompletionTaskType | null>(null);
  const [editingProfileRow, setEditingProfileRow] = useState<EditingProfileRow>(null);
  const [completionTaskError, setCompletionTaskError] = useState<string | null>(null);
  const [isSavingCompletionTask, setIsSavingCompletionTask] = useState(false);
  const [deletingSkillIds, setDeletingSkillIds] = useState<Set<string>>(new Set());
  const [deletingExperienceIds, setDeletingExperienceIds] = useState<Set<string>>(new Set());
  const [deletingEducationIds, setDeletingEducationIds] = useState<Set<string>>(new Set());
  const [pendingProfileDelete, setPendingProfileDelete] = useState<PendingProfileDelete>(null);
  const [profileDeleteError, setProfileDeleteError] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarPreviewUrl, setPendingAvatarPreviewUrl] = useState<string | null>(null);
  const [pendingAvatarCrop, setPendingAvatarCrop] = useState<ProfileAvatarCrop>(defaultProfileAvatarCrop);
  const [isAvatarReviewOpen, setIsAvatarReviewOpen] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isAvatarRemoveOpen, setIsAvatarRemoveOpen] = useState(false);
  const [avatarRemoveError, setAvatarRemoveError] = useState<string | null>(null);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [skillForm, setSkillForm] = useState({ name: '', proficiency: 'INTERMEDIATE', yearsOfExperience: '' });
  const [experienceForm, setExperienceForm] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    description: ''
  });
  const [educationForm, setEducationForm] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    gpa: ''
  });

  const recordProfileAction = useCallback((
    action: ProfileWorkflowAnalyticsAction,
    extra: Omit<Parameters<typeof recordProfileWorkflowAnalytics>[0], 'action' | 'userId'> = {}
  ) => {
    recordProfileWorkflowAnalytics({
      userId: user?.id,
      action,
      viewedProfileScope: isOwnProfile ? 'own' : 'external',
      ...extra,
    });
  }, [isOwnProfile, user?.id]);

  const getProfileAnalyticsContext = useCallback((
    entryPoint?: string,
    profileOverride: Record<string, any> | null = profile
  ) => ({
    entryPoint,
    ...getProfileCompletionMetrics(profileOverride),
  }), [profile]);

  const loadProfile = useCallback(async (entryPoint = 'page_load') => {
    if (!profileUserId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await profileService.getProfile(profileUserId);
      setProfile(data);
      setEditFormData(getProfileBasicFormData(data));
      recordProfileAction('profile_loaded', {
        entryPoint,
        ...getProfileCompletionMetrics(data),
      });
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
      setError(profileLoadFailureMessage);
      recordProfileAction('profile_load_failed', {
        entryPoint,
        errorCategory: getProfileWorkflowErrorCategory(err, 'profile_load_failed'),
      });
    } finally {
      setLoading(false);
    }
  }, [profileUserId, recordProfileAction]);

  useEffect(() => {
    void loadProfile('page_load');
  }, [loadProfile]);

  useEffect(() => {
    return () => {
      if (pendingAvatarPreviewUrl) {
        window.URL.revokeObjectURL(pendingAvatarPreviewUrl);
      }
    };
  }, [pendingAvatarPreviewUrl]);

  useEffect(() => {
    if (!aiProfileDraftState?.recommendationText || loading) return;

    navigate(location.pathname, { replace: true, state: null });

    if (!isOwnProfile) {
      recordProfileAction('profile_ai_draft_review_failed', {
        entryPoint: 'ai_handoff',
        errorCategory: 'read_only_profile',
      });
      addToast({
        type: 'warning',
        title: 'AI draft not applied',
        message: 'AI profile drafts can only be reviewed on your own profile.'
      });
      return;
    }

    if (!profile) return;

    const draft = buildProfileAiDraftSuggestion(profile, aiProfileDraftState);
    if (!hasProfileAiDraftFields(draft)) {
      recordProfileAction('profile_ai_draft_review_failed', {
        entryPoint: 'ai_handoff',
        errorCategory: 'no_structured_fields',
      });
      addToast({
        type: 'info',
        title: 'Profile opened',
        message: 'The AI recommendation did not include structured Headline, Location, or Bio fields to pre-fill.'
      });
      return;
    }

    setPendingAiProfileDraft(draft);
    setEditFormData({
      ...getProfileBasicFormData(profile),
      ...getProfileAiDraftFormPatch(draft)
    });
    setBasicSaveError(null);
    setIsEditModalOpen(true);
    recordProfileAction('profile_ai_draft_review_opened', {
      ...getProfileAnalyticsContext('ai_handoff'),
      aiFieldCount: draft.fields.length,
      fieldKeys: draft.fields.map(field => field.field),
      fieldCount: draft.fields.length,
    });
    addToast({
      type: 'info',
      title: 'AI draft ready for review',
      message: 'Review the suggested profile fields, edit anything you want, then save only if you approve.'
    });
  }, [addToast, aiProfileDraftState, getProfileAnalyticsContext, isOwnProfile, loading, location.pathname, navigate, profile, recordProfileAction]);

  const updateBasicEditFormData = (patch: Partial<typeof editFormData>) => {
    setBasicSaveError(null);
    setEditFormData(prev => ({ ...prev, ...patch }));
  };

  const updateSkillForm = (patch: Partial<typeof skillForm>) => {
    setCompletionTaskError(null);
    setSkillForm(prev => ({ ...prev, ...patch }));
  };

  const updateExperienceForm = (patch: Partial<typeof experienceForm>) => {
    setCompletionTaskError(null);
    setExperienceForm(prev => ({ ...prev, ...patch }));
  };

  const updateEducationForm = (patch: Partial<typeof educationForm>) => {
    setCompletionTaskError(null);
    setEducationForm(prev => ({ ...prev, ...patch }));
  };

  const openBasicEditModal = (entryPoint = 'page_header') => {
    setPendingAiProfileDraft(null);
    setEditFormData(getProfileBasicFormData(profile));
    setBasicSaveError(null);
    setIsEditModalOpen(true);
    recordProfileAction('profile_basic_edit_opened', {
      ...getProfileAnalyticsContext(entryPoint),
      fieldKeys: ['headline', 'location', 'bio'],
      fieldCount: 3,
    });
  };

  const recordProfileAiDraftDecision = (
    decision: 'used' | 'rejected',
    metadata?: Record<string, unknown>
  ) => {
    if (!pendingAiProfileDraft) return;

    recordAiWorkflowPrefillDecision({
      userId: user?.id,
      suggestionId: pendingAiProfileDraft.recommendationId,
      workflow: 'profile',
      decision,
      sourceLabel: pendingAiProfileDraft.sourceLabel,
      metadata: {
        fieldCount: pendingAiProfileDraft.fields.length,
        fields: pendingAiProfileDraft.fields.map(field => field.field),
        ...metadata,
      },
    });
  };

  const closeBasicEditModal = () => {
    const changedFields = getChangedBasicProfileFields(profile, editFormData);
    recordProfileAction('profile_basic_edit_cancelled', {
      ...getProfileAnalyticsContext(pendingAiProfileDraft ? 'ai_draft_review' : 'basic_edit_modal'),
      fieldKeys: changedFields,
      fieldCount: changedFields.length,
      aiFieldCount: pendingAiProfileDraft?.fields.length,
    });
    recordProfileAiDraftDecision('rejected', { decisionReason: 'cancel' });
    setIsEditModalOpen(false);
    setPendingAiProfileDraft(null);
    setBasicSaveError(null);
    setEditFormData(getProfileBasicFormData(profile));
  };

  const handleDiscardAiProfileDraft = () => {
    recordProfileAction('profile_ai_draft_discarded', {
      ...getProfileAnalyticsContext('ai_draft_review'),
      aiFieldCount: pendingAiProfileDraft?.fields.length,
      fieldKeys: pendingAiProfileDraft?.fields.map(field => field.field),
      fieldCount: pendingAiProfileDraft?.fields.length,
    });
    recordProfileAiDraftDecision('rejected', { decisionReason: 'discard' });
    setPendingAiProfileDraft(null);
    setBasicSaveError(null);
    setEditFormData(getProfileBasicFormData(profile));
    addToast({
      type: 'info',
      title: 'AI draft discarded',
      message: 'No profile changes were saved.'
    });
  };

  const handleSaveProfile = async () => {
    if (!user || !isOwnProfile) return;
    const changedFields = getChangedBasicProfileFields(profile, editFormData);
    setBasicSaveError(null);
    try {
      await profileService.updateProfile(user.id, {
        headline: editFormData.headline,
        location: editFormData.location,
        bio: editFormData.bio
      });
      recordProfileAiDraftDecision('used', { decisionReason: 'save_changes' });
      recordProfileAction('profile_basic_saved', {
        ...getProfileAnalyticsContext(pendingAiProfileDraft ? 'ai_draft_review' : 'basic_edit_modal'),
        fieldKeys: changedFields,
        fieldCount: changedFields.length,
        aiFieldCount: pendingAiProfileDraft?.fields.length,
      });
      setProfile((prev: Record<string, any> | null) => ({ ...prev, ...editFormData }));
      setPendingAiProfileDraft(null);
      setIsEditModalOpen(false);
      addToast({ type: 'success', title: 'Profile Updated', message: 'Your changes have been saved successfully.' });
    } catch (err) {
      console.error('Failed to update profile:', err);
      setBasicSaveError(profileBasicSaveFailureMessage);
      recordProfileAction('profile_basic_save_failed', {
        ...getProfileAnalyticsContext(pendingAiProfileDraft ? 'ai_draft_review' : 'basic_edit_modal'),
        fieldKeys: changedFields,
        fieldCount: changedFields.length,
        aiFieldCount: pendingAiProfileDraft?.fields.length,
        errorCategory: getProfileWorkflowErrorCategory(err, 'profile_basic_save_failed'),
      });
      addToast({ type: 'error', title: 'Update Failed', message: 'Please try again later.' });
    }
  };

  const clearAvatarReviewState = () => {
    setPendingAvatarFile(null);
    setPendingAvatarPreviewUrl(null);
    setPendingAvatarCrop(defaultProfileAvatarCrop);
    setAvatarUploadError(null);
    setIsAvatarReviewOpen(false);
  };

  const updatePendingAvatarCrop = (patch: Partial<ProfileAvatarCrop>) => {
    setAvatarUploadError(null);
    setPendingAvatarCrop(prev => normalizeProfileAvatarCrop({ ...prev, ...patch }));
  };

  const handleOpenProfilePhotoUpload = () => {
    if (!isOwnProfile || isUploadingAvatar) return;
    recordProfileAction('profile_photo_upload_opened', {
      ...getProfileAnalyticsContext('profile_header'),
      fieldKeys: ['avatarUrl'],
      fieldCount: 1,
    });
    avatarFileInputRef.current?.click();
  };

  const handleProfilePhotoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    setAvatarUploadError(null);

    if (!isSupportedProfileAvatarFile(file)) {
      recordProfileAction('profile_photo_upload_validation_failed', {
        ...getProfileAnalyticsContext('profile_header'),
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
        errorCategory: 'unsupported_file_type',
      });
      addToast({ type: 'warning', title: 'Unsupported image', message: 'Choose a PNG, JPG, WebP, or GIF image file.' });
      return;
    }

    if (file.size > maxProfileAvatarBytes) {
      recordProfileAction('profile_photo_upload_validation_failed', {
        ...getProfileAnalyticsContext('profile_header'),
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
        errorCategory: 'file_too_large',
      });
      addToast({ type: 'warning', title: 'Image too large', message: 'Choose an image under 2 MB.' });
      return;
    }

    const previewUrl = window.URL.createObjectURL(file);
    setPendingAvatarFile(file);
    setPendingAvatarPreviewUrl(previewUrl);
    setPendingAvatarCrop(defaultProfileAvatarCrop);
    setIsAvatarReviewOpen(true);
    recordProfileAction('profile_photo_upload_review_opened', {
      ...getProfileAnalyticsContext('profile_header'),
      fieldKeys: ['avatarUrl'],
      fieldCount: 1,
    });
  };

  const handleCancelProfilePhotoUpload = () => {
    if (isUploadingAvatar) return;
    recordProfileAction('profile_photo_upload_cancelled', {
      ...getProfileAnalyticsContext('profile_photo_review'),
      fieldKeys: ['avatarUrl'],
      fieldCount: 1,
    });
    clearAvatarReviewState();
  };

  const handleConfirmProfilePhotoUpload = async () => {
    if (!user?.id || !pendingAvatarFile || !isOwnProfile) return;

    setIsUploadingAvatar(true);
    setAvatarUploadError(null);
    let uploadedAvatarUrl: string | null = null;

    try {
      const croppedAvatarFile = await createCroppedProfileAvatarFile(pendingAvatarFile, pendingAvatarCrop);
      const uploadResult = await fileUploadService.uploadFile(croppedAvatarFile, 'avatars');
      uploadedAvatarUrl = uploadResult.url;
      const updatedAvatar = await profileService.updateAvatar(user.id, uploadResult.url);
      const nextAvatarUrl = updatedAvatar.avatarUrl || updatedAvatar.avatar_url || uploadResult.url;
      const nextProfile = {
        ...(profile || {}),
        avatarUrl: nextAvatarUrl,
        avatar_url: nextAvatarUrl,
        profiles: profile?.profiles
          ? {
            ...profile.profiles,
            avatar_url: nextAvatarUrl,
          }
          : profile?.profiles,
      };

      setProfile(nextProfile);
      recordProfileAction('profile_photo_uploaded', {
        ...getProfileAnalyticsContext('profile_photo_review', nextProfile),
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
      });
      clearAvatarReviewState();
      addToast({ type: 'success', title: 'Profile photo updated', message: 'Your new profile photo is now visible on your profile.' });
    } catch (err) {
      console.error('Failed to update profile photo:', err);
      setAvatarUploadError(profileAvatarUploadFailureMessage);
      if (uploadedAvatarUrl) {
        await fileUploadService.deleteFile(uploadedAvatarUrl).catch((cleanupError) => {
          console.warn('Failed to clean up uploaded avatar after profile update failure:', cleanupError);
        });
      }
      recordProfileAction('profile_photo_upload_failed', {
        ...getProfileAnalyticsContext('profile_photo_review'),
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
        errorCategory: getProfileWorkflowErrorCategory(err, 'profile_photo_upload_failed'),
      });
      addToast({ type: 'error', title: 'Photo upload failed', message: 'Please try another image or upload again later.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleOpenProfilePhotoRemove = () => {
    if (!isOwnProfile || !getProfileAvatarUrl(profile) || isRemovingAvatar) return;
    setAvatarRemoveError(null);
    recordProfileAction('profile_photo_remove_review_opened', {
      ...getProfileAnalyticsContext('profile_header'),
      fieldKeys: ['avatarUrl'],
      fieldCount: 1,
    });
    setIsAvatarRemoveOpen(true);
  };

  const handleCancelProfilePhotoRemove = () => {
    if (isRemovingAvatar) return;
    recordProfileAction('profile_photo_remove_cancelled', {
      ...getProfileAnalyticsContext('profile_photo_remove'),
      fieldKeys: ['avatarUrl'],
      fieldCount: 1,
    });
    setAvatarRemoveError(null);
    setIsAvatarRemoveOpen(false);
  };

  const handleConfirmProfilePhotoRemove = async () => {
    if (!user?.id || !isOwnProfile) return;
    const currentAvatarUrl = getProfileAvatarUrl(profile);
    if (!currentAvatarUrl) return;

    setIsRemovingAvatar(true);
    setAvatarRemoveError(null);

    try {
      await profileService.updateAvatar(user.id, null);
      const nextProfile = {
        ...(profile || {}),
        avatarUrl: '',
        avatar_url: null,
        profiles: profile?.profiles
          ? {
            ...profile.profiles,
            avatar_url: null,
          }
          : profile?.profiles,
      };

      setProfile(nextProfile);
      setIsAvatarRemoveOpen(false);
      await fileUploadService.deleteFile(currentAvatarUrl).catch((cleanupError) => {
        console.warn('Failed to delete removed profile photo artifact:', cleanupError);
      });
      recordProfileAction('profile_photo_removed', {
        ...getProfileAnalyticsContext('profile_photo_remove', nextProfile),
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
      });
      addToast({ type: 'success', title: 'Profile photo removed', message: 'Your profile now shows your initials instead.' });
    } catch (err) {
      console.error('Failed to remove profile photo:', err);
      setAvatarRemoveError(profileAvatarRemoveFailureMessage);
      recordProfileAction('profile_photo_remove_failed', {
        ...getProfileAnalyticsContext('profile_photo_remove'),
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
        errorCategory: getProfileWorkflowErrorCategory(err, 'profile_photo_remove_failed'),
      });
      addToast({ type: 'error', title: 'Remove photo failed', message: 'Please try again later.' });
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleApplyProfileSuggestion = (suggestion: ProfileSuggestion) => {
    if (!isOwnProfile) return;

    recordProfileAction('profile_suggestion_applied', {
      ...getProfileAnalyticsContext('profile_suggestions'),
      suggestionType: suggestion.field,
      suggestionSource: suggestion.source,
      fieldKeys: [suggestion.field],
      fieldCount: 1,
      rowType: suggestion.field === 'skill' ? 'skill' : 'basic',
    });

    if (suggestion.field === 'skill') {
      setPendingAiProfileDraft(null);
      setSkillForm({
        name: suggestion.value,
        proficiency: 'INTERMEDIATE',
        yearsOfExperience: ''
      });
      setEditingProfileRow(null);
      setActiveCompletionTask('skill');
      recordProfileAction('profile_completion_task_opened', {
        ...getProfileAnalyticsContext('profile_suggestion'),
        rowType: 'skill',
        rowMode: 'create',
      });
      return;
    }

    setPendingAiProfileDraft(null);
    setBasicSaveError(null);
    setEditFormData({
      ...getProfileBasicFormData(profile),
      [suggestion.field]: suggestion.value
    });
    setIsEditModalOpen(true);
    recordProfileAction('profile_basic_edit_opened', {
      ...getProfileAnalyticsContext('profile_suggestion'),
      fieldKeys: [suggestion.field],
      fieldCount: 1,
    });
  };

  const resetCompletionForms = () => {
    setSkillForm({ name: '', proficiency: 'INTERMEDIATE', yearsOfExperience: '' });
    setExperienceForm({ title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
    setEducationForm({ institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', gpa: '' });
  };

  const closeCompletionTaskModal = (reason: 'cancel' | 'saved' = 'cancel') => {
    if (reason === 'cancel' && activeCompletionTask) {
      recordProfileAction('profile_completion_task_cancelled', {
        ...getProfileAnalyticsContext('completion_task_modal'),
        rowType: activeCompletionTask,
        rowMode: editingProfileRow ? 'edit' : 'create',
      });
    }
    setActiveCompletionTask(null);
    setEditingProfileRow(null);
    setCompletionTaskError(null);
    resetCompletionForms();
  };

  const openAddCompletionTask = (task: CompletionTaskType, entryPoint = 'completion_checklist') => {
    setEditingProfileRow(null);
    setCompletionTaskError(null);
    resetCompletionForms();
    setActiveCompletionTask(task);
    recordProfileAction('profile_completion_task_opened', {
      ...getProfileAnalyticsContext(entryPoint),
      rowType: task,
      rowMode: 'create',
    });
  };

  const handleProfileTabChange = (tabId: string) => {
    recordProfileAction('profile_tab_selected', {
      ...getProfileAnalyticsContext('profile_tabs'),
      tabId,
    });
    setActiveTab(tabId);
  };

  const handleSaveCompletionTask = async () => {
    if (!user?.id || !activeCompletionTask || !isOwnProfile) return;
    const currentEditingRow = editingProfileRow;
    const rowMode = currentEditingRow ? 'edit' : 'create';
    setCompletionTaskError(null);

    try {
      setIsSavingCompletionTask(true);

      if (activeCompletionTask === 'skill') {
        if (!skillForm.name.trim()) {
          recordProfileAction('profile_completion_task_validation_failed', {
            ...getProfileAnalyticsContext('completion_task_modal'),
            rowType: 'skill',
            rowMode,
            fieldKeys: ['name'],
            missingFieldCount: 1,
            errorCategory: 'missing_required_fields',
          });
          addToast({ type: 'warning', title: 'Skill required', message: 'Add a skill name before saving.' });
          return;
        }

        const skillPayload = {
          name: skillForm.name.trim(),
          proficiency: skillForm.proficiency,
          years_of_experience: skillForm.yearsOfExperience ? Number.parseInt(skillForm.yearsOfExperience, 10) : undefined
        };
        const savedSkill = currentEditingRow?.type === 'skill'
          ? await profileService.updateSkill(currentEditingRow.id, skillPayload)
          : await profileService.addSkill(user.id, skillPayload);

        setProfile((prev) => ({
          ...prev,
          skills: currentEditingRow?.type === 'skill'
            ? (prev?.skills || []).map((item: Record<string, any> | string) => getSkillId(item) === currentEditingRow.id ? savedSkill : item)
            : [...(prev?.skills || []), savedSkill]
        }));
      }

      if (activeCompletionTask === 'experience') {
        if (!experienceForm.title.trim() || !experienceForm.company.trim() || !experienceForm.startDate) {
          const missingFields = [
            !experienceForm.title.trim() ? 'title' : '',
            !experienceForm.company.trim() ? 'company' : '',
            !experienceForm.startDate ? 'startDate' : '',
          ].filter(Boolean);
          recordProfileAction('profile_completion_task_validation_failed', {
            ...getProfileAnalyticsContext('completion_task_modal'),
            rowType: 'experience',
            rowMode,
            fieldKeys: missingFields,
            missingFieldCount: missingFields.length,
            errorCategory: 'missing_required_fields',
          });
          addToast({ type: 'warning', title: 'Experience details required', message: 'Add title, company, and start date before saving.' });
          return;
        }

        const experiencePayload = {
          title: experienceForm.title.trim(),
          company: experienceForm.company.trim(),
          location: experienceForm.location.trim() || undefined,
          startDate: experienceForm.startDate,
          endDate: experienceForm.current ? undefined : experienceForm.endDate || undefined,
          current: experienceForm.current,
          description: experienceForm.description.trim()
        };
        const savedExperience = currentEditingRow?.type === 'experience'
          ? await profileService.updateExperience(currentEditingRow.id, experiencePayload)
          : await profileService.addExperience(user.id, experiencePayload);

        setProfile((prev) => ({
          ...prev,
          experiences: currentEditingRow?.type === 'experience'
            ? (prev?.experiences || []).map((item: Record<string, any>) => getProfileRowId(item) === currentEditingRow.id ? savedExperience : item)
            : [...(prev?.experiences || []), savedExperience]
        }));
        setActiveTab('experience');
      }

      if (activeCompletionTask === 'education') {
        if (!educationForm.institution.trim() || !educationForm.startDate) {
          const missingFields = [
            !educationForm.institution.trim() ? 'institution' : '',
            !educationForm.startDate ? 'startDate' : '',
          ].filter(Boolean);
          recordProfileAction('profile_completion_task_validation_failed', {
            ...getProfileAnalyticsContext('completion_task_modal'),
            rowType: 'education',
            rowMode,
            fieldKeys: missingFields,
            missingFieldCount: missingFields.length,
            errorCategory: 'missing_required_fields',
          });
          addToast({ type: 'warning', title: 'Education details required', message: 'Add institution and start date before saving.' });
          return;
        }

        const educationPayload = {
          institution: educationForm.institution.trim(),
          degree: educationForm.degree.trim(),
          fieldOfStudy: educationForm.fieldOfStudy.trim(),
          startDate: educationForm.startDate,
          endDate: educationForm.endDate || undefined,
          gpa: educationForm.gpa ? Number.parseFloat(educationForm.gpa) : undefined
        };
        const savedEducation = currentEditingRow?.type === 'education'
          ? await profileService.updateEducation(currentEditingRow.id, educationPayload)
          : await profileService.addEducation(user.id, educationPayload);

        setProfile((prev) => {
          const currentEducation = Array.isArray(prev?.educations) ? prev.educations : (Array.isArray(prev?.education) ? prev.education : []);
          const nextEducation = currentEditingRow?.type === 'education'
            ? currentEducation.map((item: Record<string, any>) => getProfileRowId(item) === currentEditingRow.id ? savedEducation : item)
            : [...currentEducation, savedEducation];

          return {
            ...prev,
            educations: nextEducation,
            education: Array.isArray(prev?.education) ? nextEducation : prev?.education
          };
        });
        setActiveTab('education');
      }

      recordProfileAction('profile_completion_task_saved', {
        ...getProfileAnalyticsContext('completion_task_modal'),
        rowType: activeCompletionTask,
        rowMode,
      });
      addToast({
        type: 'success',
        title: 'Profile updated',
        message: currentEditingRow ? 'Your profile row has been updated.' : 'Your profile completion task has been saved.'
      });
      closeCompletionTaskModal('saved');
    } catch (err) {
      console.error('Failed to save profile completion task:', err);
      setCompletionTaskError(profileCompletionSaveFailureMessage);
      recordProfileAction('profile_completion_task_save_failed', {
        ...getProfileAnalyticsContext('completion_task_modal'),
        rowType: activeCompletionTask,
        rowMode,
        errorCategory: getProfileWorkflowErrorCategory(err, 'profile_completion_task_save_failed'),
      });
      addToast({ type: 'error', title: 'Save failed', message: 'Please try again later.' });
    } finally {
      setIsSavingCompletionTask(false);
    }
  };

  const handleDeleteSkill = (skill: Record<string, any> | string) => {
    const skillId = getSkillId(skill);
    if (!skillId || !isOwnProfile) return;

    setPendingProfileDelete({
      type: 'skill',
      id: skillId,
      label: getSkillName(skill) || 'this skill',
      row: skill
    });
    setProfileDeleteError(null);
    recordProfileAction('profile_row_delete_review_opened', {
      ...getProfileAnalyticsContext('skill_row'),
      rowType: 'skill',
    });
  };

  const handleConfirmProfileDelete = async () => {
    if (!pendingProfileDelete || !isOwnProfile) return;
    setProfileDeleteError(null);

    try {
      if (pendingProfileDelete.type === 'skill') {
        const { id: skillId, label } = pendingProfileDelete;
        setDeletingSkillIds(prev => new Set(prev).add(skillId));
        await profileService.deleteSkill(skillId);
        setProfile((prev) => ({
          ...prev,
          skills: (prev?.skills || []).filter((item: Record<string, any> | string) => getSkillId(item) !== skillId)
        }));
        recordProfileAction('profile_row_delete_completed', {
          ...getProfileAnalyticsContext('delete_confirmation'),
          rowType: 'skill',
        });
        addToast({ type: 'success', title: 'Skill removed', message: `${label} was removed from your profile.` });
        setProfileDeleteError(null);
        setPendingProfileDelete(null);
      }

      if (pendingProfileDelete.type === 'experience') {
        const { id: experienceId, label } = pendingProfileDelete;
        setDeletingExperienceIds(prev => new Set(prev).add(experienceId));
        await profileService.deleteExperience(experienceId);
        setProfile((prev) => ({
          ...prev,
          experiences: (prev?.experiences || []).filter((item: Record<string, any>) => getProfileRowId(item) !== experienceId)
        }));
        recordProfileAction('profile_row_delete_completed', {
          ...getProfileAnalyticsContext('delete_confirmation'),
          rowType: 'experience',
        });
        addToast({ type: 'success', title: 'Experience removed', message: `${label} was removed from your profile.` });
        setProfileDeleteError(null);
        setPendingProfileDelete(null);
      }

      if (pendingProfileDelete.type === 'education') {
        const { id: educationId, label } = pendingProfileDelete;
        setDeletingEducationIds(prev => new Set(prev).add(educationId));
        await profileService.deleteEducation(educationId);
        setProfile((prev) => ({
          ...prev,
          educations: (prev?.educations || []).filter((item: Record<string, any>) => getProfileRowId(item) !== educationId),
          education: Array.isArray(prev?.education)
            ? prev.education.filter((item: Record<string, any>) => getProfileRowId(item) !== educationId)
            : prev?.education
        }));
        recordProfileAction('profile_row_delete_completed', {
          ...getProfileAnalyticsContext('delete_confirmation'),
          rowType: 'education',
        });
        addToast({ type: 'success', title: 'Education removed', message: `${label} was removed from your profile.` });
        setProfileDeleteError(null);
        setPendingProfileDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete profile row:', err);
      setProfileDeleteError(profileRowDeleteFailureMessage);
      recordProfileAction('profile_row_delete_failed', {
        ...getProfileAnalyticsContext('delete_confirmation'),
        rowType: pendingProfileDelete.type,
        errorCategory: getProfileWorkflowErrorCategory(err, 'profile_row_delete_failed'),
      });
      addToast({ type: 'error', title: 'Delete failed', message: 'Please try removing this profile item again.' });
    } finally {
      const deleteRequest = pendingProfileDelete;

      if (deleteRequest?.type === 'skill') {
        setDeletingSkillIds(prev => {
          const next = new Set(prev);
          next.delete(deleteRequest.id);
          return next;
        });
      }

      if (deleteRequest?.type === 'experience') {
        setDeletingExperienceIds(prev => {
          const next = new Set(prev);
          next.delete(deleteRequest.id);
          return next;
        });
      }

      if (deleteRequest?.type === 'education') {
        setDeletingEducationIds(prev => {
          const next = new Set(prev);
          next.delete(deleteRequest.id);
          return next;
        });
      }
    }
  };

  const handleEditSkill = (skill: Record<string, any> | string) => {
    const skillId = getSkillId(skill);
    if (!skillId || !isOwnProfile) return;

    const existingYears = getSkillYears(skill);
    setSkillForm({
      name: getSkillName(skill) || '',
      proficiency: getSkillProficiency(skill),
      yearsOfExperience: existingYears === undefined || existingYears === null ? '' : String(existingYears)
    });
    setEditingProfileRow({ type: 'skill', id: skillId });
    setCompletionTaskError(null);
    setActiveCompletionTask('skill');
    recordProfileAction('profile_completion_task_opened', {
      ...getProfileAnalyticsContext('skill_row'),
      rowType: 'skill',
      rowMode: 'edit',
    });
  };

  const handleEditExperience = (experience: Record<string, any>) => {
    const experienceId = getProfileRowId(experience);
    if (!experienceId || !isOwnProfile) return;

    setExperienceForm({
      title: experience.title || '',
      company: experience.company || '',
      location: experience.location || '',
      startDate: formatDateInput(getExperienceStartDate(experience)),
      endDate: experience.current ? '' : formatDateInput(getExperienceEndDate(experience)),
      current: Boolean(experience.current),
      description: experience.description || ''
    });
    setEditingProfileRow({ type: 'experience', id: experienceId });
    setCompletionTaskError(null);
    setActiveCompletionTask('experience');
    recordProfileAction('profile_completion_task_opened', {
      ...getProfileAnalyticsContext('experience_row'),
      rowType: 'experience',
      rowMode: 'edit',
    });
  };

  const handleEditEducation = (educationRow: Record<string, any>) => {
    const educationId = getProfileRowId(educationRow);
    if (!educationId || !isOwnProfile) return;

    setEducationForm({
      institution: educationRow.institution || '',
      degree: educationRow.degree || '',
      fieldOfStudy: educationRow.fieldOfStudy || educationRow.field_of_study || '',
      startDate: formatDateInput(getEducationStartDate(educationRow)),
      endDate: formatDateInput(getEducationEndDate(educationRow)),
      gpa: typeof educationRow.gpa === 'number' ? String(educationRow.gpa) : educationRow.gpa || ''
    });
    setEditingProfileRow({ type: 'education', id: educationId });
    setCompletionTaskError(null);
    setActiveCompletionTask('education');
    recordProfileAction('profile_completion_task_opened', {
      ...getProfileAnalyticsContext('education_row'),
      rowType: 'education',
      rowMode: 'edit',
    });
  };

  const handleDeleteExperience = (experience: Record<string, any>) => {
    const experienceId = getProfileRowId(experience);
    if (!experienceId || !isOwnProfile) return;

    setPendingProfileDelete({
      type: 'experience',
      id: experienceId,
      label: experience.title || 'This role',
      row: experience
    });
    setProfileDeleteError(null);
    recordProfileAction('profile_row_delete_review_opened', {
      ...getProfileAnalyticsContext('experience_row'),
      rowType: 'experience',
    });
  };

  const handleDeleteEducation = (educationRow: Record<string, any>) => {
    const educationId = getProfileRowId(educationRow);
    if (!educationId || !isOwnProfile) return;

    setPendingProfileDelete({
      type: 'education',
      id: educationId,
      label: educationRow.institution || 'This education row',
      row: educationRow
    });
    setProfileDeleteError(null);
    recordProfileAction('profile_row_delete_review_opened', {
      ...getProfileAnalyticsContext('education_row'),
      rowType: 'education',
    });
  };

  const handleCancelProfileDelete = () => {
    const deleteInProgress = Boolean(
      pendingProfileDelete &&
      (
        (pendingProfileDelete.type === 'skill' && deletingSkillIds.has(pendingProfileDelete.id)) ||
        (pendingProfileDelete.type === 'experience' && deletingExperienceIds.has(pendingProfileDelete.id)) ||
        (pendingProfileDelete.type === 'education' && deletingEducationIds.has(pendingProfileDelete.id))
      )
    );
    if (!pendingProfileDelete || deleteInProgress) return;
    recordProfileAction('profile_row_delete_cancelled', {
      ...getProfileAnalyticsContext('delete_confirmation'),
      rowType: pendingProfileDelete.type,
    });
    setProfileDeleteError(null);
    setPendingProfileDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="p-6">
          <div className="flex gap-5">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" />
        <Card
          role="alert"
          className="flex flex-col items-center gap-3 p-8 text-center text-sm text-[var(--text-muted)]"
        >
          <p className="text-base font-semibold text-[var(--text-primary)]">Profile could not load</p>
          <p className="max-w-xl leading-6">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadProfile('profile_load_retry')}>
            <RotateCcw size={13} className="mr-1" />
            Retry profile
          </Button>
        </Card>
      </div>
    );
  }

  const userName = profile?.fullName || profile?.full_name || profile?.profiles?.full_name || user?.email?.split('@')[0] || 'User';
  const experiences = profile?.experiences || [];
  const education = profile?.educations || profile?.education || [];
  const skills = profile?.skills || [];
  const achievements = profile?.achievements || [];
  const avatarUrl = getProfileAvatarUrl(profile);
  const avatarCropPreviewStyle = getProfileAvatarCropPreviewStyle(pendingAvatarCrop);
  const hasBasicInfo = Boolean(profile?.headline && profile?.location && profile?.bio);
  const profileSuggestions = isOwnProfile ? buildProfileSuggestions(profile, experiences, skills) : [];
  const completionTasks = [
    {
      id: 'basic',
      label: 'Basic information',
      description: 'Add headline, location, and bio',
      complete: hasBasicInfo,
      actionLabel: 'Edit',
      onClick: () => openBasicEditModal('completion_checklist')
    },
    {
      id: 'skills',
      label: 'Skills',
      description: 'Add at least one skill for job matching',
      complete: skills.length > 0,
      actionLabel: 'Add skill',
      onClick: () => openAddCompletionTask('skill')
    },
    {
      id: 'experience',
      label: 'Work experience',
      description: 'Add a current or past role',
      complete: experiences.length > 0,
      actionLabel: 'Add role',
      onClick: () => openAddCompletionTask('experience')
    },
    {
      id: 'education',
      label: 'Education',
      description: 'Add school, certification, or training',
      complete: education.length > 0,
      actionLabel: 'Add education',
      onClick: () => openAddCompletionTask('education')
    }
  ];
  const completionPercentage = Math.round((completionTasks.filter(task => task.complete).length / completionTasks.length) * 100);
  const activeCompletionTaskTitle = activeCompletionTask === 'skill'
    ? editingProfileRow?.type === 'skill' ? 'Edit Skill' : 'Add Skill'
    : activeCompletionTask === 'experience'
      ? editingProfileRow?.type === 'experience' ? 'Edit Work Experience' : 'Add Work Experience'
      : editingProfileRow?.type === 'education' ? 'Edit Education' : 'Add Education';
  const isDeletingPendingProfileRow = Boolean(
    pendingProfileDelete &&
    (
      (pendingProfileDelete.type === 'skill' && deletingSkillIds.has(pendingProfileDelete.id)) ||
      (pendingProfileDelete.type === 'experience' && deletingExperienceIds.has(pendingProfileDelete.id)) ||
      (pendingProfileDelete.type === 'education' && deletingEducationIds.has(pendingProfileDelete.id))
    )
  );



  return (
    <div className="space-y-6">
      <PageHeader
        title={isOwnProfile ? 'Profile' : `${userName}'s Profile`}
        actions={isOwnProfile ? <Button variant="outline" size="sm" onClick={() => openBasicEditModal('page_header')}><Edit2 size={14} className="mr-1" /> Edit Profile</Button> : undefined}
      />

      <AuraModal
        isOpen={isEditModalOpen}
        onClose={closeBasicEditModal}
        title={pendingAiProfileDraft ? 'Review AI Profile Draft' : 'Edit Profile'}
      >
        <div className="space-y-4 py-4">
          {basicSaveError && <ProfileActionFailureAlert message={basicSaveError} />}
          {pendingAiProfileDraft && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">AI profile draft</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    Source: {pendingAiProfileDraft.sourceLabel || 'TalentSphere AI assistant'}. These fields are editable and remain unsaved until you approve them.
                  </p>
                </div>
                <Badge variant="warning" className="w-fit shrink-0">Review before save</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {pendingAiProfileDraft.fields.map((field) => (
                  <div key={field.field} className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] p-2">
                    <p className="text-xs font-medium text-[var(--text-primary)]">{field.label}</p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase text-[var(--text-muted)]">Current</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{field.currentValue || 'Empty'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-accent">AI draft</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-primary)]">{field.proposedValue}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={handleDiscardAiProfileDraft}>
                  Discard AI draft
                </Button>
              </div>
            </div>
          )}
          <Input
            label="Headline"
            value={editFormData.headline}
            onChange={(e) => updateBasicEditFormData({ headline: e.target.value })}
            placeholder="e.g. Senior Software Engineer"
          />
          <Input
            label="Location"
            value={editFormData.location}
            onChange={(e) => updateBasicEditFormData({ location: e.target.value })}
            placeholder="e.g. Remote, or New York, NY"
            icon={<MapPin size={16} />}
          />
          <div>
             <label className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Bio</label>
             <textarea
               className="w-full min-h-[100px] p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
               value={editFormData.bio}
               onChange={(e) => updateBasicEditFormData({ bio: e.target.value })}
               placeholder="Tell us about yourself..."
             />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 border-t border-[var(--border-default)] pt-4">
          <Button variant="outline" onClick={closeBasicEditModal}>Cancel</Button>
          <Button onClick={handleSaveProfile}><Save size={16} className="mr-1.5" /> Save Changes</Button>
        </div>
      </AuraModal>

      <AuraModal
        isOpen={Boolean(activeCompletionTask)}
        onClose={closeCompletionTaskModal}
        title={activeCompletionTaskTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => closeCompletionTaskModal()}>Cancel</Button>
            <Button onClick={handleSaveCompletionTask} isLoading={isSavingCompletionTask}>
              <Save size={16} className="mr-1.5" /> {editingProfileRow ? 'Save Changes' : 'Save'}
            </Button>
          </>
        }
      >
        {completionTaskError && (
          <div className="mb-4">
            <ProfileActionFailureAlert message={completionTaskError} />
          </div>
        )}
        {activeCompletionTask === 'skill' && (
          <div className="space-y-4">
            <Input
              label="Skill"
              value={skillForm.name}
              onChange={(e) => updateSkillForm({ name: e.target.value })}
              placeholder="e.g. React, Java, Product Strategy"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="skill-proficiency" className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Proficiency</label>
                <select
                  id="skill-proficiency"
                  className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  value={skillForm.proficiency}
                  onChange={(e) => updateSkillForm({ proficiency: e.target.value })}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
              <Input
                label="Years"
                type="number"
                min="0"
                value={skillForm.yearsOfExperience}
                onChange={(e) => updateSkillForm({ yearsOfExperience: e.target.value })}
                placeholder="2"
              />
            </div>
          </div>
        )}

        {activeCompletionTask === 'experience' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Title"
                value={experienceForm.title}
                onChange={(e) => updateExperienceForm({ title: e.target.value })}
                placeholder="e.g. Frontend Engineer"
                required
              />
              <Input
                label="Company"
                value={experienceForm.company}
                onChange={(e) => updateExperienceForm({ company: e.target.value })}
                placeholder="e.g. TechCorp"
                required
              />
            </div>
            <Input
              label="Location"
              value={experienceForm.location}
              onChange={(e) => updateExperienceForm({ location: e.target.value })}
              placeholder="Remote, or New York, NY"
              icon={<MapPin size={16} />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={experienceForm.startDate}
                onChange={(e) => updateExperienceForm({ startDate: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={experienceForm.endDate}
                onChange={(e) => updateExperienceForm({ endDate: e.target.value })}
                disabled={experienceForm.current}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={experienceForm.current}
                onChange={(e) => updateExperienceForm({ current: e.target.checked, endDate: e.target.checked ? '' : experienceForm.endDate })}
              />
              I currently work here
            </label>
            <div>
              <label htmlFor="experience-description" className="block text-sm font-medium mb-1.5 text-[var(--text-primary)]">Description</label>
              <textarea
                id="experience-description"
                className="w-full min-h-[100px] p-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={experienceForm.description}
                onChange={(e) => updateExperienceForm({ description: e.target.value })}
                placeholder="Briefly describe your responsibilities and outcomes..."
              />
            </div>
          </div>
        )}

        {activeCompletionTask === 'education' && (
          <div className="space-y-4">
            <Input
              label="Institution"
              value={educationForm.institution}
              onChange={(e) => updateEducationForm({ institution: e.target.value })}
              placeholder="e.g. Stanford University"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Degree"
                value={educationForm.degree}
                onChange={(e) => updateEducationForm({ degree: e.target.value })}
                placeholder="e.g. B.S."
              />
              <Input
                label="Field of Study"
                value={educationForm.fieldOfStudy}
                onChange={(e) => updateEducationForm({ fieldOfStudy: e.target.value })}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={educationForm.startDate}
                onChange={(e) => updateEducationForm({ startDate: e.target.value })}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={educationForm.endDate}
                onChange={(e) => updateEducationForm({ endDate: e.target.value })}
              />
            </div>
            <Input
              label="GPA"
              type="number"
              min="0"
              max="4"
              step="0.01"
              value={educationForm.gpa}
              onChange={(e) => updateEducationForm({ gpa: e.target.value })}
              placeholder="3.80"
            />
          </div>
        )}
      </AuraModal>

      <AuraModal
        isOpen={isAvatarReviewOpen}
        onClose={handleCancelProfilePhotoUpload}
        title="Update Profile Photo"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleCancelProfilePhotoUpload}
              disabled={isUploadingAvatar}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmProfilePhotoUpload}
              isLoading={isUploadingAvatar}
              disabled={!pendingAvatarFile}
            >
              <Upload size={16} className="mr-1.5" /> Upload Photo
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {avatarUploadError && <ProfileActionFailureAlert message={avatarUploadError} />}
          <div className="mx-auto h-32 w-32 overflow-hidden rounded-full border border-[var(--border-default)] bg-accent/10">
            {pendingAvatarPreviewUrl ? (
              <img
                src={pendingAvatarPreviewUrl}
                alt="Selected profile photo preview"
                className="h-full w-full object-cover"
                style={avatarCropPreviewStyle}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-accent">
                {userName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="profile-avatar-crop-zoom" className="text-xs font-medium text-[var(--text-secondary)]">Zoom</label>
                <span className="text-xs text-[var(--text-muted)]">{Math.round(pendingAvatarCrop.zoom * 100)}%</span>
              </div>
              <input
                id="profile-avatar-crop-zoom"
                type="range"
                min="100"
                max="250"
                step="5"
                value={Math.round(pendingAvatarCrop.zoom * 100)}
                onChange={(event) => updatePendingAvatarCrop({ zoom: Number(event.target.value) / 100 })}
                className="w-full accent-accent"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-avatar-crop-x" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Horizontal</label>
                <input
                  id="profile-avatar-crop-x"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={pendingAvatarCrop.focalX}
                  onChange={(event) => updatePendingAvatarCrop({ focalX: Number(event.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
              <div>
                <label htmlFor="profile-avatar-crop-y" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Vertical</label>
                <input
                  id="profile-avatar-crop-y"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={pendingAvatarCrop.focalY}
                  onChange={(event) => updatePendingAvatarCrop({ focalY: Number(event.target.value) })}
                  className="w-full accent-accent"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPendingAvatarCrop(defaultProfileAvatarCrop)}
                disabled={isUploadingAvatar}
              >
                Reset Crop
              </Button>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Review and crop the selected image before uploading. It will replace the photo shown on your profile.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Supported image uploads are limited to 2 MB. Animated GIFs upload as a cropped still image.
          </p>
        </div>
      </AuraModal>

      <AuraModal
        isOpen={isAvatarRemoveOpen}
        onClose={handleCancelProfilePhotoRemove}
        title="Remove Profile Photo"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleCancelProfilePhotoRemove}
              disabled={isRemovingAvatar}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmProfilePhotoRemove}
              isLoading={isRemovingAvatar}
            >
              <Trash2 size={16} className="mr-1.5" /> Remove Photo
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {avatarRemoveError && <ProfileActionFailureAlert message={avatarRemoveError} />}
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-[var(--border-default)] bg-accent/10">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Current profile photo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-accent">
                {userName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            This removes the photo from your profile and shows your initials instead.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Profile viewers, messages, and networking surfaces may stop showing this image after removal.
          </p>
        </div>
      </AuraModal>

      <AuraModal
        isOpen={Boolean(pendingProfileDelete)}
        onClose={handleCancelProfileDelete}
        title="Remove Profile Item"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleCancelProfileDelete}
              disabled={isDeletingPendingProfileRow}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmProfileDelete}
              isLoading={isDeletingPendingProfileRow}
            >
              <Trash2 size={16} className="mr-1.5" /> Remove
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {profileDeleteError && <ProfileActionFailureAlert message={profileDeleteError} />}
          <p className="text-sm text-[var(--text-secondary)]">
            This will remove <span className="font-medium text-[var(--text-primary)]">{pendingProfileDelete?.label}</span> from your profile.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Matching, resume previews, and profile viewers may stop using this item after removal.
          </p>
        </div>
      </AuraModal>

      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent text-2xl font-semibold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                userName[0]?.toUpperCase()
              )}
            </div>
            {isOwnProfile && (
              <>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleProfilePhotoFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  aria-label="Update profile photo"
                  title="Update profile photo"
                  onClick={handleOpenProfilePhotoUpload}
                  disabled={isUploadingAvatar || isRemovingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  {isUploadingAvatar ? <Upload size={12} /> : <Camera size={12} />}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    aria-label="Remove profile photo"
                    title="Remove profile photo"
                    onClick={handleOpenProfilePhotoRemove}
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{userName}</h2>
              {isOwnProfile && user?.roles?.includes('ROLE_RECRUITER') && <Badge variant="default">Recruiter</Badge>}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{profile?.headline || 'Member'}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              {profile?.location && <span className="flex items-center gap-1"><MapPin size={12} /> {profile.location}</span>}
              {profile?.website && <span className="flex items-center gap-1"><LinkIcon size={12} /> {profile.website}</span>}
              <span className="flex items-center gap-1"><Calendar size={12} /> Joined {profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '2026'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skills.map((s: Record<string, any> | string, i: number) => {
                const skillName = getSkillName(s) || 'Skill';
                const skillId = getSkillId(s);
                const canManageSkill = Boolean(isOwnProfile && skillId);
                const isDeleting = Boolean(skillId && deletingSkillIds.has(skillId));

                return (
                  <span key={`${skillName}-${i}`} className="inline-flex items-center rounded-md border border-[var(--border-default)] bg-transparent text-[10px] font-medium text-[var(--text-secondary)]">
                    <span className="px-2 py-0.5">{skillName}</span>
                    {canManageSkill && (
                      <>
                        <button
                          type="button"
                          aria-label={`Edit skill ${skillName}`}
                          title={`Edit ${skillName}`}
                          onClick={() => handleEditSkill(s)}
                          disabled={isDeleting}
                          className="border-l border-[var(--border-default)] px-1.5 py-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-50"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove skill ${skillName}`}
                          title={`Remove ${skillName}`}
                          onClick={() => handleDeleteSkill(s)}
                          disabled={isDeleting}
                          className="border-l border-[var(--border-default)] px-1.5 py-0.5 text-[var(--text-muted)] transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                        >
                          <Trash2 size={10} />
                        </button>
                      </>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex gap-6 text-center shrink-0">
            <div><p className="text-2xl font-semibold">{profile?.connectionCount || 0}</p><p className="text-xs text-[var(--text-muted)]">Connections</p></div>
            <div><p className="text-2xl font-semibold">{profile?.applicationCount || 0}</p><p className="text-xs text-[var(--text-muted)]">Applications</p></div>
            <div><p className="text-2xl font-semibold">{achievements.length}</p><p className="text-xs text-[var(--text-muted)]">Badges</p></div>
          </div>
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'experience', label: 'Experience' },
          { id: 'education', label: 'Education' },
          { id: 'achievements', label: 'Achievements' },
        ]}
        activeTab={activeTab}
        onTabChange={handleProfileTabChange}
      />

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">About</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {profile?.bio || 'No bio provided yet.'}
            </p>
          </Card>
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">Profile Completion</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--border-default)]">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="space-y-3">
                {completionTasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border-default)] p-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {task.complete ? (
                        <CheckCircle2 size={16} className="mt-0.5 text-success shrink-0" />
                      ) : (
                        <Circle size={16} className="mt-0.5 text-[var(--text-muted)] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">{task.description}</p>
                      </div>
                    </div>
                    {isOwnProfile && !task.complete && (
                      <Button variant="outline" size="sm" onClick={task.onClick}>
                        <Plus size={13} className="mr-1" /> {task.actionLabel}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
          {profileSuggestions.length > 0 && (
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">Profile Suggestions</h3>
              <div className="space-y-3">
                {profileSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border border-[var(--border-default)] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{suggestion.label}</p>
                        <p className="text-xs text-[var(--text-muted)]">Source: {suggestion.source}</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">{suggestion.value}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleApplyProfileSuggestion(suggestion)}>
                        {suggestion.actionLabel}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'experience' && (
        <Card className="p-5 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Work Experience</h3>
            {isOwnProfile && (
              <Button variant="outline" size="sm" onClick={() => openAddCompletionTask('experience')}>
                <Plus size={13} className="mr-1" /> Add role
              </Button>
            )}
          </div>
          {experiences.length > 0 ? experiences.map((exp: Record<string, any>, i: number) => {
            const experienceId = getProfileRowId(exp);
            const isDeleting = Boolean(experienceId && deletingExperienceIds.has(experienceId));

            return (
              <div key={experienceId || i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <Briefcase size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{exp.title}</p>
                  <p className="text-xs text-accent">{exp.company}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {formatProfileDate(getExperienceStartDate(exp))} - {exp.current ? 'Present' : formatProfileDate(getExperienceEndDate(exp)) || 'Present'}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{exp.description}</p>
                </div>
                {isOwnProfile && experienceId && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit experience ${exp.title || 'row'}`}
                      title={`Edit ${exp.title || 'experience'}`}
                      onClick={() => handleEditExperience(exp)}
                      disabled={isDeleting}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove experience ${exp.title || 'row'}`}
                      title={`Remove ${exp.title || 'experience'}`}
                      onClick={() => handleDeleteExperience(exp)}
                      disabled={isDeleting}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">No work experience added yet.</div>
          )}
        </Card>
      )}

      {activeTab === 'education' && (
        <Card className="p-5 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Education</h3>
            {isOwnProfile && (
              <Button variant="outline" size="sm" onClick={() => openAddCompletionTask('education')}>
                <Plus size={13} className="mr-1" /> Add education
              </Button>
            )}
          </div>
          {education.length > 0 ? education.map((edu: Record<string, any>, i: number) => {
            const educationId = getProfileRowId(edu);
            const educationTitle = edu.degree || edu.fieldOfStudy || edu.field_of_study || 'Education';
            const isDeleting = Boolean(educationId && deletingEducationIds.has(educationId));

            return (
              <div key={educationId || i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <GraduationCap size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{educationTitle}</p>
                  <p className="text-xs text-accent">{edu.institution}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {formatProfileDate(getEducationEndDate(edu) || getEducationStartDate(edu)) || edu.year}
                  </p>
                </div>
                {isOwnProfile && educationId && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit education ${edu.institution || educationTitle}`}
                      title={`Edit ${edu.institution || educationTitle}`}
                      onClick={() => handleEditEducation(edu)}
                      disabled={isDeleting}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove education ${edu.institution || educationTitle}`}
                      title={`Remove ${edu.institution || educationTitle}`}
                      onClick={() => handleDeleteEducation(edu)}
                      disabled={isDeleting}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">No education history added yet.</div>
          )}
        </Card>
      )}

      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.length > 0 ? achievements.map((badge: Record<string, any>, i: number) => (
            <Card key={i} className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mx-auto mb-3">
                <Award size={16} />
              </div>
              <p className="text-sm font-semibold">{badge.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{badge.description}</p>
            </Card>
          )) : (
            <div className="col-span-full p-12 text-center text-sm text-[var(--text-muted)]">No achievements or badges earned yet.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
