import { UserWithoutPassword } from '@/lib/auth';
import {
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatThreadWithLastMessage } from '@/lib/chat-nutrition';
import { formatTime } from '@/lib/utils';
import { useState } from 'react';

interface ChatLayoutProps {
  children: React.ReactNode;
  user: UserWithoutPassword;
  threads: ChatThreadWithLastMessage[];
  selectedThreadId?: string;
  onNewChat: () => void;
  onThreadSelect: (threadId: string) => void;
  onThreadDelete: (threadId: string) => void;
}

export function ChatLayout({
  children,
  threads,
  selectedThreadId,
  onNewChat,
  onThreadSelect,
  onThreadDelete
}: ChatLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-[calc(100vh-120px)]">
      <div className="flex flex-grow min-h-0">
        {/* Sidebar - Thread History */}
        <div
          className={`border-r border-gray-200 bg-white transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="p-4 border-b border-gray-200 min-w-80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Nutrition Coach
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={onNewChat}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Chat</span>
                </Button>
                <Button
                  onClick={toggleSidebar}
                  size="sm"
                  variant="outline"
                  className="p-1 text-black hover:bg-gray-100 border-gray-300"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Get personalized nutrition advice and meal planning
            </p>
          </div>

          <div className="flex-1 overflow-y-auto min-w-80">
            {threads.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No conversations yet
              </div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => onThreadSelect(thread.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedThreadId === thread.id
                      ? 'bg-blue-50 border-blue-200'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm truncate">
                      {thread.title ||
                        thread.lastMessage?.substring(0, 30) ||
                        'New Chat'}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {thread.updated_at
                        ? formatTime(thread.updated_at)
                        : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {thread.lastMessage}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {thread.messageCount} messages
                    </div>

                    <Button
                      className="p-1 text-black hover:bg-gray-100 border-gray-300 size-6"
                      onClick={() => onThreadDelete(thread.id)}
                      variant="outline"
                    >
                      <Trash className="size-5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white relative min-h-0">
          {/* Toggle button when sidebar is closed */}
          <div
            className={`absolute top-5 left-4 z-10 transition-all duration-300 ease-in-out ${
              isSidebarOpen
                ? 'opacity-0 pointer-events-none translate-x-2'
                : 'opacity-100 pointer-events-auto translate-x-0'
            }`}
          >
            <Button
              onClick={toggleSidebar}
              size="sm"
              variant="outline"
              className="p-2 text-black bg-gray-100 hover:bg-gray-200 border-gray-300 shadow-sm"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
