import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}


export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = 'Type your message...',
  disabled = false,
  className = '',
  autoFocus = false
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    const content = message.trim();
    if (!content || isLoading || disabled) return;

    onSendMessage(content);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isSendDisabled = !message.trim() || isLoading || disabled;

  return (
    <div className={`p-4 border-t border-gray-200 bg-white ${className}`}>
      <div className="flex space-x-2 text-black">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyUp={handleKeyPress}
          placeholder={placeholder}
          className="flex-1"
          disabled={isLoading || disabled}
          autoFocus={autoFocus}
        />
        <Button
          onClick={handleSendMessage}
          className="px-4"
          disabled={isSendDisabled}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
