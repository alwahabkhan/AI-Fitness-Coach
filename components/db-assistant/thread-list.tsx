import React from 'react';
import { Database, Plus, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';

export interface Thread {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
}

interface ThreadListProps {
  threads: Thread[];
  selectedThreadId: string;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
}

export function ThreadList({
  threads,
  selectedThreadId,
  onThreadSelect,
  onNewThread,
  onDeleteThread
}: ThreadListProps) {
  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Database className="h-5 w-5" />
            DB Assistant
          </h2>
          <Button onClick={onNewThread} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Query your database and get insights about trainee progress
        </p>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {threads?.map((thread) => (
          <div
            key={thread.id}
            className={`flex w-full border-b border-gray-200 hover:bg-white transition-colors ${
              selectedThreadId === thread.id
                ? 'bg-white border-l-4 border-l-blue-500'
                : ''
            }`}
          >
            <button
              onClick={() => onThreadSelect(thread.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {thread.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {thread.lastMessage.substring(0, 30) + '...'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(thread.timestamp)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {thread.messageCount}
                    </span>
                  </div>
                </div>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteThread(thread.id);
              }}
              className="ml-2 p-1 h-max self-end text-gray-400 hover:text-red-500"
              title="Delete conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
