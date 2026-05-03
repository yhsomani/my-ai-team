import React, { useState } from 'react';
import { Send, Loader2, Activity } from 'lucide-react';
import { AuraButton } from '../../../components/shared/AuraButton';
import { AISuggestion } from '../../../types/ai';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  suggestions: AISuggestion[];
  showSuggestions: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isThinking, 
  suggestions,
  showSuggestions
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isThinking) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="p-10 border-t border-slate-100 dark:border-slate-800/50 relative z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl">
      <div className="max-w-4xl mx-auto space-y-8">
        {showSuggestions && (
          <div className="flex flex-wrap gap-4 justify-center">
            {suggestions.map(s => (
              <button 
                key={s.id}
                onClick={() => onSendMessage(s.text)}
                className="px-6 py-2.5 rounded-full border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all text-[10px] font-bold uppercase tracking-widest text-slate-400 shadow-md shadow-slate-200/20"
              >
                {s.text}
              </button>
            ))}
          </div>
        )}

        <div className="relative group">
          <div className="absolute -inset-4 bg-emerald-500/5 rounded-[3.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-end gap-6 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] focus-within:border-emerald-500/20 transition-all shadow-2xl shadow-slate-200/50 dark:shadow-none"
          >
            <div className="flex-1 min-h-[56px] pl-6 pr-2 py-4 max-h-[200px] overflow-y-auto no-scrollbar">
              <textarea 
                rows={1}
                placeholder="Transmit query to Aurora network..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-300 text-lg resize-none font-medium leading-relaxed"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
            <AuraButton 
              type="submit"
              variant="default"
              className="h-16 w-16 rounded-[2rem] bg-emerald-900 text-white shrink-0 shadow-lg shadow-emerald-950/20 active:scale-95 transition-all"
              disabled={!inputValue.trim() || isThinking}
            >
              {isThinking ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
            </AuraButton>
          </form>
        </div>

        <div className="flex items-center justify-between px-6 text-[9px] font-bold uppercase tracking-[0.4em] text-slate-300 italic">
          <div className="flex items-center gap-3">
            <Activity size={12} className="text-emerald-500" />
            <span>Network Latency: 42ms</span>
          </div>
          <span>Aurora Intelligence Node 4.2L</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatInput);
