import React from 'react';
import { Target, TrendingUp, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { useNavigate } from 'react-router-dom';

const careerPaths = [
  {
    title: 'Senior Full Stack Developer',
    match: 92,
    timeline: '6-12 months',
    skills: ['System Design', 'AWS', 'GraphQL'],
    steps: [
      { label: 'Complete System Design course', done: true },
      { label: 'Build 2 full-stack projects', done: false },
      { label: 'Get AWS certification', done: false },
      { label: 'Contribute to open source', done: false },
    ],
  },
  {
    title: 'Engineering Manager',
    match: 78,
    timeline: '12-18 months',
    skills: ['Leadership', 'Project Management', 'Architecture'],
    steps: [
      { label: 'Lead a team project', done: true },
      { label: 'Take management course', done: false },
      { label: 'Mentor junior developers', done: false },
    ],
  },
  {
    title: 'ML Engineer',
    match: 65,
    timeline: '18-24 months',
    skills: ['Python', 'TensorFlow', 'MLOps'],
    steps: [
      { label: 'Complete ML fundamentals', done: false },
      { label: 'Build ML pipeline project', done: false },
      { label: 'Get ML certification', done: false },
    ],
  },
];

const AICareerPath: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career Paths"
        description="AI-recommended career trajectories based on your skills and experience."
        badge={<Badge>AI Powered</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {careerPaths.map((path, idx) => (
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
              {path.skills.map(s => (
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
              {idx === 0 ? 'Continue Path' : 'Explore Path'} <ArrowRight size={14} className="ml-1" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AICareerPath;