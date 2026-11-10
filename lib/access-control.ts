import { createServerSupabase } from './supabase';
import { UserWithoutPassword } from './auth';

/**
 * Verifies if user can access trainee data
 */
export async function canAccessTrainee(
  user: UserWithoutPassword,
  traineeId: string
): Promise<boolean> {
  // Trainers and admins can access any trainee
  if (user.role === 'trainer' || user.role === 'admin') {
    return true;
  }

  // Trainees can only access their own data
  return user.id === traineeId;
}

/**
 * Verifies if user can access program data
 */
export async function canAccessProgram(
  user: UserWithoutPassword,
  programId: string
): Promise<boolean> {
  // Trainers and admins can access any program
  if (user.role === 'trainer' || user.role === 'admin') {
    return true;
  }

  // Trainees can only access their own programs
  const supabase = createServerSupabase();
  const { data: program } = await supabase
    .from('program')
    .select('trainee_id')
    .eq('id', programId)
    .single();

  return program?.trainee_id === user.id;
}

/**
 * Verifies if user can access session data
 */
export async function canAccessSession(
  user: UserWithoutPassword,
  sessionId: string
): Promise<boolean> {
  // Trainers and admins can access any session
  if (user.role === 'trainer' || user.role === 'admin') {
    return true;
  }

  // Trainees can only access their own sessions
  const supabase = createServerSupabase();
  const { data: trainingSession } = await supabase
    .from('training_session')
    .select('user_id')
    .eq('id', sessionId)
    .single();

  return trainingSession?.user_id === user.id;
}

