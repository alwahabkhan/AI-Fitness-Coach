import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/database/database.types';

export type ProgramSupabaseClient = SupabaseClient<Database>;

const DEFAULT_SESSION_WINDOW_DAYS = 30;
const WARNING_THRESHOLD = 0.8;

export type SessionCapStatus = 'unlimited' | 'ok' | 'warning' | 'limit_reached';

export interface ProgramSessionCapUsage {
  programId: string;
  maxSessions: number | null;
  sessionWindowDays: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  sessionsInWindow: number;
  percentUsed: number | null;
  status: SessionCapStatus;
}

export class SessionCapExceededError extends Error {
  public readonly usage: ProgramSessionCapUsage;

  constructor(message: string, usage: ProgramSessionCapUsage) {
    super(message);
    this.name = 'SessionCapExceededError';
    this.usage = usage;
  }
}

export async function getProgramSessionCapUsage(
  client: ProgramSupabaseClient,
  programId: string
): Promise<ProgramSessionCapUsage> {
  const { data: program, error } = await client
    .from('program')
    .select('id, max_sessions, session_duration_days')
    .eq('id', programId)
    .single();

  if (error || !program) {
    throw new Error('Program not found');
  }

  if (!program.max_sessions || program.max_sessions <= 0) {
    return {
      programId: program.id,
      maxSessions: null,
      sessionWindowDays: null,
      windowStart: null,
      windowEnd: null,
      sessionsInWindow: 0,
      percentUsed: null,
      status: 'unlimited'
    };
  }

  const windowDays =
    program.session_duration_days && program.session_duration_days > 0
      ? program.session_duration_days
      : DEFAULT_SESSION_WINDOW_DAYS;

  const now = new Date();
  const windowEnd = now.toISOString();
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - windowDays);
  const windowStart = windowStartDate.toISOString();

  const { count, error: countError } = await client
    .from('training_session')
    .select('id', { count: 'exact', head: true })
    .eq('program_id', programId)
    .neq('status', 'cancelled')
    .gte('start_time', windowStart);

  if (countError) {
    throw countError;
  }

  const usageRatio =
    typeof count === 'number' && program.max_sessions
      ? count / program.max_sessions
      : null;

  let status: SessionCapStatus = 'ok';
  if (usageRatio === null) {
    status = 'unlimited';
  } else if (usageRatio >= 1) {
    status = 'limit_reached';
  } else if (usageRatio >= WARNING_THRESHOLD) {
    status = 'warning';
  }

  return {
    programId: program.id,
    maxSessions: program.max_sessions,
    sessionWindowDays: windowDays,
    windowStart,
    windowEnd,
    sessionsInWindow: count ?? 0,
    percentUsed:
      usageRatio !== null ? Number(usageRatio.toFixed(2)) : usageRatio,
    status
  };
}

export async function ensureProgramWithinSessionCap(
  client: ProgramSupabaseClient,
  programId: string
): Promise<ProgramSessionCapUsage> {
  const usage = await getProgramSessionCapUsage(client, programId);
  if (usage.status === 'limit_reached') {
    throw new SessionCapExceededError(
      `Program session limit reached (${usage.sessionsInWindow}/${usage.maxSessions})`,
      usage
    );
  }
  return usage;
}

