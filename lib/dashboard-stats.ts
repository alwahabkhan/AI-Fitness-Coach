import { createServerSupabase } from './supabase';

export interface TrainerDashboardStats {
  activeTrainees: number;
  workoutsCreated: number;
  sessionsThisWeek: number;
}

export interface TraineeDashboardStats {
  workoutsCompleted: number;
  sessionsThisWeek: number;
  currentStreak: number;
  totalWorkouts: number;
  totalDurationMinutes: number;
}

export interface TrainerRecentActivity {
  id: string;
  type: 'workout_completed' | 'nutrition_session' | 'workout_created';
  message: string;
  timestamp: string;
  user_name?: string;
}

export interface TraineeRecentActivity {
  id: string;
  type: 'workout_completed' | 'nutrition_session';
  message: string;
  timestamp: string;
}

export async function getTrainerDashboardStats(): Promise<TrainerDashboardStats> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase.rpc('get_trainer_dashboard_stats');

  if (error) {
    console.error('Error fetching trainer dashboard stats:', error);
    throw new Error('Failed to fetch trainer dashboard stats');
  }

  if (!data || data.length === 0) {
    return {
      activeTrainees: 0,
      workoutsCreated: 0,
      sessionsThisWeek: 0
    };
  }

  const stats = data[0];
  return {
    activeTrainees: Number(stats.active_trainees) || 0,
    workoutsCreated: Number(stats.workouts_created) || 0,
    sessionsThisWeek: Number(stats.sessions_this_week) || 0
  };
}

export async function getTrainerRecentActivity(): Promise<
  TrainerRecentActivity[]
> {
  const supabase = createServerSupabase();

  const activities: TrainerRecentActivity[] = [];

  const { data: recentSessions, error: sessionsError } = await supabase
    .from('workout_session')
    .select(
      `
      id,
      start_time,
      end_time,
      created_at,
      workout:workout!workout_session_workout_id_fkey (
        name,
        user:user!workout_user_id_fkey (
          name
        )
      )
    `
    )
    .not('end_time', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!sessionsError && recentSessions) {
    recentSessions.forEach((session) => {
      activities.push({
        id: session.id,
        type: 'workout_completed',
        message: `${session.workout?.user?.name || 'Unknown'} completed "${session.workout?.name || 'Unknown'}" workout`,
        timestamp: session.created_at!,
        user_name: session.workout?.user?.name
      });
    });
  }

  const { data: recentNutritionThreads, error: nutritionError } = await supabase
    .from('message_thread')
    .select(
      `
      id,
      created_at,
      owner_user:user!message_thread_owner_user_id_fkey (
        name
      )
    `
    )
    .eq('type', 'nutrition_coach')
    .order('created_at', { ascending: false })
    .limit(3);

  if (!nutritionError && recentNutritionThreads) {
    recentNutritionThreads.forEach((thread) => {
      activities.push({
        id: thread.id,
        type: 'nutrition_session',
        message: `${thread.owner_user?.name || 'Unknown'} started nutrition coaching session`,
        timestamp: thread.created_at!,
        user_name: thread.owner_user?.name
      });
    });
  }

  const { data: recentWorkouts, error: workoutsError } = await supabase
    .from('workout')
    .select(
      `
      id,
      name,
      created_at,
      user:user!workout_user_id_fkey (
        name
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(3);

  if (!workoutsError && recentWorkouts) {
    recentWorkouts.forEach((workout) => {
      activities.push({
        id: workout.id,
        type: 'workout_created',
        message: `Created "${workout.name}" workout for ${workout.user?.name || 'Unknown'}`,
        timestamp: workout.created_at!,
        user_name: workout.user?.name
      });
    });
  }

  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5);
}

export async function getTraineeDashboardStats(
  userId: string
): Promise<TraineeDashboardStats> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.rpc('get_trainee_dashboard_stats', {
    user_id: userId
  });

  if (error) {
    console.error('Error fetching trainee dashboard stats:', error);
    throw new Error('Failed to fetch trainee dashboard stats');
  }

  if (!data || data.length === 0) {
    return {
      workoutsCompleted: 0,
      sessionsThisWeek: 0,
      currentStreak: 0,
      totalWorkouts: 0,
      totalDurationMinutes: 0
    };
  }

  const stats = data[0];
  return {
    workoutsCompleted: Number(stats.workouts_completed) || 0,
    sessionsThisWeek: Number(stats.sessions_this_week) || 0,
    currentStreak: Number(stats.current_streak) || 0,
    totalWorkouts: Number(stats.total_workouts) || 0,
    totalDurationMinutes: Number(stats.total_duration_minutes) || 0
  };
}

export async function getTraineeRecentActivity(
  userId: string
): Promise<TraineeRecentActivity[]> {
  const supabase = createServerSupabase();

  const activities: TraineeRecentActivity[] = [];

  // Get recent completed workout sessions for this user
  const { data: recentSessions, error: sessionsError } = await supabase
    .from('workout_session')
    .select(
      `
      id,
      end_time,
      workout:workout!workout_session_workout_id_fkey (
        name
      )
    `
    )
    .eq('workout.user_id', userId)
    .not('end_time', 'is', null)
    .order('end_time', { ascending: false })
    .limit(5);

  if (!sessionsError && recentSessions) {
    recentSessions.forEach((session) => {
      activities.push({
        id: session.id,
        type: 'workout_completed',
        message: `Completed "${session.workout?.name || 'Unknown'}" workout`,
        timestamp: session.end_time!
      });
    });
  }

  const { data: recentNutritionThreads, error: nutritionError } = await supabase
    .from('message_thread')
    .select(
      `
      id,
      created_at
    `
    )
    .eq('type', 'nutrition_coach')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (!nutritionError && recentNutritionThreads) {
    recentNutritionThreads.forEach((thread) => {
      activities.push({
        id: thread.id,
        type: 'nutrition_session',
        message: 'Started nutrition coaching session',
        timestamp: thread.created_at!
      });
    });
  }

  return activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5);
}
