import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { motion } from 'framer-motion';
import { Sparkles, ArrowUpRight, TrendingUp, Calendar } from 'lucide-react';
import { AuraButton } from '../shared/AuraButton';
import { AuraBadge } from '../shared/AuraCard';

export const TheNexusHeader: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const firstName = user?.email?.split('@')[0] || 'Professional';
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden group bg-emerald-900 rounded-[2.5rem] p-10 lg:p-14 text-white shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-12">
      {/* Decorative Background Accents */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-600/30 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-teal-400/20 blur-[80px] rounded-full -translate-x-1/4 translate-y-1/4 opacity-40 pointer-events-none" />
      
      <div className="flex flex-col gap-6 relative z-10 max-w-2xl text-center lg:text-left items-center lg:items-start">
        <div className="flex items-center gap-3">
          <AuraBadge variant="outline" className="bg-white/10 text-emerald-100 border-white/20 px-4 py-2">
            <Sparkles size={14} className="mr-2" />
            Aurora Platform v1.0
          </AuraBadge>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-200/60 uppercase tracking-[0.2em]">{currentDate}</span>
        </div>

        <div className="flex flex-col gap-2">
           <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] animate-fade-in shadow-inner shadow-white/10">
             Welcome back, <br />
             <span className="text-emerald-300 italic">{firstName}</span>
           </h1>
           <p className="text-emerald-100/60 text-lg lg:text-xl font-medium leading-relaxed mt-4 max-w-lg">
             Your career orchestration is performing optimally. We've matched 12 new opportunities to your profile today.
           </p>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-4">
           <AuraButton variant="default" className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-xl shadow-white/10 group px-10">
              EXPLORE MATRIX
              <ArrowUpRight size={18} className="ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
           </AuraButton>
           <AuraButton variant="ghost" className="text-white hover:bg-white/10 border border-white/10 px-8">
              System Diagnostics
           </AuraButton>
        </div>
      </div>

      {/* Quick Insights Molecule inside Header */}
      <div className="relative z-10 w-full lg:w-96 flex flex-col gap-4">
        <div className="Aurora-card bg-white/5 border-white/10 backdrop-blur-3xl p-6 ring-1 ring-white/10">
           <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-300/80">Skill Velocity</span>
              <TrendingUp size={20} className="text-emerald-400" />
           </div>
           <div className="space-y-4">
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end">
                   <span className="text-xs font-bold text-white/60 uppercase tracking-widest">TypeScript Mastering</span>
                   <span className="text-xs font-black text-emerald-300">88%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                   <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} className="h-full bg-emerald-500 rounded-full" />
                </div>
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-end">
                   <span className="text-xs font-bold text-white/60 uppercase tracking-widest">System Architecture</span>
                   <span className="text-xs font-black text-emerald-300">64%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                   <motion.div initial={{ width: 0 }} animate={{ width: '64%' }} className="h-full bg-emerald-300 rounded-full" />
                </div>
             </div>
           </div>
           <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex -space-x-3">
                 {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-xl border-2 border-emerald-900 bg-emerald-700 flex items-center justify-center text-[10px] font-bold text-white/80">NODE-{i}</div>
                 ))}
              </div>
              <span className="text-[10px] font-black italic uppercase text-emerald-200/40">Active Peers (12)</span>
           </div>
        </div>
      </div>
    </div>
  );
};
