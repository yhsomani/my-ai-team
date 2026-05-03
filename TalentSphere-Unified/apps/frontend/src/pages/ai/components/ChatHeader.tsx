import React from 'react';
import { Sparkles, Settings, Trash2 } from 'lucide-react';
import { AuraButton } from '../../../components/shared/AuraButton';

export const ChatHeader: React.FC = () => {
  return (
    <header className="px-10 py-8 border-b border-slate-100 dark:border-slate-800/50 backdrop-blur-md flex items-center justify-between relative z-10 bg-white/50 dark:bg-slate-950/50">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-900 flex items-center justify-center text-white shadow-xl shadow-emerald-900/20">
          <Sparkles size={28} />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white tracking-tight">Cortex Orchestrator</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] animate-pulse italic">Active Directives</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Neural Engine v4.2L</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <AuraButton variant="ghost" className="w-12 h-12 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"><Settings size={20} /></AuraButton>
        <AuraButton variant="ghost" className="w-12 h-12 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10"><Trash2 size={20} /></AuraButton>
      </div>
    </header>
  );
};

export default React.memo(ChatHeader);
