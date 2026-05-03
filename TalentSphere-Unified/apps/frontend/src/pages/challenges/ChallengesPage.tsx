import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchChallenges, selectAllChallenges } from '../../store/slices/challengeSlice';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';
import { useToast } from '../../components/shared/Toast';

const ChallengesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const challenges = useAppSelector(selectAllChallenges);
  const { status, error } = useAppSelector((state) => state.challenges);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchChallenges());
    }
  }, [dispatch, status]);

  const filtered = challenges.filter(c => 
    filter === 'all' || (c.category && c.category.toLowerCase() === filter.toLowerCase())
  );

  const handleSolve = (title: string) => {
    addToast({
      type: 'info',
      title: 'Arena Initializing',
      message: `Loading environment for: ${title}`,
      duration: 3000
    });
  };

  if (status === 'failed') {
    return <EmptyState title="Error" description={error || "Failed to load challenges."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challenges"
        description="Solve real-world problems and level up your skills."
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg w-fit">
        {['all', 'coding', 'design', 'architecture'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`
              px-4 py-1.5 text-xs font-medium rounded-md transition-all
              ${filter === tab 
                ? 'bg-[var(--bg-primary)] text-accent shadow-sm' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No challenges found" description="Try a different category." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((challenge: any) => (
            <Card key={challenge.id} className="group p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                  <Trophy size={20} />
                </div>
                <Badge variant={challenge.difficulty === 'Hard' ? 'destructive' : challenge.difficulty === 'Medium' ? 'warning' : 'success'}>
                  {challenge.difficulty}
                </Badge>
              </div>
              
              <h3 className="font-semibold mb-2 group-hover:text-accent transition-colors">
                {challenge.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-4">
                {challenge.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Users size={12} /> {challenge.participantCount || challenge.participantsCount || 0}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {challenge.duration || challenge.timeLimit || 'N/A'}</span>
                </div>
                <Button 
                  size="sm" 
                  className="h-8 text-[10px]"
                  onClick={() => handleSolve(challenge.title)}
                >
                  Solve Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChallengesPage;
