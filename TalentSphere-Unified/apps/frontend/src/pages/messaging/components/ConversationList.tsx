import React from 'react';
import { Loader2, Plus, Hash } from 'lucide-react';
import { Conversation } from '../../../types/messaging';
import { AuraButton } from '../../../components/shared/AuraButton';

interface ConversationListProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelect: (conv: Conversation) => void;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({ 
  conversations, 
  activeConvId, 
  onSelect, 
  isLoading 
}) => {
  return (
    <aside className="w-80 lg:w-[400px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-l-[3.5rem] flex flex-col overflow-hidden shadow-2xl shadow-slate-200/40 dark:shadow-none">
      <div className="p-10 space-y-10 border-b border-slate-50 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">Neural Link.</h1>
            <p className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-500/50 uppercase tracking-[0.3em]">Quantum Encrypted Signals</p>
          </div>
          <AuraButton variant="ghost" size="icon" className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-emerald-600 rounded-2xl shadow-inner border-none">
            <Plus size={20} />
          </AuraButton>
        </div>
        
        <div className="relative group">
          <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500/30 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Scan frequency..."
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl py-4.5 pl-14 pr-6 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400/50 italic shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-6">
            <Loader2 size={32} className="text-emerald-600 animate-spin opacity-20" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300">Synchronizing...</span>
          </div>
        ) : (
          conversations.map((conv) => (
            <button 
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full group p-6 rounded-[2rem] flex items-center gap-6 transition-all duration-500 relative ${
                activeConvId === conv.id 
                ? 'bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner' 
                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border border-transparent'
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-0.5 relative z-10 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                  <img 
                    src={conv.participant?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.participant?.fullName}`} 
                    className="w-full h-full object-cover rounded-[14px]"
                    alt=""
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 z-20" />
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                  <h3 className={`text-sm font-bold tracking-tight truncate ${
                    activeConvId === conv.id ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-200'
                  }`}>
                    {conv.participant?.fullName || 'Node Explorer'}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-300 tabular-nums">12:42</span>
                </div>
                <p className="text-[11px] font-medium text-slate-400 truncate leading-none">
                  {conv.lastMessage?.content || 'Establishing neural link...'}
                </p>
              </div>
              
              {activeConvId === conv.id && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-600 rounded-full shadow-[0_0_10px_rgba(5,150,105,0.5)]" />
              )}
            </button>
          ))
        )}
      </div>
    </aside>
  );
};

export default React.memo(ConversationList);
