import React from 'react';
import { Phone, Video, MoreVertical, ShieldCheck } from 'lucide-react';
import { Conversation, Message } from '../../../types/messaging';
import { AuraButton } from '../../../components/shared/AuraButton';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  activeConv: Conversation;
  messages: Message[];
  currentUserId: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  activeConv, 
  messages, 
  currentUserId,
  scrollRef 
}) => {
  return (
    <main className="flex-1 bg-white dark:bg-slate-900 border-y border-r border-slate-100 dark:border-slate-800 rounded-r-[3.5rem] flex flex-col overflow-hidden shadow-2xl shadow-slate-200/40 dark:shadow-none">
      {/* Identity Header */}
      <header className="px-12 py-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/80 backdrop-blur-3xl z-20">
        <div className="flex items-center gap-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-0.5 shadow-inner">
            <img 
              src={activeConv.participant?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.participant?.fullName}`} 
              className="w-full h-full object-cover rounded-[14px]"
              alt=""
            />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white leading-none">{activeConv.participant?.fullName}</h2>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-600" /> RESONANCE SECURE | NODE 08-SF
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <AuraButton variant="ghost" size="icon" className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-emerald-600 border-none rounded-2xl shadow-inner"><Phone size={20} /></AuraButton>
          <AuraButton variant="ghost" size="icon" className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-emerald-600 border-none rounded-2xl shadow-inner"><Video size={20} /></AuraButton>
          <AuraButton variant="ghost" size="icon" className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-emerald-600 border-none rounded-2xl shadow-inner"><MoreVertical size={20} /></AuraButton>
        </div>
      </header>

      {/* Signal Matrix - Scrollable Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-12 py-16 space-y-12 relative z-10 bg-slate-50/10 dark:bg-slate-950/20"
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isMe={msg.senderId === currentUserId} />
        ))}
      </div>
    </main>
  );
};

export default React.memo(ChatWindow);
