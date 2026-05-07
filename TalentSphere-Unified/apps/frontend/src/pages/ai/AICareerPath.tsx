import React, { useEffect, useState } from 'react';
import { Target, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { aiService } from '../../services/aiService';
import { Skeleton } from '../../components/shared/Skeleton';

const AICareerPath: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [careerPath, setCareerPath] = useState<any>(null);

  useEffect(() => {
    const fetchPath = async () => {
      if (!user) return;
      try {
        const data = await aiService.generateCareerPath(user.id);
        setCareerPath(data);
      } catch (err) {
        console.error('Failed to fetch career path:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPath();
  }, [user]);

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

  const paths = [
    {
      title: careerPath?.recommendedPath || 'Senior Software Engineer',
      match: 92,
      timeline: careerPath?.estimatedTimeline || '2-4 years',
      skills: careerPath?.requiredSkills || ['System Design', 'Cloud Architecture'],
      steps: [
        { label: 'Complete Advanced System Design', done: true },
        { label: 'Obtain Cloud Architect Certification', done: false },
        { label: 'Lead a cross-functional project', done: false },
      ],
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Paths"
        description="AI-recommended career trajectories based on your skills and experience."
        badge={<Badge>AI Powered</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {paths.map((path, idx) => (
          <Card key={idx} className={`p-5 flex flex-col ${idx === 0 ? 'border-accent ring-1 ring-accent/20' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{path.title}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{path.timeline}</p>
                </div>
              </div>
              <Badge variant={path.match >= 90 ? 'success' : path.match >= 75 ? 'default' : 'outline'}>
                {path.match}% match
              </Badge>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {path.skills.map((s: string) => (
                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
              ))}
            </div>

            <div className="flex-1 space-y-2 mb-4">
              <p className="text-xs font-medium text-[var(--text-muted)]">Milestones</p>
              {path.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className={step.done ? 'text-success' : 'text-[var(--text-muted)]'} />
                  <span className={step.done ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}>{step.label}</span>
                </div>
              ))}
            </div>

            <Button variant={idx === 0 ? 'default' : 'outline'} size="sm" className="w-full" onClick={() => navigate('/lms')}>
              Explore Path <ArrowRight size={14} className="ml-1" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AICareerPath;