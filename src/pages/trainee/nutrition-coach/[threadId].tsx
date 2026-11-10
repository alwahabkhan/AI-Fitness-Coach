import React, { useState } from 'react';
import { GetServerSidePropsContext } from 'next';
import { Bot, Plus } from 'lucide-react';
import { useRouter } from 'next/router';

import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { ChatLayout } from '@/components/layout/chat-layout';
import { Button } from '@/components/ui/button';
import {
  nutritionCoachService,
  ChatThreadWithLastMessage
} from '@/lib/chat-nutrition';

import type { Message } from '@/database/derived.types';
import { Layout } from '@/components/layout/layout';
import { NutritionChat } from '@/components/nutrition-chat/chat';

interface ChatPageProps {
  user: UserWithoutPassword;
  initialThreads: ChatThreadWithLastMessage[];
  initialMessages: Message[];
  threadId: string;
}

export default function ChatPage({
  user,
  initialThreads,
  initialMessages,
  threadId
}: ChatPageProps) {
  const router = useRouter();
  const isWelcomePage = !threadId || threadId === 'welcome';
  const [threads, setThreads] =
    useState<ChatThreadWithLastMessage[]>(initialThreads);

  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/chat-nutrition/thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      const { thread } = await response.json();
      setThreads((prev) => [thread, ...prev]);
      router.push(`/trainee/nutrition-coach/${thread.id}`);
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  const handleThreadSelect = (selectedThreadId: string) => {
    router.push(`/trainee/nutrition-coach/${selectedThreadId}`);
  };

  const handleThreadDelete = async (threadId: string) => {
    try {
      const response = await fetch('/api/chat-nutrition/thread', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ threadId })
      });

      if (!response.ok) {
        throw new Error('Failed to create thread');
      }

      setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  const handleThreadNameChange = (threadId: string, title: string) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId ? { ...thread, title } : thread
      )
    );
  };

  return (
    <Layout user={user}>
      <ChatLayout
        user={user}
        threads={threads}
        selectedThreadId={isWelcomePage ? undefined : threadId}
        onThreadDelete={handleThreadDelete}
        onNewChat={handleNewChat}
        onThreadSelect={handleThreadSelect}
      >
        {isWelcomePage ? (
          <WelcomePage handleNewChat={handleNewChat} />
        ) : (
          <NutritionChat
            key={threadId}
            threadId={threadId}
            initialMessages={initialMessages}
            handleThreadNameChange={handleThreadNameChange}
          />
        )}
      </ChatLayout>
    </Layout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const user = getCurrentUserFromContext(context);
  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const { threadId } = context.params as { threadId: string };
  const isWelcomePage = !threadId || threadId === 'welcome';

  try {
    // Load threads server-side
    const initialThreads = await nutritionCoachService.loadThreads(user.id);
    if (isWelcomePage) {
      return {
        props: {
          user,
          initialThreads,
          initialMessages: [],
          threadId: 'welcome'
        }
      };
    }

    // Load messages for specific thread
    const initialMessages = await nutritionCoachService.loadMessages(
      user.id,
      threadId
    );

    return {
      props: {
        user,
        initialThreads,
        initialMessages,
        threadId
      }
    };
  } catch (error) {
    console.error('Error loading thread data:', error);
    return {
      redirect: {
        destination: '/trainee/nutrition-coach/welcome',
        permanent: false
      }
    };
  }
}

function WelcomePage({ handleNewChat }: { handleNewChat: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bot className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to Nutrition Coach
        </h3>
        <p className="text-gray-600 mb-6">
          I&apos;m here to help you with personalized nutrition advice, meal
          planning, and dietary guidance. Start a new conversation or continue
          an existing one.
        </p>
        <Button
          onClick={handleNewChat}
          className="flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Start New Chat</span>
        </Button>
      </div>
    </div>
  );
}
