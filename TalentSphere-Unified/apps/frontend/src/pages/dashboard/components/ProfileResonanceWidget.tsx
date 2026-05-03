import React from 'react';
import { motion } from 'framer-motion';
import { AuraButton } from '../../../components/shared/AuraButton';
import GlassCard from '../../../components/shared/GlassCard';

export const ProfileResonanceWidget: React.FC = () => {
  return (
    <GlassCard className="p-16 bg-gradient-to-br from-[#0A0A0A] to-[#050505] relative overflow-hidden group border-white/5">
      <div className="absolute top-0 right-0 w-[50%] h-full bg-emerald-500/[0.02] blur-[100px] pointer-events-none" />
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
        <div className="space-y-10 flex-1">
          <div className="flex items-center gap-3 px-5 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/60 italic">Resonance Optimization Peak</span>
          </div>
          <h3 className="text-6xl font-display font-medium leading-[0.9] uppercase italic tracking-tighter">
            Amplify your <br />
            <span className="text-emerald-500">Neural Echo.</span>
          </h3>
          <p className="text-white/30 leading-relaxed text-lg font-light italic max-w-md">
            Architects with verified <span className="text-white">Identity Credentials</span> see a 40% higher bifurcation rate.
          </p>
          <AuraButton className="bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] px-10 h-16 rounded-2xl italic hover:bg-emerald-400 transition-all">
            Sync Dossier
          </AuraButton>
        </div>
        
        <div className="relative w-72 h-72 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="144" cy="144" r="120" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
            <motion.circle 
              initial={{ strokeDasharray: "0, 800" }}
              animate={{ strokeDasharray: "540, 800" }}
              transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
              cx="144" cy="144" r="120" stroke="currentColor" strokeWidth="6" fill="transparent" strokeLinecap="round" className="text-emerald-500" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-7xl font-display font-medium italic tracking-tighter text-white">72%</span>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em] mt-2">Sync Ratio</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

export default React.memo(ProfileResonanceWidget);
