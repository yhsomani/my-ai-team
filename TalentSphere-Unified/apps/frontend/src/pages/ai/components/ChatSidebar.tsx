import React from 'react';
import { Plus, MessageSquare, Shield } from 'lucide-react';
import { AuraBadge as Badge } from '../../../components/shared/AuraCard';
import { AuraButton as Button } from '../../../components/shared/AuraButton';

export const ChatSidebar: React.FC = () => {
  return (
    <aside className="w-80 border-r border-slate-100 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl hidden xl:flex flex-col p-8 space-y-10 relative z-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Archive Segments</h2>
          <Badge className="bg-emerald-50 text-emerald-600 border-none px-2 text-[8px]">Live Sync</Badge>
        </div>
        <Button variant="outline" className="w-full h-14 rounded-2xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 justify-start px-6 group">
          <MessageSquare size={18} className="mr-3 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 group-hover:text-emerald-700 transition-colors">Initialize Protocol</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
        {[
          'Career Recalibration v12',
          'Market Resonance Analysis',
          'Neural Skill Assessment',
          'Infrastructure Strategy'
        ].map((chat, i) => (
          <button 
            key={i}
            className={`w-full text-left p-5 rounded-[1.5rem] transition-all group flex items-center justify-between ${
              i === 0 
              ? 'bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-emerald-500/10' 
              : 'hover:bg-white/60 dark:hover:bg-slate-800/40 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${i === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 dark:bg-slate-950 text-slate-300'}`}>
                <MessageSquare size={14} />
              </div>
              <span className={`text-xs font-bold truncate ${i === 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{chat}</span>
            </div>
            {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
          </button>
        ))}
      </div>

      <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400">
            <Shield size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Core Security</span>
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Archive Verified</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default React.memo(ChatSidebar);
