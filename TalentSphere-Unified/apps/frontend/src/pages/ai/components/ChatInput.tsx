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
    <div className="relative z-10 border-t border-[var(--border-default)] bg-[var(--bg-panel)] p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {showSuggestions && (
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map(s => (
              <button 
                key={s.id}
                onClick={() => onSendMessage(s.text)}
                className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              >
                {s.text}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-end gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 transition-colors focus-within:border-accent"
          >
            <div className="max-h-[200px] min-h-10 flex-1 overflow-y-auto">
              <textarea 
                rows={1}
                placeholder="Ask for career guidance..."
                className="w-full resize-none border-none bg-transparent text-sm font-medium leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-0"
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
              size="icon"
              className="shrink-0"
              disabled={!inputValue.trim() || isThinking}
              aria-label="Send message"
            >
              {isThinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </AuraButton>
          </form>
        </div>

        <div className="flex flex-col gap-1 px-1 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-accent" />
            <span>Draft guidance only</span>
          </div>
          <span>Review before applying in another workflow</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatInput);
