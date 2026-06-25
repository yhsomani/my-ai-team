import React, { useState, useEffect } from 'react';
import { Download, GripVertical, Save } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { Tabs } from '../../components/shared/Tabs';
import { useToast } from '../../components/shared/Toast';
import { useAppSelector } from '../../store/hooks';
import { profileService } from '../../services/profileService';
import { Skeleton } from '../../components/shared/Skeleton';

interface ResumeDraft {
  fullName: string;
  email: string;
  headline: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
}

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

const formatResumeDate = (date?: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
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
  skills: Array<Record<string, any> | string>
) => {
  const contact = [draft.location, draft.email, draft.phone, draft.website].filter(Boolean).map(escapeHtml).join(' | ');
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
        <script>window.addEventListener('load', function () { window.print(); });</script>
      </body>
    </html>
  `;
};

const ResumeBuilder: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('editor');
  const { addToast } = useToast();

  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [resumeDraft, setResumeDraft] = useState<ResumeDraft>(initialResumeDraft);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      } catch (err) {
        console.error('Failed to fetch profile for resume:', err);
        addToast({ type: 'error', title: 'Unable to load resume data', message: 'Please refresh and try again.' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [addToast, user]);

  const experiences = profile?.experiences || [];
  const education = profile?.education || profile?.educations || [];
  const skills = profile?.skills || [];

  const handleExport = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');

    if (!printWindow) {
      addToast({ type: 'error', title: 'Export blocked', message: 'Allow popups to open the print-ready resume.' });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintableResume(resumeDraft, experiences, education, skills));
    printWindow.document.close();
    addToast({ type: 'success', title: 'Export ready', message: 'Use the print dialog to save the resume as PDF.' });
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const updatedProfile = await profileService.updateProfile(user.id, {
        headline: resumeDraft.headline,
        summary: resumeDraft.summary,
        phone: resumeDraft.phone,
        location: resumeDraft.location,
        website: resumeDraft.website,
      });
      setProfile((prev) => ({
        ...prev,
        ...updatedProfile,
        headline: resumeDraft.headline,
        summary: resumeDraft.summary,
        phone: resumeDraft.phone,
        location: resumeDraft.location,
        website: resumeDraft.website,
      }));
      addToast({ type: 'success', title: 'Saved', message: 'Resume profile fields have been saved.' });
    } catch (err) {
      console.error('Failed to save resume fields:', err);
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download size={14} className="mr-1" /> Export PDF
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              <Save size={14} className="mr-1" /> Save Changes
            </Button>
          </div>
        }
      />

      <Tabs
        tabs={[
          { id: 'editor', label: 'Editor' },
          { id: 'preview', label: 'Preview' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
