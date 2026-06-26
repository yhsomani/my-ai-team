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
      setLoadError('Career path generation is unavailable right now.');
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
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
    <div className="space-y-6">
      <PageHeader
        title="Career Paths"
        description="Review generated career-path guidance before choosing any learning or profile action."
        badge={<Badge variant={careerPath ? 'default' : 'warning'}>{careerPath ? 'Generated Guidance' : 'Needs data'}</Badge>}
      />

      {loadError && (
        <Card className="p-4 border-warning/30 bg-warning-muted/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-warning" />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Career path is not ready</p>
                <p className="text-xs text-[var(--text-muted)]">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPath} isLoading={loading}>
              <RefreshCw size={14} className="mr-1" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {careerPath && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-5 flex flex-col border-accent ring-1 ring-accent/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{careerPath.recommendedPath}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{careerPath.estimatedTimeline || 'Timeline not provided'}</p>
                </div>
              </div>
              <Badge variant="outline">Review first</Badge>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {careerPath.requiredSkills.length > 0 ? (
                careerPath.requiredSkills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-[10px]">{skill}</Badge>
                ))
              ) : (
                <span className="text-xs text-[var(--text-muted)]">No skill gaps were returned with this path.</span>
              )}
            </div>

            <div className="flex-1 space-y-2 mb-4">
              <p className="text-xs font-medium text-[var(--text-muted)]">Milestones</p>
              {milestones.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className={step.done ? 'text-success' : 'text-[var(--text-muted)]'} />
                  <span className={step.done ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}>{step.label}</span>
                </div>
              ))}
            </div>

            <Button size="sm" className="w-full" onClick={() => navigate('/lms')}>
              Explore Path <ArrowRight size={14} className="ml-1" />
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AICareerPath;
