import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Radio, Trophy, MessageSquare } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { DashboardStats } from '../../../services/dashboardService';

interface StatsGridProps {
  stats: DashboardStats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const statItems = [
    { title: 'Energy Index', val: stats.xp.toLocaleString(), icon: <Zap size={22} />, trend: stats.xpTrend || '+0', color: '#10b981' },
    { title: 'Active Links', val: stats.applications, icon: <Radio size={22} />, trend: stats.appsTrend || 'STABLE', color: '#6366f1' },
    { title: 'Resonance', val: `LVL ${stats.level}`, icon: <Trophy size={22} />, trend: stats.level >= 10 ? 'PLATINUM' : 'GOLD', color: '#06b6d4' },
    { title: 'Broadcasts', val: stats.messages, icon: <MessageSquare size={22} />, trend: stats.msgTrend || 'NONE', color: '#ec4899' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
      {statItems.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <GlassCard className="p-10 group hover:border-white/10 transition-all duration-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-10">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-white/20 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all duration-500">
                {stat.icon}
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] italic opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: stat.color }}>{stat.trend}</div>
            </div>
            <div className="space-y-4">
              <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">{stat.title}</p>
              <h3 className="text-5xl font-display font-medium text-white italic tracking-tighter group-hover:tracking-normal transition-all">{stat.val}</h3>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
};

export default React.memo(StatsGrid);
