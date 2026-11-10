import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '../database/database.types';
import { getSupabaseConfig } from './env';

// Client-side Supabase client
export const createClientSupabase = () => {
  const config = getSupabaseConfig();
  return createBrowserClient<Database>(config.url, config.anonKey);
};

// Server-side Supabase client for API routes (Pages Router compatible)
export const createServerSupabase = () => {
  const config = getSupabaseConfig();
  return createClient<Database>(config.url, config.serviceRoleKey);
};

// Admin client with service role key for user management
export const createAdminSupabase = () => {
  const config = getSupabaseConfig();
  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
