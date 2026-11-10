import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import { MessageWithStatus } from './chat';
import { DBDebugWidget } from './debug-widget';
import { isDBDebugEnabled, hasDBDebugInfo } from '@/lib/debug';
import type { DBDebugInfo } from './debug-widget';

export function Message({ message }: { message: MessageWithStatus }) {
  const { role, content, timestamp, status, errorMessage, debugInfo } = message;
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="flex items-start space-x-2">
          <div className="flex-1 overflow-auto max-w-[350px] sm:max-w-[500px] md:max-w-[400px] lg:max-w-[700px]">
            {isUser ? (
              <UserMessage
                content={content}
                timestamp={timestamp}
                status={status}
                errorMessage={errorMessage}
              />
            ) : (
              <AIMessage
                content={content}
                timestamp={timestamp}
                debugInfo={debugInfo}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const UserMessage = ({
  content,
  timestamp,
  status = 'sent',
  errorMessage
}: {
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  errorMessage?: string;
}) => {
  return (
    <div>
      <div className="whitespace-pre-wrap text-sm leading-6">{content}</div>
      <div className="text-xs mt-2 text-blue-100">
        {formatTime(timestamp.toISOString())}
        {status === 'sending' && ' • Sending...'}
        {status === 'error' && ' • Failed to send'}
      </div>
      {errorMessage && (
        <div className="text-xs mt-1 text-red-200">{errorMessage}</div>
      )}
    </div>
  );
};

const AIMessage = ({
  content,
  timestamp,
  debugInfo
}: {
  content: string;
  timestamp: Date;
  debugInfo?: DBDebugInfo;
}) => {
  const [isDebugExpanded, setDebugExpanded] = useState<boolean>(false);

  const toggleDebug = () => {
    setDebugExpanded((prev) => !prev);
  };

  return (
    <>
      <div className="flex items-start gap-2">
        <Bot className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 overflow-auto">
          <Markdown content={content} className="text-sm leading-6" />

          {isDBDebugEnabled() && hasDBDebugInfo(debugInfo) && (
            <DBDebugWidget
              debugInfo={debugInfo!}
              toggleDebug={toggleDebug}
              isExpanded={isDebugExpanded}
            />
          )}
        </div>
      </div>
      <div className="text-xs mt-2 text-gray-500">
        {formatTime(timestamp.toISOString())}
      </div>
    </>
  );
};
