import { GetServerSideProps } from 'next';
import { useState } from 'react';

import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';

import { Layout } from '@/components/layout/layout';
import { DBChat } from '@/components/db-assistant/chat';
import { EmptyState } from '@/components/db-assistant/empty-state';
import { Thread, ThreadList } from '@/components/db-assistant/thread-list';

interface DBAssistantProps {
  user: UserWithoutPassword;
  initialThreads: Thread[];
}

export default function DBAssistant({
  user,
  initialThreads
}: DBAssistantProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [threads, setThreads] = useState<Thread[]>(initialThreads);

  const createNewThread = async () => {
    try {
      const response = await fetch('/api/chat-database/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const newThreadData = await response.json();
        const newThread: Thread = {
          id: newThreadData.id,
          title: 'New Database Query',
          lastMessage: 'No messages yet',
          timestamp: newThreadData.created_at,
          messageCount: 0
        };

        setThreads((prev) => [newThread, ...prev]);
        setSelectedThreadId(newThread.id);
      }
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  const deleteThread = async (threadId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this conversation? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/chat-database/thread/${threadId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setThreads((prev) => prev.filter((thread) => thread.id !== threadId));

        if (selectedThreadId === threadId) {
          setSelectedThreadId('');
        }
      } else {
        console.error('Failed to delete thread');
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  const handleThreadUpdate = (
    threadId: string,
    updates: { updated_at?: string }
  ) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? { ...thread, timestamp: updates.updated_at || thread.timestamp }
          : thread
      )
    );
  };

  return (
    <Layout user={user}>
      <div className="flex h-[calc(100vh-80px)] grow">
        <ThreadList
          threads={threads}
          selectedThreadId={selectedThreadId}
          onThreadSelect={setSelectedThreadId}
          onNewThread={createNewThread}
          onDeleteThread={deleteThread}
        />

        <div className="flex flex-col h-full w-full">
          {selectedThreadId ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-semibold text-gray-900">
                  {threads.find((t) => t.id === selectedThreadId)?.title ||
                    'Database Query'}
                </h3>
                <p className="text-sm text-gray-600">
                  Ask questions about your database and get SQL-powered insights
                </p>
              </div>

              <div className="flex-1 min-h-0">
                <DBChat
                  threadId={selectedThreadId}
                  onThreadUpdate={handleThreadUpdate}
                />
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  if (user.role !== 'admin') {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  try {
    const { databaseAssistantService } = await import('@/lib/chat-database');
    const threadsData = await databaseAssistantService.loadThreads(user.id);

    const initialThreads: Thread[] = threadsData.map((thread) => ({
      id: thread.id,
      title: thread.title || 'Database Query',
      lastMessage: thread.lastMessage || 'No messages yet',
      timestamp: thread.updated_at || new Date().toISOString(),
      messageCount: thread.messageCount || 0
    }));

    return {
      props: {
        user,
        initialThreads
      }
    };
  } catch (error) {
    console.error('Error loading initial threads:', error);

    return {
      props: {
        user,
        initialThreads: []
      }
    };
  }
};