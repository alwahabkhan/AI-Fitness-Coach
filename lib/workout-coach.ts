import { createServerSupabase } from './supabase';
import type { Json } from '../database/database.types';

class WorkoutCoachService {
  private supabase = createServerSupabase();

  async getGlobalPrompt(): Promise<string | undefined> {
    const { data, error } = await this.supabase
      .from('prompt')
      .select('content')
      .eq('type', 'workout_coach_global')
      .is('user_id', null)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    // PGRST116: The result contains 0 rows
    return data?.content || '';
  }

  async getUserPersonalizedPrompt(userId: string): Promise<string | undefined> {
    const { data, error } = await this.supabase
      .from('prompt')
      .select('content')
      .eq('type', 'workout_coach_user')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.content || '';
  }

  async getUserContextPrompt(userId: string): Promise<string | undefined> {
    const { data, error } = await this.supabase
      .from('user')
      .select('agent_context')
      .eq('id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.agent_context || '';
  }

  async createNewThread(userId: string) {
    const { data: newThread, error } = await this.supabase
      .from('message_thread')
      .insert({
        owner_user_id: userId,
        type: 'workout_coach'
      })
      .select()
      .single();
    if (error) throw error;
    return newThread;
  }

  async saveMessage(
    threadId: string,
    content: string,
    role: 'user' | 'assistant' | 'system',
    userId: string | null = null,
    metadata: Json = {}
  ) {
    const { data: message, error } = await this.supabase
      .from('message')
      .insert({
        message_thread_id: threadId,
        content: content.trim(),
        role,
        user_id: userId,
        metadata
      })
      .select()
      .single();
    if (error) throw error;
    return message;
  }
}

export { WorkoutCoachService };
