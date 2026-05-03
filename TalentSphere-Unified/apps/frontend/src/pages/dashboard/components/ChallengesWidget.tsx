import React from 'react';
import { ChevronRight, Cpu } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { AuraButton } from '../../../components/shared/AuraButton';

interface ChallengesWidgetProps {
  challenges: any[];
}

export const ChallengesWidget: React.FC<ChallengesWidgetProps> = ({ challenges }) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-2xl font-display font-medium uppercase italic tracking-tighter">The Arena</h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">LIVE</span>
        </div>
      </div>
      <div className="space-y-4">
        {challenges.length > 0 ? challenges.slice(0, 3).map((challenge, i) => (
          <GlassCard key={i} className="flex items-center gap-5 p-6 border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 group-hover:text-emerald-500 transition-all duration-500">
              <Cpu size={20} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="text-sm font-medium text-white/80 truncate uppercase italic tracking-tight">{challenge.title}</h4>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10 italic">{challenge.difficulty || 'Expert'}</span>
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] italic">ALLOCATED</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-white/5 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </GlassCard>
        )) : (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-3xl bg-white/[0.01] border border-white/5 animate-pulse" />
          ))
        )}
      </div>
      <AuraButton variant="ghost" className="w-full text-white/20 hover:text-emerald-400 font-black uppercase text-[9px] tracking-[0.5em] italic py-2 transition-colors">
        Enter Stadium Archive
      </AuraButton>
    </div>
  );
};

export default React.memo(ChallengesWidget);
