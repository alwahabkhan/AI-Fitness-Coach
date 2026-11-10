import { createServerSupabase } from './supabase';

export interface DurationResult {
  total_duration_minutes: number;
  total_duration_hours: number;
  formatted: string;
}

interface SessionResults {
  session_summary?: {
    total_duration_minutes?: number;
  };
}

/**
 * Calculates duration from session results or start/end times
 */
function calculateSessionDuration(
  results: SessionResults | null | undefined,
  startTime: string | null,
  endTime: string | null
): number {
  // Prefer duration from results.session_summary.total_duration_minutes
  if (results && typeof results === 'object') {
    const sessionSummary = results.session_summary;
    if (sessionSummary?.total_duration_minutes) {
      return Number(sessionSummary.total_duration_minutes);
    }
  }

  // Fallback to calculating from start_time and end_time
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    return Math.round(durationSeconds / 60);
  }

  return 0;
}

/**
 * Formats duration in minutes to a human-readable string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  return `${mins} minute${mins !== 1 ? 's' : ''}`;
}

/**
 * Gets total duration for a trainee (all their completed sessions)
 */
export async function getTraineeTotalDuration(
  userId: string
): Promise<DurationResult> {
  const supabase = createServerSupabase();

  const { data: sessions, error } = await supabase
    .from('training_session')
    .select('results, start_time, end_time')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .or('end_time.not.is.null,results.not.is.null');

  if (error) {
    throw new Error(`Failed to fetch trainee sessions: ${error.message}`);
  }

  const totalMinutes = (sessions || []).reduce((sum, session) => {
    const results = session.results as SessionResults | null | undefined;
    return sum + calculateSessionDuration(results, session.start_time, session.end_time);
  }, 0);

  return {
    total_duration_minutes: totalMinutes,
    total_duration_hours: Math.round((totalMinutes / 60) * 10) / 10,
    formatted: formatDuration(totalMinutes)
  };
}

/**
 * Gets total duration for a program (all sessions in that program)
 */
export async function getProgramTotalDuration(
  programId: string
): Promise<DurationResult> {
  const supabase = createServerSupabase();

  const { data: sessions, error } = await supabase
    .from('training_session')
    .select('results, start_time, end_time')
    .eq('program_id', programId)
    .eq('status', 'completed')
    .or('end_time.not.is.null,results.not.is.null');

  if (error) {
    throw new Error(`Failed to fetch program sessions: ${error.message}`);
  }

  const totalMinutes = (sessions || []).reduce((sum, session) => {
    const results = session.results as SessionResults | null | undefined;
    return sum + calculateSessionDuration(results, session.start_time, session.end_time);
  }, 0);

  return {
    total_duration_minutes: totalMinutes,
    total_duration_hours: Math.round((totalMinutes / 60) * 10) / 10,
    formatted: formatDuration(totalMinutes)
  };
}

/**
 * Gets duration for a specific session
 */
export async function getSessionDuration(
  sessionId: string
): Promise<DurationResult> {
  const supabase = createServerSupabase();

  const { data: sessionData, error } = await supabase
    .from('training_session')
    .select('results, start_time, end_time')
    .eq('id', sessionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  if (!sessionData) {
    throw new Error('Session not found');
  }

  const results = sessionData.results as SessionResults | null | undefined;
  const totalMinutes = calculateSessionDuration(
    results,
    sessionData.start_time,
    sessionData.end_time
  );

  return {
    total_duration_minutes: totalMinutes,
    total_duration_hours: Math.round((totalMinutes / 60) * 10) / 10,
    formatted: formatDuration(totalMinutes)
  };
}




