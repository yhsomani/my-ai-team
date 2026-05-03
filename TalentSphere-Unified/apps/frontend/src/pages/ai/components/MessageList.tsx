import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage } from '../../../types/ai';

interface MessageListProps {
  messages: ChatMessage[];
  isThinking: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isThinking, scrollRef }) => {
  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto no-scrollbar px-10 py-16 space-y-12 relative z-10"
    >
      {messages.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto"
        >
          <div className="w-28 h-28 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-10 relative group shadow-2xl shadow-slate-200/50 dark:shadow-none transition-transform hover:scale-105 duration-700">
            <div className="absolute inset-0 bg-emerald-500/10 blur-3xl opacity-0 hover:opacity-100 transition-opacity" />
            <Sparkles size={56} className="text-emerald-900 dark:text-emerald-400 relative z-10" />
          </div>
          <h3 className="text-4xl font-display font-bold text-slate-900 dark:text-white mb-6">Initialize <span className="text-emerald-600 tracking-tight">Professional Echo.</span></h3>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Greetings, Architect. I am your Aurora Co-pilot. Query any node in the Nexus network, 
            optimize your career projection, or calibrate your technical stack.
          </p>
        </motion.div>
      )}

      {messages.map((msg) => (
        <motion.div 
          key={msg.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full group`}
        >
          <div className={`flex gap-8 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all mt-1 ${
              msg.role === 'user' 
              ? 'bg-slate-900 border-slate-800 text-white' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
            </div>
            <div className="flex flex-col gap-3">
              <div className={`p-8 rounded-[2.5rem] shadow-xl transition-all ${
                msg.role === 'user' 
                ? 'bg-white dark:bg-slate-900 border-none shadow-slate-200/50 dark:shadow-black/20 text-slate-900 dark:text-white font-medium italic' 
                : 'bg-emerald-900 text-white shadow-emerald-950/20'
              }`}>
                <div className="prose prose-sm max-w-none text-base leading-relaxed font-body">
                  {msg.content}
                </div>
              </div>
              <div className={`flex items-center gap-3 px-6 text-[9px] font-bold uppercase tracking-widest ${msg.role === 'user' ? 'justify-end text-slate-400' : 'text-emerald-600 dark:text-emerald-400/50'}`}>
                <span className="opacity-40">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                <span>Status: Integrated</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {isThinking && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-start w-full"
        >
          <div className="flex gap-8 items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 transition-all">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600/40 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600/50 ml-3 italic">Synthesizing directive...</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default React.memo(MessageList);
