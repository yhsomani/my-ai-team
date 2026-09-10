import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building2,
  Clock,
  FileText,
  Globe,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import { applicationService } from '../../services/applicationService';
import { useAppSelector } from '../../store/hooks';
import type { Job, JobApplication } from '../../types/job';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { Skeleton } from '../../components/shared/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { useToast } from '../../components/shared/Toast';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const jobTypeOptions = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const normalizeJobType = (value?: string) => value?.toUpperCase().replace(/[\s-]+/g, '_') || '';

const getJobTypeLabel = (value?: string) => {
  const normalized = normalizeJobType(value);
  return jobTypeOptions.find(option => option.value === normalized)?.label || value || 'Job type';
};

const formatSalary = (job: Job) => {
  const min = job.salaryMin;
  const max = job.salaryMax;
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
  if (min) return `From ${formatter.format(min)}`;
  if (max) return `Up to ${formatter.format(max)}`;
  return null;
};

const formatPostedAt = (date?: string) => {
  if (!date) return 'Date not listed';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Date not listed';
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const getRequirements = (job: Job): string[] => job.requirements.filter(Boolean);

const JobDetailSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-96 max-w-full" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="lg:col-span-4">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<JobApplication | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isAuthenticated = Boolean(user);

  const loadJob = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    try {
      const data = await jobService.getJobById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setJob(data);
      }
    } catch (error) {
      console.error('Failed to load job details:', error);
      setLoadError('Job details could not be loaded. Retry to reload this role before applying.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !job?.id) {
      setExistingApplication(null);
      return;
    }

    let isActive = true;
    const loadExistingApplication = async () => {
      try {
        const applications = await applicationService.getUserApplications(user.id);
        if (!isActive) return;
        const match = applications.find(app => app.jobId === job.id) || null;
        setExistingApplication(match);
      } catch (error) {
        console.warn('Existing application check unavailable:', error);
      }
    };

    void loadExistingApplication();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, job?.id, user?.id]);

  const handleSubmit = async () => {
    if (!user?.id || !job) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await applicationService.submitApplication({
        userId: user.id,
        jobId: job.id,
        resumeUrl: resumeUrl.trim(),
        coverLetter: coverLetter.trim(),
      });
      addToast({ type: 'success', title: 'Application submitted', message: `Your application for ${job.title} was sent.` });
      setExistingApplication({
        id: `local-${Date.now()}`,
        jobId: job.id,
        userId: user.id,
        status: 'PENDING',
        appliedAt: new Date().toISOString(),
        resumeUrl: resumeUrl.trim(),
        coverLetter: coverLetter.trim(),
      });
    } catch (error) {
      console.error('Failed to submit application:', error);
      setSubmitError('The application was not submitted. Review the details and try again.');
      addToast({ type: 'error', title: 'Application failed', message: 'Your application could not be submitted.' });
    } finally {
      setSubmitting(false);
    }
  };

  const requirements = useMemo(() => (job ? getRequirements(job) : []), [job]);
  const salary = job ? formatSalary(job) : null;

  if (loading) return <JobDetailSkeleton />;

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Job not found"
          description="This listing may have been removed, archived, or the link is incomplete."
        />
        <Card className="p-6">
          <EmptyState
            icon={<Briefcase {...decorativeIconProps} className="h-10 w-10" />}
            title="No job found"
            description="The requested role could not be located. Return to the job catalog to keep exploring."
            action={{ label: 'Browse jobs', onClick: () => navigate('/jobs') }}
          />
        </Card>
      </div>
    );
  }

  if (loadError || !job) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title="Job details unavailable" description="The role could not be loaded right now." />
        <Card className="p-6">
          <EmptyState
            icon={<Briefcase {...decorativeIconProps} className="h-10 w-10" />}
            title="Could not load this role"
            description={loadError || 'The job listing did not respond. Retry to reload it.'}
            action={{ label: 'Retry job', onClick: loadJob }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Job Details"
        description="Review the role, requirements, and apply directly."
        actions={(
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
            <ArrowLeft {...decorativeIconProps} className="h-4 w-4" />
            Back to jobs
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">{job.title}</h2>
                  <Badge variant="outline">{getJobTypeLabel(job.jobType)}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 {...decorativeIconProps} size={16} className="text-accent" />
                    {job.companyName || 'Company'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin {...decorativeIconProps} size={16} className="text-accent" />
                    {job.location || 'Location not listed'}
                  </span>
                  {salary && (
                    <span className="inline-flex items-center gap-1.5">
                      <Banknote {...decorativeIconProps} size={16} className="text-accent" />
                      {salary}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Clock {...decorativeIconProps} size={16} className="text-accent" />
                    Posted {formatPostedAt(job.postedAt)}
                  </span>
                </div>
              </div>
              {typeof job.matchScore === 'number' && (
                <Badge variant="success">Match score {job.matchScore}%</Badge>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <FileText {...decorativeIconProps} size={16} className="text-accent" />
              About this role
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
              {job.description || 'No description provided for this role.'}
            </p>
          </Card>

          {requirements.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Sparkles {...decorativeIconProps} size={16} className="text-accent" />
                Requirements
              </h3>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
                {requirements.map((requirement, index) => (
                  <li key={`${requirement}-${index}`}>{requirement}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="lg:col-span-4">
          <Card className="sticky top-24 p-6">
            {existingApplication ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="success">Application submitted</Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  You already applied for this role. Current status:{' '}
                  <span className="font-medium text-[var(--text-primary)]">
                    {existingApplication.status?.replace(/_/g, ' ').toLowerCase() || 'pending'}
                  </span>
                  .
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate('/jobs?tab=applied')}>
                  View applications
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Apply to this role</Badge>
                </div>
                {!isAuthenticated && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Sign in to submit your application and track its status.
                  </p>
                )}

                {isAuthenticated && (
                  <>
                    <Input
                      label="Resume or profile URL"
                      value={resumeUrl}
                      onChange={(e) => setResumeUrl(e.target.value)}
                      placeholder="https://..."
                      helperText="Optional. A resume, portfolio, LinkedIn, or profile link."
                    />
                    <div className="flex flex-col gap-1.5 w-full">
                      <label htmlFor="job-detail-cover-letter" className="text-sm font-medium text-[var(--text-primary)]">Cover letter</label>
                      <textarea
                        id="job-detail-cover-letter"
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        placeholder="Add a short note for the recruiter..."
                        className="min-h-28 w-full rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-y"
                      />
                      <p className="text-xs text-[var(--text-muted)]">Optional. Review this before submitting.</p>
                    </div>

                    {submitError && (
                      <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {submitError}
                      </p>
                    )}

                    <Button className="w-full" onClick={handleSubmit} isLoading={submitting}>
                      <Globe {...decorativeIconProps} size={16} />
                      Submit Application
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;
