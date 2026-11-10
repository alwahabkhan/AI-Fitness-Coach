'use client';

import type React from 'react';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Mic, MicOff } from 'lucide-react';
import type { Message } from '@/types/workout';
import { useOutspeed } from '@/hooks/use-outspeed';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  className?: string;
}

export function ChatInterfaceOutspeed({
  messages,
  onSendMessage,
  className
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isMuted, toggleMute } = useOutspeed();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card
      className={`flex flex-col bg-white border border-gray-200 shadow-sm ${className || ''} max-h-[90vh] md:h-screen md:max-h-[80vh] h-screen`}
      style={{ height: undefined }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="h-4 w-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v4m0 8v4m-4-4h8" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">AI Fitness Coach</h3>
            <p className="text-sm text-gray-500">
              Ask me anything about your workout!
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type !== 'user' && (
                  <svg
                    className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0v4m0 8v4m-4-4h8" />
                  </svg>
                )}
                <div className="flex-1">
                  <div
                    className={`text-sm ${message.type === 'user' ? 'text-white' : 'text-gray-900'}`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}
                  >
                    <Timestamp timestamp={message.timestamp} />
                  </div>
                </div>
                {message.type === 'user' && (
                  <svg
                    className="h-4 w-4 text-blue-100 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4m0-4h.01" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex space-x-2 text-black">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyUp={handleKeyPress}
            placeholder="Type your message or use voice..."
            className="flex-1"
          />
          <Button
            onClick={toggleMute}
            variant="outline"
            size="icon"
            className={`transition-colors ${isMuted ? 'bg-red-100 text-red-600 border-red-300' : 'hover:bg-gray-100'}`}
            type="button"
          >
            {isMuted ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            size="icon"
            className="px-4"
            type="button"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
function Timestamp({ timestamp }: { timestamp: number }) {
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    const formatTime = (now: number) => {
      const date = new Date(now);

      const diffInMinutes = Math.floor((Date.now() - now) / (1000 * 60));

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours}h ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    };

    setFormattedTime(formatTime(timestamp));
  }, [timestamp]);

  return (
    <span className="text-xs opacity-60 font-medium">{formattedTime}</span>
  );
}
