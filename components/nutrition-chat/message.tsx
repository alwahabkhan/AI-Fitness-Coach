import React, { ReactNode, useState } from 'react';

import { User, Bot, Info } from 'lucide-react';

import type {
  CitationsMeta,
  Message,
  MessageDebugInfo
} from '@/database/derived.types';
import { formatTime } from '@/lib/utils';

import { MessageWithStatus } from './chat';
import { CitationWidget } from './citation-widget';
import { DebugWidget } from './debug-widget';
import { hasDebugInfo, isDebugEnabled } from '@/lib/debug';

type MessageStatus = 'sending' | 'sent' | 'error';

export function Message({ message }: { message: MessageWithStatus }) {
  const { role, content, created_at, metadata } = message;
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="flex items-start space-x-2">
          <div className="flex-1">
            <div className={`text-sm whitespace-pre-wrap`}>
              {isUser ? (
                <UserMessage
                  content={content}
                  date={
                    <div className={'text-xs mt-1 text-blue-100'}>
                      {created_at ? formatTime(created_at) : 'Just now'}
                    </div>
                  }
                  status={message.status}
                  errorMessage={message.errorMessage}
                />
              ) : (
                <AIMessage
                  content={content}
                  date={
                    <div className={'text-xs mt-1 text-gray-500'}>
                      {created_at ? formatTime(created_at) : 'Just now'}
                    </div>
                  }
                  icon={
                    <Bot
                      className={'h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0'}
                    />
                  }
                  citations={metadata?.citations}
                  debugInfo={metadata?.debug}
                  messageId={message.id}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const AIMessage = ({
  content,
  date,
  icon,
  citations,
  debugInfo,
  messageId
}: {
  content: string;
  date: ReactNode;
  icon: ReactNode;
  citations?: CitationsMeta;
  debugInfo?: MessageDebugInfo;
  messageId: string;
}) => {
  const [isCitationsExpanded, setCitationsExpanded] = useState<boolean>(false);
  const [isDebugExpanded, setDebugExpanded] = useState<boolean>(false);

  const toggleCitations = () => {
    setCitationsExpanded((prev) => !prev);
  };

  const toggleDebug = () => {
    setDebugExpanded((prev) => !prev);
  };

  const hasCitations = citations && citations.length > 0;
  return (
    <div className="flex gap-2">
      {icon}
      <div className="flex-1">
        <div className="text-gray-900">{content}</div>
        {date}

        {hasCitations && (
          <CitationWidget
            citations={citations}
            messageId={messageId}
            toggleCitation={toggleCitations}
            isExpanded={isCitationsExpanded}
          />
        )}

        {isDebugEnabled() && hasDebugInfo(debugInfo) && (
          <DebugWidget
            debugInfo={debugInfo!}
            toggleDebug={toggleDebug}
            isExpanded={isDebugExpanded}
          />
        )}
      </div>
    </div>
  );
};

const UserMessage = ({
  content,
  date,
  status = 'sent',
  errorMessage
}: {
  content: string;
  date: ReactNode;
  status?: MessageStatus;
  errorMessage?: string;
}) => {
  const getIconColor = () => {
    switch (status) {
      case 'sending':
        return 'text-white animate-pulse';
      case 'sent':
        return 'text-white';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-blue-100';
    }
  };

  return (
    <div className="flex gap-1 relative">
      <div className="text-white flex flex-col">
        <div>{content}</div>
        <div className="justify-end">{date}</div>
      </div>
      <div className="relative group">
        <User className={`h-4 w-4 mt-0.5 flex-shrink-0 ${getIconColor()}`} />
        {status === 'error' && errorMessage && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            <div className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              {errorMessage}
            </div>
            <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    </div>
  );
};
