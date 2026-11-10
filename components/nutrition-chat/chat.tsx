import React, { useState } from 'react';
import { useRouter } from 'next/router';

import { Bot } from 'lucide-react';

import { isDebugEnabled } from '@/lib/debug';
import { ThreadDebugWidget } from './thread-debug-widget';

import type { Message as MessageT } from '@/database/derived.types';
import { useChatScroll } from '@/hooks/useChatScroll';
import { Message } from './message';
import { ChatInput } from '@/components/chat-input';

type MessageStatus = 'sending' | 'sent' | 'error';

export interface MessageWithStatus extends MessageT {
  status?: MessageStatus;
  errorMessage?: string;
}

interface NutritionChatProps {
  threadId: string;
  initialMessages: MessageT[];
  handleThreadNameChange: (threadId: string, title: string) => void;
}

export function NutritionChat({
  threadId,
  initialMessages,
  handleThreadNameChange
}: NutritionChatProps) {
  const router = useRouter();
  const [messages, setMessages] =
    useState<MessageWithStatus[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const ref = useChatScroll(messages, true);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    try {
      setIsLoading(true);
      const optimisticMessage: MessageWithStatus = {
        content: content.trim(),
        role: 'user',
        created_at: new Date().toISOString(),
        id: 'optimistic-id',
        message_thread_id: threadId,
        metadata: {},
        updated_at: null,
        user_id: null,
        status: 'sending'
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const response = await fetch('/api/chat-nutrition/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          threadId,
          content
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error === 'Thread not found') {
          router.replace('/trainee/nutrition-coach/welcome');
        }
        throw new Error('Failed to send message');
      }

      const { userMessage, aiMessage, threadTitle } = await response.json();
      if (threadTitle) {
        handleThreadNameChange(threadId, threadTitle);
      }

      setMessages((prev) => {
        return prev
          .map((msg) => {
            if (msg.id === 'optimistic-id') {
              return { ...userMessage, status: 'sent' };
            }
            return msg;
          })
          .concat({ ...aiMessage, status: 'sent' });
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === 'optimistic-id'
            ? {
                ...msg,
                status: 'error',
                errorMessage: 'Failed to send message'
              }
            : msg
        )
      );

      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Bot className="h-4 w-4 text-blue-600 z-auto" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Nutrition Coach</h3>
            <p className="text-sm text-gray-500">AI Nutrition Coach</p>
          </div>
        </div>
      </div>

      {isDebugEnabled() && <ThreadDebugWidget threadId={threadId} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={ref}>
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}

        {isLoading && <LoadingIndicator />}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isLoading}
          placeholder="Type your message..."
          autoFocus={true}
        />
      </div>
    </div>
  );
}

const LoadingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 text-gray-900 rounded-lg p-3 max-w-[70%]">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4 text-gray-500" />
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
