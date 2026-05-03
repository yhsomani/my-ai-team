import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import GlassCard from '../../../components/shared/GlassCard';
import { Message } from '../../../types/messaging';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, x: isMe ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      className={`flex \${isMe ? 'justify-end' : 'justify-start'} w-full`}
    >
      <div className={`flex flex-col \${isMe ? 'items-end' : 'items-start'} max-w-[70%] space-y-4`}>
        <GlassCard className={`px-10 py-8 rounded-[2.5rem] text-[15px] font-medium leading-[1.8] transition-all duration-500 hover:border-emerald-500/30 \${
          isMe 
          ? 'bg-emerald-950/80 border-emerald-500/20 text-emerald-50 shadow-2xl shadow-emerald-950/40 rounded-tr-[0.5rem]' 
          : 'bg-white/80 dark:bg-slate-900/80 border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-200 shadow-xl rounded-tl-[0.5rem]'
        }`}>
          {message.content}
        </GlassCard>
        <div className="flex items-center gap-4 px-4">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400/60">
            Node Sync {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
          {isMe && <Activity size={12} className="text-emerald-500 animate-pulse" />}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(MessageBubble);
