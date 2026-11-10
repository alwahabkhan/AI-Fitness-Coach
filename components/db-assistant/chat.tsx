import React, { useEffect, useState } from 'react';

import { useChatScroll } from '@/hooks/useChatScroll';
import { Message } from './message';
import { ChatInput } from '@/components/chat-input';
import type { DBDebugInfo } from './debug-widget';

type MessageStatus = 'sending' | 'sent' | 'error';

export interface MessageWithStatus {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: MessageStatus;
  errorMessage?: string;
  debugInfo?: DBDebugInfo;
}

interface DBChatProps {
  threadId: string;
  onThreadUpdate?: (threadId: string, updates: { updated_at?: string }) => void;
}

export function DBChat({ threadId, onThreadUpdate }: DBChatProps) {
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadMessages = async () => {
      if (threadId) {
        try {
          const response = await fetch(`/api/chat-database/thread/${threadId}`);
          if (response.ok) {
            const data = await response.json();
            const formattedMessages: MessageWithStatus[] = data.map(
              (msg: Record<string, unknown>) => ({
                id: msg.id as string,
                content: msg.content as string,
                role: msg.role as 'user' | 'assistant',
                timestamp: new Date(msg.created_at as string),
                debugInfo: (msg.metadata as { debug?: DBDebugInfo })?.debug
              })
            );
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error('Error loading messages:', error);
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    };

    loadMessages();
  }, [threadId]);

  const messagesEndRef = useChatScroll(messages, { behavior: 'smooth' });

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: MessageWithStatus = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-database/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          threadId: threadId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();

      const assistantMessage: MessageWithStatus = {
        id: (Date.now() + 1).toString(),
        content: result.message,
        role: 'assistant',
        timestamp: new Date(),
        status: 'sent',
        debugInfo: result.debugInfo
      };

      setMessages((prev) =>
        prev
          .map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, status: 'sent' as MessageStatus }
              : msg
          )
          .concat(assistantMessage)
      );

      // Update thread if needed
      if (result.threadId && onThreadUpdate) {
        onThreadUpdate(result.threadId, {
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? {
                ...msg,
                status: 'error' as MessageStatus,
                errorMessage: 'Failed to send message'
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4 max-w-[80%]">
              <div className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm">Analyzing database...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder="Ask a question about your database..."
        />
      </div>
    </div>
  );
}
