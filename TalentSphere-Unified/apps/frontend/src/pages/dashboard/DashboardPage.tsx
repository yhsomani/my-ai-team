import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { dashboardService, DashboardStats } from '../../services/dashboardService';
import { recruiterService, RecruiterStats } from '../../services/recruiterService';
import { 
  Briefcase, MessageSquare, TrendingUp, Award, 
  ArrowUpRight, Users, CheckCircle, Clock, Plus
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/AuraButton';
import { Skeleton } from '../../components/shared/Skeleton';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // User Data
  const [stats, setStats] = useState<DashboardStats>({ xp: 0, level: 1, applications: 0, messages: 0 });
  const [jobs, setJobs] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  
  // Recruiter Data
  const [recruiterStats, setRecruiterStats] = useState<RecruiterStats>({ activeJobs: 0, totalApplications: 0, newApplications: 0, hiredCount: 0 });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);

  const isRecruiter = user?.roles?.includes('ROLE_RECRUITER');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        if (isRecruiter) {
          const [s, a] = await Promise.all([
            recruiterService.getStats(),
            recruiterService.getRecentApplications()
          ]);
          setRecruiterStats(s);
          setRecentApplications(a);
        } else {
          const data = await dashboardService.fetchDashboardData(user.id);
          setStats(data.stats);
          setJobs(data.jobs);
          setChallenges(data.challenges);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, isRecruiter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const userName = user?.email?.split('@')[0] || 'User';

  if (isRecruiter) {
    const statCards = [
      { label: 'Active Jobs', value: recruiterStats.activeJobs, icon: <Briefcase size={16} />, color: 'text-accent' },
      { label: 'Total Applicants', value: recruiterStats.totalApplications, icon: <Users size={16} />, color: 'text-blue-500' },
      { label: 'New Today', value: recruiterStats.newApplications, icon: <Clock size={16} />, color: 'text-amber-500' },
      { label: 'Hired', value: recruiterStats.hiredCount, icon: <CheckCircle size={16} />, color: 'text-success' },
    ];

    return (
      <div className="space-y-6">
        <PageHeader 
          title={`Recruiter Console`}
          description={`Welcome back, ${userName}. Managing your talent pipeline.`}
          actions={
            <Button size="sm" onClick={() => navigate('/jobs/post')}>
              Post a Job <Plus size={14} className="ml-1" />
            </Button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">{stat.label}</span>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Recent Applications</h3>
                <p className="text-xs text-[var(--text-muted)]">Latest candidates in your pipeline</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/candidates')}>View all</Button>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              {recentApplications.length > 0 ? recentApplications.slice(0, 5).map((app: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{app.user?.fullName || 'Anonymous'}</p>
                      <p className="text-xs text-[var(--text-muted)]">Applied for {app.job?.title}</p>
                    </div>
                  </div>
                  <Badge variant={app.status === 'ACCEPTED' ? 'success' : 'warning'}>{app.status}</Badge>
                </div>
              )) : (
                <div className="p-8 text-center text-sm text-[var(--text-muted)]">No recent applications</div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/jobs/post')}>
                Create new job listing
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/candidates')}>
                Review pending applications
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/messaging')}>
                Message candidates
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Standard User Dashboard
  const userStatCards = [
    { label: 'Applications', value: stats.applications, icon: <Briefcase size={16} />, color: 'text-accent' },
    { label: 'Messages', value: stats.messages, icon: <MessageSquare size={16} />, color: 'text-blue-500' },
    { label: 'XP Earned', value: stats.xp.toLocaleString(), icon: <TrendingUp size={16} />, color: 'text-success' },
    { label: 'Level', value: stats.level, icon: <Award size={16} />, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome back, ${userName}`}
        description="Here's an overview of your activity and opportunities."
        actions={
          <Button size="sm" onClick={() => navigate('/jobs')}>
            Browse Jobs <ArrowUpRight size={14} className="ml-1" />
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {userStatCards.map((stat, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--text-secondary)]">{stat.label}</span>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="p-5 border-b border-[var(--border-default)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Recent Opportunities</h3>
              <p className="text-xs text-[var(--text-muted)]">Latest matching positions</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>View all</Button>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {jobs.length > 0 ? jobs.slice(0, 5).map((job: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{job.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{job.companyName || 'Company'} · {job.location}</p>
                  </div>
                </div>
                <Badge variant="success">{job.matchScore || 85}% match</Badge>
              </div>
            )) : (
              <div className="p-8 text-center text-sm text-[var(--text-muted)]">No recent jobs found</div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/profile')}>
                Complete your profile
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/lms')}>
                Continue learning
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => navigate('/challenges')}>
                Join a challenge
              </Button>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-semibold">Active Challenges</h3>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
              {challenges.length > 0 ? challenges.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{c.participantCount || 0} participants</p>
                  </div>
                  <Badge variant="outline">{c.difficulty || 'Medium'}</Badge>
                </div>
              )) : (
                <div className="p-6 text-center text-sm text-[var(--text-muted)]">No active challenges</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
