import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Target, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { aiService } from '../../services/aiService';
import { Skeleton } from '../../components/shared/Skeleton';

interface CareerPathData {
  recommendedPath: string;
  estimatedTimeline?: string;
  requiredSkills: string[];
  milestones: Array<{ label: string; done: boolean }>;
}

const normalizeCareerPath = (data: unknown): CareerPathData | null => {
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  const recommendedPath = typeof record.recommendedPath === 'string' ? record.recommendedPath.trim() : '';
  const estimatedTimeline = typeof record.estimatedTimeline === 'string' ? record.estimatedTimeline.trim() : '';
  const requiredSkills = Array.isArray(record.requiredSkills)
    ? record.requiredSkills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
    : [];
  const milestones = Array.isArray(record.milestones)
    ? record.milestones
        .map((milestone) => {
          if (typeof milestone === 'string' && milestone.trim()) {
            return { label: milestone.trim(), done: false };
          }

          if (milestone && typeof milestone === 'object') {
            const label = (milestone as { label?: unknown }).label;
            if (typeof label === 'string' && label.trim()) {
              return { label: label.trim(), done: Boolean((milestone as { done?: unknown }).done) };
            }
          }

          return null;
        })
        .filter((milestone): milestone is { label: string; done: boolean } => Boolean(milestone))
    : [];

  if (!recommendedPath) return null;

  return {
    recommendedPath,
    estimatedTimeline,
    requiredSkills,
    milestones
  };
};

const careerPathDescriptionClassName = 'text-sm text-[var(--text-secondary)]';
const careerPathMutedClassName = 'text-xs text-[var(--text-muted)]';
const careerPathProviderFailureMessage = 'Career-path provider did not respond. Retry career path to reload generated guidance, required skills, milestones, and review-first handoffs.';
const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const getCareerPathRegionLabel = (path: CareerPathData) => (
  `Generated career path: ${path.recommendedPath}`
);

const getCareerPathSkillLabel = (skill: string) => (
  `Required skill: ${skill}`
);

const getCareerPathMilestoneLabel = (milestone: { label: string; done: boolean }) => (
  `${milestone.done ? 'Completed' : 'Pending'} milestone: ${milestone.label}`
);

const AICareerPath: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [careerPath, setCareerPath] = useState<CareerPathData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPath = useCallback(async () => {
    if (!user?.id) {
      setCareerPath(null);
      setLoadError('Sign in is required before a career path can be generated.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const data = await aiService.generateCareerPath(user.id);
      const normalizedPath = normalizeCareerPath(data);
      setCareerPath(normalizedPath);
      if (!normalizedPath) {
        setLoadError('Career path data was incomplete. Retry generation or open the AI Assistant for guided planning.');
      }
    } catch (err) {
      console.error('Failed to fetch career path:', err);
      setCareerPath(null);
      setLoadError(careerPathProviderFailureMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPath();
  }, [fetchPath]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Career Paths"
          description="Review generated career-path guidance before choosing any learning or profile action."
        />
        <div role="status" aria-label="Loading career path" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  const milestones = careerPath?.milestones.length
    ? careerPath.milestones
    : [
        { label: 'Review the recommended path and skill gaps', done: false },
        { label: 'Open learning catalog to choose the first course', done: false },
        { label: 'Ask AI Assistant for a tailored milestone plan', done: false },
      ];

  return (
    <div className="space-y-6" role="region" aria-label="Career path workspace">
      <PageHeader
        title="Career Paths"
        description="Review generated career-path guidance before choosing any learning or profile action."
        badge={<Badge variant={careerPath ? 'default' : 'warning'}>{careerPath ? 'Generated Guidance' : 'Needs data'}</Badge>}
      />

      {loadError && (
        <Card className="border-warning/30 bg-warning-muted p-4" role="alert">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle {...decorativeIconProps} size={18} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Career path is not ready</p>
                <p className={careerPathMutedClassName}>{loadError}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={fetchPath} isLoading={loading}>
                <RefreshCw {...decorativeIconProps} size={14} />
                Retry career path
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/ai')}>
                Ask AI Assistant
                <ArrowRight {...decorativeIconProps} size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {careerPath && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <Card className="flex min-w-0 flex-col border-accent p-5 ring-1 ring-accent/20" role="region" aria-label={getCareerPathRegionLabel(careerPath)}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Target {...decorativeIconProps} size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold">{careerPath.recommendedPath}</h3>
                  <p className={careerPathMutedClassName}>{careerPath.estimatedTimeline || 'Timeline not provided'}</p>
                </div>
              </div>
              <Badge variant="outline">Review first</Badge>
            </div>

            <div
              className="flex flex-wrap gap-1.5 mb-4"
              role={careerPath.requiredSkills.length > 0 ? 'list' : undefined}
              aria-label={careerPath.requiredSkills.length > 0 ? `Required skills for ${careerPath.recommendedPath}` : undefined}
            >
              {careerPath.requiredSkills.length > 0 ? (
                careerPath.requiredSkills.map((skill) => (
                  <Badge key={skill} role="listitem" aria-label={getCareerPathSkillLabel(skill)} variant="outline" className="max-w-full break-words text-[10px]">{skill}</Badge>
                ))
              ) : (
                <span className="text-xs text-[var(--text-muted)]">No skill gaps were returned with this path.</span>
              )}
            </div>

            <div className="flex-1 space-y-2 mb-4">
              <p className="text-xs font-medium text-[var(--text-muted)]">Milestones</p>
              <div role="list" aria-label={`Milestones for ${careerPath.recommendedPath}`} className="space-y-2">
                {milestones.map((step, i) => (
                  <div key={i} role="listitem" aria-label={getCareerPathMilestoneLabel(step)} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 {...decorativeIconProps} size={14} className={`${step.done ? 'text-success' : 'text-[var(--text-muted)]'} mt-0.5 shrink-0`} />
                    <span className={`${step.done ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'} break-words`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button size="sm" className="w-full" onClick={() => navigate('/lms')}>
              Explore Path <ArrowRight {...decorativeIconProps} size={14} className="ml-1" />
            </Button>
          </Card>
          <Card className="p-5" role="region" aria-label="Career path review boundaries">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Review Boundaries</h3>
            <p className={`${careerPathDescriptionClassName} mt-2`}>
              Generated guidance does not change your profile, skills, applications, or learning progress until you choose an action in the owning workflow.
            </p>
            <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]" role="list" aria-label="Career path review boundaries">
              <div className="flex items-start gap-2" role="listitem" aria-label="Review boundary: Use Learning to choose courses.">
                <CheckCircle2 {...decorativeIconProps} size={14} className="mt-0.5 shrink-0 text-success" />
                <span>Use Learning to choose courses.</span>
              </div>
              <div className="flex items-start gap-2" role="listitem" aria-label="Review boundary: Use Profile or Resume to edit durable records.">
                <CheckCircle2 {...decorativeIconProps} size={14} className="mt-0.5 shrink-0 text-success" />
                <span>Use Profile or Resume to edit durable records.</span>
              </div>
              <div className="flex items-start gap-2" role="listitem" aria-label="Review boundary: Ask AI Assistant for a more detailed plan before applying changes.">
                <CheckCircle2 {...decorativeIconProps} size={14} className="mt-0.5 shrink-0 text-success" />
                <span>Ask AI Assistant for a more detailed plan before applying changes.</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => navigate('/ai')}>
              Ask AI Assistant
              <ArrowRight {...decorativeIconProps} size={14} />
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AICareerPath;
