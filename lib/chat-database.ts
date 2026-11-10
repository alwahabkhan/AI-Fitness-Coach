import type { Message, MessageThread, Json } from '@/database/derived.types';
import { createServerSupabase } from './supabase';
import type { DBDebugInfo } from '@/components/db-assistant/debug-widget';

export interface ChatThreadWithLastMessage extends MessageThread {
  lastMessage?: string;
  messageCount?: number;
}

export interface DatabaseQueryResult {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  rowCount?: number;
  executionTime?: number;
  formattedResults?: string;
}

export class DatabaseAssistantService {
  private supabase = createServerSupabase();

  async getThreadById(
    userId: string,
    threadId: string
  ): Promise<MessageThread | null> {
    const { data, error } = await this.supabase
      .from('message_thread')
      .select('*')
      .eq('id', threadId)
      .eq('type', 'db_agent')
      .eq('owner_user_id', userId)
      .single();

    if (error?.code === 'PGRST116') {
      return null;
    }

    if (error) throw error;

    return data;
  }

  async getThreadHistory(threadId: string): Promise<Message[]> {
    const { data, error } = await this.supabase
      .from('message')
      .select('*')
      .eq('message_thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data;
  }

  async loadThreads(userId: string): Promise<ChatThreadWithLastMessage[]> {
    const { data: threadsData, error: threadsError } = await this.supabase
      .from('message_thread')
      .select('*')
      .eq('owner_user_id', userId)
      .eq('type', 'db_agent')
      .order('updated_at', { ascending: false });

    if (threadsError) throw threadsError;

    const threadsWithDetails = await Promise.all(
      threadsData.map(async (thread: MessageThread) => {
        const { data: messagesData, error: messagesError } = await this.supabase
          .from('message')
          .select('content, created_at')
          .eq('message_thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messagesError) throw messagesError;

        const { count: messageCount } = await this.supabase
          .from('message')
          .select('*', { count: 'exact', head: true })
          .eq('message_thread_id', thread.id);

        return {
          ...thread,
          lastMessage: messagesData?.[0]?.content || 'No messages yet',
          messageCount: messageCount || 0
        };
      })
    );

    return threadsWithDetails;
  }

  async loadMessages(userId: string, threadId: string): Promise<Message[]> {
    const thread = await this.getThreadById(userId, threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const { data, error } = await this.supabase
      .from('message')
      .select('*')
      .eq('message_thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createNewThread(userId: string): Promise<MessageThread> {
    const { data: newThread, error } = await this.supabase
      .from('message_thread')
      .insert({
        owner_user_id: userId,
        type: 'db_agent'
      })
      .select()
      .single();

    if (error) throw error;
    return newThread;
  }

  async saveUserMessage(
    threadId: string,
    content: string,
    userId: string
  ): Promise<Message> {
    const { data: userMessage, error } = await this.supabase
      .from('message')
      .insert({
        message_thread_id: threadId,
        content: content.trim(),
        role: 'user',
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;
    return userMessage;
  }

  async saveAssistantMessage(
    threadId: string,
    content: string,
    debugInfo?: DBDebugInfo
  ): Promise<Message> {
    const metadata: Record<string, unknown> = {};
    if (debugInfo) metadata.debug = debugInfo;

    const { data: aiMessage, error } = await this.supabase
      .from('message')
      .insert({
        message_thread_id: threadId,
        content: content.trim(),
        role: 'assistant',
        user_id: null,
        metadata: Object.keys(metadata).length > 0 ? (metadata as Json) : null
      })
      .select()
      .single();

    if (error) throw error;
    return aiMessage;
  }

  async deleteThread(threadId: string): Promise<void> {
    const { error: messagesError } = await this.supabase
      .from('message')
      .delete()
      .eq('message_thread_id', threadId);

    if (messagesError) throw messagesError;

    const { error: threadError } = await this.supabase
      .from('message_thread')
      .delete()
      .eq('id', threadId);

    if (threadError) throw threadError;
  }

  async updateThread(
    threadId: string,
    updates: {
      title?: string;
      meta?: Json;
      updated_at?: string;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('message_thread')
      .update(updates)
      .eq('id', threadId);

    if (error) throw error;
  }

  async generateThreadTitle(threadId: string): Promise<string> {
    const { data: messages, error } = await this.supabase
      .from('message')
      .select('content, role')
      .eq('message_thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(5);

    const defaultMsg = 'Database Query';
    if (error) return defaultMsg;

    if (!messages || messages.length === 0) {
      return defaultMsg;
    }

    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    if (!firstUserMessage) {
      return defaultMsg;
    }

    const content = firstUserMessage.content.trim();

    if (content.length <= 50) {
      return content;
    }

    return content.substring(0, 47) + '...';
  }
}

export const databaseAssistantService = new DatabaseAssistantService();
