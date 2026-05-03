import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ChevronRight, Layers, Globe, ArrowUpRight } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { AuraButton } from '../../../components/shared/AuraButton';

interface JobsWidgetProps {
  jobs: any[];
}

export const JobsWidget: React.FC<JobsWidgetProps> = ({ jobs }) => {
  return (
    <GlassCard className="p-12 relative overflow-hidden border-white/5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 px-4">
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 flex items-center gap-4">
            <Activity size={18} className="text-emerald-500" /> Professional Priority Matrix
          </h2>
          <p className="text-5xl font-display font-medium uppercase italic tracking-tighter">Live Nodes</p>
        </div>
        <AuraButton variant="ghost" className="text-[10px] font-black tracking-[0.3em] uppercase italic text-emerald-400 hover:text-emerald-300 transition-colors h-14 p-0">
          Access All Segments <ChevronRight size={14} className="ml-2" />
        </AuraButton>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
        {jobs.length > 0 ? jobs.slice(0, 4).map((job, idx) => (
          <JobNodeCard key={job.id || idx} job={job} />
        )) : (
          <div className="col-span-2 p-24 text-center rounded-[3rem] bg-white/[0.01] border border-dashed border-white/5 space-y-6">
            <Layers className="mx-auto text-white/5" size={64} />
            <div className="text-[10px] font-black text-white/10 uppercase tracking-[0.6em] italic">Awaiting Nexus Calibration</div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

const JobNodeCard = ({ job }: any) => (
  <motion.div
    whileHover={{ y: -5, scale: 1.01 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="p-8 rounded-[2.5rem] bg-[#0A0A0A] border border-white/5 hover:border-emerald-500/30 transition-all group overflow-hidden relative"
  >
    <div className="flex items-start gap-8 relative z-10">
      <div className="w-20 h-20 rounded-2xl bg-[#050505] border border-white/5 flex items-center justify-center text-3xl font-display font-medium text-white/10 group-hover:text-emerald-500 transition-all duration-700 shadow-inner uppercase italic">
        {job.companyName?.substring(0, 1) || 'A'}
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-medium text-white/90 group-hover:text-emerald-400 transition-colors truncate leading-tight uppercase italic tracking-tight">{job.title}</h3>
          <ArrowUpRight size={18} className="text-white/10 group-hover:text-emerald-500 transition-all" />
        </div>
        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.4em] italic">{job.companyName || 'Nexus Infrastructure'}</p>
        <div className="flex items-center gap-6 pt-5 border-t border-white/5">
          <div className="flex items-center gap-2 text-[8px] font-black text-white/10 uppercase tracking-[0.3em] italic">
            <Globe size={14} className="opacity-40" /> {job.location || 'Remote'}
          </div>
          <div className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.3em] italic">
            {job.salary_range || 'SYNCING...'}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default React.memo(JobsWidget);
