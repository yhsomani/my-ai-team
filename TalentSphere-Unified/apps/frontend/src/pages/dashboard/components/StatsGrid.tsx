import React from 'react';
import { Zap, Radio, Trophy, MessageSquare } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { Badge } from '../../../components/shared/Badge';
import { DashboardStats } from '../../../services/dashboardService';

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const statItems = [
    { title: 'XP Earned', val: stats.xp.toLocaleString(), icon: <Zap size={18} />, trend: stats.xpTrend || '+0', tone: 'success' as const },
    { title: 'Applications', val: stats.applications, icon: <Radio size={18} />, trend: stats.appsTrend || 'Stable', tone: 'default' as const },
    { title: 'Level', val: stats.level, icon: <Trophy size={18} />, trend: stats.level >= 10 ? 'Advanced' : 'Building', tone: 'warning' as const },
    { title: 'Messages', val: stats.messages, icon: <MessageSquare size={18} />, trend: stats.msgTrend || 'None', tone: 'outline' as const }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat) => (
        <GlassCard key={stat.title} className="p-5">
          <div className="flex h-full min-h-28 flex-col justify-between gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                {stat.icon}
              </div>
              <Badge variant={stat.tone}>{stat.trend}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">{stat.title}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{stat.val}</p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
};

export default React.memo(StatsGrid);
