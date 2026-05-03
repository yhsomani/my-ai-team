import React, { useState } from 'react';
import { Send, Plus, Smile, Paperclip, Loader2 } from 'lucide-react';
import { AuraButton } from '../../../components/shared/AuraButton';

interface MessagingInputProps {
  onSendMessage: (text: string) => void;
  isSending: boolean;
}

export const MessagingInput: React.FC<MessagingInputProps> = ({ onSendMessage, isSending }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="p-10 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 z-20">
      <form 
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto flex items-center gap-6"
      >
        <div className="flex items-center gap-2">
          <AuraButton variant="ghost" size="icon" className="text-slate-300 hover:text-emerald-600 bg-transparent border-none"><Plus size={24} /></AuraButton>
          <AuraButton variant="ghost" size="icon" className="text-slate-300 hover:text-emerald-600 bg-transparent border-none"><Smile size={24} /></AuraButton>
        </div>
        <div className="flex-1 relative flex items-center">
          <input 
            type="text"
            placeholder="Transmit terminal command or message..."
            className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-[2rem] py-6 px-10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-300 font-medium shadow-inner"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="absolute right-6">
            <AuraButton variant="ghost" size="icon" className="text-slate-300 hover:text-emerald-600 bg-transparent border-none"><Paperclip size={20} /></AuraButton>
          </div>
        </div>
        <AuraButton 
          type="submit"
          size="icon"
          className="h-16 w-16 rounded-[2rem] bg-emerald-900 text-white shadow-2xl shadow-emerald-950/20"
          disabled={!inputValue.trim() || isSending}
        >
          {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
        </AuraButton>
      </form>
    </div>
  );
};

export default React.memo(MessagingInput);
