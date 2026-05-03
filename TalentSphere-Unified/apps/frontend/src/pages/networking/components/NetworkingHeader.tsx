import React from 'react';
import { motion } from 'framer-motion';
import { Network } from 'lucide-react';
import { AuraBadge } from '../../../components/shared/AuraCard';

export const NetworkingHeader: React.FC = () => {
  return (
    <header className="py-20 md:py-28 border-b border-slate-100 dark:border-slate-800 mb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="space-y-10 max-w-3xl"
        >
          <div className="flex items-center gap-4">
            <AuraBadge variant="success" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-none px-4 py-1">Connectivity Mesh Active</AuraBadge>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Global Node Directory</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight leading-[0.85]">
            Nebula <br />
            <span className="text-emerald-900 dark:text-emerald-400">Networking.</span>
          </h1>

          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl font-medium">
            Synchronize with the global elite. Forge high-resonance links with world-class architects, deep-tech pioneers, and strategic catalysts.
          </p>
        </motion.div>

        <div className="p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3.5rem] shadow-2xl shadow-slate-200/40 dark:shadow-none min-w-[340px]">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600">
              <Network size={28} />
            </div>
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">MESH DENSITY</p>
              <p className="text-4xl font-bold font-display text-slate-900 dark:text-white tabular-nums leading-none">4.8k<span className="text-xs text-slate-300 ml-1">Nodes</span></p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(NetworkingHeader);
