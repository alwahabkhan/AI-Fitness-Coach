import { createServerSupabase } from './supabase';


interface Exercise {
  id: string;
  workout_id: string;
  name: string;
  execution_meta: unknown; // JSONB data from database
  group: number;
  order: number;
  video_url: string | null;
  agent_context: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface WorkoutWithMetadata {
  id: string;
  name: string;
  description: string;
  duration: string;
  exerciseCount: number;
  lastCompleted: string;
}

interface WorkoutWithExercises {
  id: string;
  name: string;
  user_id: string;
  created_at: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  exercises: Exercise[];
}

export class WorkoutService {
  private supabase = createServerSupabase();

  async getWorkoutsForUser(userId: string): Promise<WorkoutWithMetadata[]> {
    // Get workouts for the specific user
    const { data: workouts, error: workoutsError } = await this.supabase
      .from('workout')
      .select('id, name, user_id, created_at, agent_context')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
      throw new Error('Failed to fetch workouts');
    }

    // For each workout, get its exercises and last completed session
    const workoutsWithMetadata = await Promise.all(
      workouts.map(async (workout) => {
        // Get exercises
        const { data: exercises, error: exercisesError } = await this.supabase
          .from('exercise')
          .select('*')
          .eq('workout_id', workout.id)
          .order('group', { ascending: true })
          .order('order', { ascending: true });

        if (exercisesError) {
          console.error('Error fetching exercises:', exercisesError);
          throw new Error('Failed to fetch exercises');
        }

        // Get last completed workout session
        const { data: lastSession } = await this.supabase
          .from('workout_session')
          .select('end_time')
          .eq('workout_id', workout.id)
          .not('end_time', 'is', null)
          .order('end_time', { ascending: false })
          .limit(1)
          .single();

        // Calculate estimated duration based on exercises
        const estimatedDuration = this.calculateWorkoutDuration(
          exercises || []
        );

        // Format last completed
        const lastCompleted = lastSession?.end_time
          ? this.formatLastCompleted(new Date(lastSession.end_time))
          : 'Never';

        return {
          id: workout.id,
          name: workout.name,
          description:
            workout.agent_context ||
            `${exercises?.length || 0} exercises targeting multiple muscle groups`,
          duration: estimatedDuration,
          exerciseCount: exercises?.length || 0,
          allNames: exercises?.map(ex => ex.name).join(", ") || "",
          lastCompleted
        };
      })
    );

    return workoutsWithMetadata;
  }

  async getAllWorkoutsWithUserInfo(): Promise<WorkoutWithExercises[]> {
    // Get all workouts with user information for trainers
    const { data: workouts, error: workoutsError } = await this.supabase
      .from('workout')
      .select(
        `
        id,
        name,
        user_id,
        created_at,
        user:user!workout_user_id_fkey (
          id,
          name,
          email
        )
      `
      )
      .order('created_at', { ascending: false });

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
      throw new Error('Failed to fetch workouts');
    }

    // For each workout, get its exercises
    const workoutsWithExercises = await Promise.all(
      workouts.map(async (workout) => {
        const { data: exercises, error: exercisesError } = await this.supabase
          .from('exercise')
          .select('*')
          .eq('workout_id', workout.id)
          .order('order', { ascending: true });

        if (exercisesError) {
          console.error('Error fetching exercises:', exercisesError);
          throw new Error('Failed to fetch exercises');
        }

        return {
          ...workout,
          exercises
        };
      })
    );

    return workoutsWithExercises;
  }

  private calculateWorkoutDuration(exercises: Exercise[]): string {
    if (!exercises.length) return "0 min";

    const avgTimePerSetMinutes = 2; // fixed duration per set

    let allSets = 0;
    let allRests = 0;

    for (const exercise of exercises) {
      let sets = 0;
      let rest = 0;

      if (exercise.execution_meta && typeof exercise.execution_meta === "object") {
        const meta = exercise.execution_meta as Record<string, unknown>;
        if (typeof meta.sets === "number") sets = meta.sets;
        if (typeof meta.rest_seconds === "number") rest = meta.rest_seconds;
      }

      allSets += sets;
      allRests += sets * rest;
    }

    // convert rest time to minutes
    const allRestsInMinutes = Math.ceil(allRests / 60);

    // total time = sets * 2min + rests
    const estimatedMinutes = allSets * avgTimePerSetMinutes + allRestsInMinutes;

    if (estimatedMinutes < 60) {
      return `${estimatedMinutes} min`;
    } else {
      const hours = Math.floor(estimatedMinutes / 60);
      const minutes = estimatedMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  private formatLastCompleted(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return '1 month ago';
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}

export const workoutService = new WorkoutService();
