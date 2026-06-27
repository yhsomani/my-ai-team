import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '../../../components/shared/AuraButton';

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
    <div className="border-t border-[var(--border-default)] p-4">
      <form 
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
      >
        <label htmlFor="messaging-input-text" className="sr-only">Message text</label>
        <div className="relative flex min-w-0 flex-1 items-center">
          <input 
            id="messaging-input-text"
            type="text"
            placeholder="Type a message..."
            className="h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="icon"
          aria-label="Send message"
          disabled={!inputValue.trim() || isSending}
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </form>
    </div>
  );
};

export default React.memo(MessagingInput);
