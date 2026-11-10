/**
 * lib/prompt-inspector.ts
 *
 * - This file is responsible for the Prompt Inspector feature.
 */
import { createServerSupabase } from './supabase';
import type { User, Workout, Exercise } from '../database/derived.types';
import { UserWithoutPassword } from './auth';

export interface UserOption {
  value: string;
  label: string;
  email: string;
}

export interface WorkoutOption {
  value: string;
  label: string;
}

export interface PromptBuildResult {
  prompt: string;
  error?: string;
}

export interface NutritionPromptBreakdown {
  globalPrompt: string;
  userPrompt: string | null;
  userContext: string | null;
  finalPrompt: string;
  error?: string;
}

export interface WorkoutPromptBreakdown {
  globalPrompt: string;
  userPrompt: string | null;
  userContext: string | null;
  workoutContext: string | null;
  exercises: Array<{
    id: string;
    name: string;
    agent_context: string | null;
    training_exercise_ids?: string[]; // Optional to maintain backward compatibility with old workout system
  }>;
  finalPrompt: string;
  error?: string;
}

export class PromptInspectorService {
  private supabase = createServerSupabase();

  getSupabaseClient() {
    return this.supabase;
  }

  async getTrainees(currentUser: UserWithoutPassword): Promise<UserOption[]> {
    const query = this.supabase
      .from('user')
      .select('id, name, email, assigned_trainer_id')
      .eq('role', 'trainee')
      .order('name');

    const { data, error } = await query;
    if (error) throw error;

    // Admin sees all trainees, trainer sees only assigned ones
    const filteredData =
      currentUser.role === 'admin'
        ? data
        : data.filter(
            (trainee) => trainee.assigned_trainer_id === currentUser.id
          );

    return filteredData.map((user) => ({
      value: user.id,
      label: user.name,
      email: user.email
    }));
  }

  async getWorkoutsForTrainee(userId: string): Promise<WorkoutOption[]> {
    const { data, error } = await this.supabase
      .from('workout')
      .select('id, name')
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;

    return data.map((workout) => ({
      value: workout.id,
      label: workout.name
    }));
  }

  async buildNutritionPrompt(userId: string): Promise<PromptBuildResult> {
    let prompt = '';

    try {
      const globalPrompt = await this.getGlobalPrompt('nutrition');
      prompt = globalPrompt?.content || '';
    } catch (error) {
      console.error('Error fetching global nutrition prompt:', error);
      return { prompt: 'Error loading global nutrition prompt' };
    }

    try {
      const userPrompt = await this.getUserSpecificPrompt('nutrition', userId);

      if (userPrompt?.content) {
        prompt = userPrompt.content;
      }
    } catch (error) {
      console.error('Error fetching user-specific nutrition prompt:', error);
    }

    try {
      const userContext = await this.getUserContext(userId);

      if (userContext) {
        prompt += '\n\n' + userContext;
      }
    } catch (error) {
      console.error('Error fetching user context:', error);
    }

    return { prompt };
  }

  async getNutritionPromptBreakdown(
    userId: string
  ): Promise<NutritionPromptBreakdown> {
    const result: NutritionPromptBreakdown = {
      globalPrompt: '',
      userPrompt: null,
      userContext: null,
      finalPrompt: ''
    };

    try {
      const globalPrompt = await this.getGlobalPrompt('nutrition');
      result.globalPrompt = globalPrompt?.content || '';
    } catch (err: unknown) {
      if (err instanceof Error) {
        result.error = err.message;
      } else {
        result.error = 'Failed to load global prompt';
      }
      return {
        globalPrompt: 'Error loading global nutrition prompt',
        userPrompt: result.userPrompt,
        userContext: result.userContext,
        finalPrompt: 'Error loading global nutrition prompt',
        error: 'Failed to load global prompt'
      };
    }

    try {
      const userPrompt = await this.getUserSpecificPrompt('nutrition', userId);
      result.userPrompt = userPrompt?.content || null;

      if (userPrompt?.content) {
        result.finalPrompt = userPrompt.content;
      } else {
        result.finalPrompt = result.globalPrompt;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        result.error = err.message;
      } else {
        result.error = 'Failed to load user prompt';
      }
      return {
        globalPrompt: result.globalPrompt,
        userPrompt: result.userPrompt,
        userContext: result.userContext,
        finalPrompt: result.finalPrompt,
        error: result.error
      };
    }

    try {
      const userContext = await this.getUserContext(userId);
      result.userContext = userContext;

      if (userContext) {
        result.finalPrompt += '\n\n' + userContext;
      }
    } catch (err: unknown) {
      console.error('Error fetching user context:', err);
    }
    return result;
  }

  async getWorkoutPromptBreakdown(
    userId: string,
    workoutId?: string
  ): Promise<WorkoutPromptBreakdown> {
    const result: WorkoutPromptBreakdown = {
      globalPrompt: '',
      userPrompt: null,
      userContext: null,
      workoutContext: null,
      exercises: [],
      finalPrompt: '',
      error: undefined
    };

    try {
      const globalPrompt = await this.getGlobalPrompt('workout');
      result.globalPrompt = globalPrompt?.content || '';
    } catch (err: unknown) {
      if (err instanceof Error) {
        result.error = err.message;
      } else {
        result.error = 'Failed to load global prompt';
      }
      return {
        globalPrompt: 'Error loading global workout prompt',
        userPrompt: null,
        userContext: null,
        workoutContext: null,
        exercises: [],
        finalPrompt: 'Error loading global workout prompt',
        error: 'Failed to load global prompt'
      };
    }

    try {
      const userPrompt = await this.getUserSpecificPrompt('workout', userId);
      result.userPrompt = userPrompt?.content || null;

      if (userPrompt?.content) {
        result.finalPrompt = userPrompt.content;
      } else {
        result.finalPrompt = result.globalPrompt;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        result.error = err.message;
      } else {
        result.error = 'Failed to load user prompt';
      }
      return {
        globalPrompt: 'Error loading prompts',
        userPrompt: null,
        userContext: null,
        workoutContext: null,
        exercises: [],
        finalPrompt: 'Error loading prompts',
        error: result.error
      };
    }

    try {
      const userContext = await this.getUserContext(userId);
      result.userContext = userContext;

      if (userContext) {
        result.finalPrompt += '\n\n' + userContext;
      }
    } catch (err: unknown) {
      console.error('Error fetching user context:', err);
    }

    if (workoutId) {
      try {
        // Check if this is a program (new system) or workout (old system)
        const programCheck = await this.supabase
          .from('program')
          .select('id')
          .eq('id', workoutId)
          .maybeSingle();

        const isProgram = !!programCheck.data;

        if (isProgram) {
          // New program system
          const programContext = await this.getWorkoutContext(workoutId);
          result.workoutContext = programContext;

          if (programContext) {
            result.finalPrompt += '\n\n' + programContext;
          }

          const exercises = await this.getExercisesForProgram(workoutId);
          result.exercises = exercises;

          if (exercises.length > 0) {
            const exerciseContexts = exercises
              .map((ex) => ex.agent_context)
              .filter(Boolean)
              .join('\n\n');

            if (exerciseContexts) {
              result.finalPrompt += '\n\n' + exerciseContexts;
            }
          }
        } else {
          // Old workout system
          const workoutContext = await this.getWorkoutContext(workoutId);
          result.workoutContext = workoutContext;

          if (workoutContext) {
            result.finalPrompt += '\n\n' + workoutContext;
          }

          const exercises = await this.getExercisesForWorkout(workoutId);
          result.exercises = exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            agent_context: ex.agent_context
          }));

          if (exercises.length > 0) {
            const exerciseContexts = exercises
              .map((ex) => ex.agent_context)
              .filter(Boolean)
              .join('\n\n');

            if (exerciseContexts) {
              result.finalPrompt += '\n\n' + exerciseContexts;
            }
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching workout/program data:', err);
      }
    }

    return result;
  }

  async buildWorkoutPrompt(
    userId: string,
    workoutId: string
  ): Promise<PromptBuildResult> {
    let prompt = '';

    try {
      const globalPrompt = await this.getGlobalPrompt('workout');
      prompt = globalPrompt?.content || '';
    } catch (error) {
      console.error('Error fetching global workout prompt:', error);
      return { prompt: 'Error loading global workout prompt' };
    }

    try {
      const userPrompt = await this.getUserSpecificPrompt('workout', userId);
      if (userPrompt?.content) {
        prompt = userPrompt.content;
      }
    } catch (error) {
      console.error('Error fetching user-specific workout prompt:', error);
    }

    try {
      const userContext = await this.getUserContext(userId);

      if (userContext) {
        prompt += '\n\n' + userContext;
      }
    } catch (error) {
      console.error('Error fetching user context:', error);
    }

    try {
      const workoutContext = await this.getWorkoutContext(workoutId);
      if (workoutContext) {
        prompt += '\n\n' + workoutContext;
      }
    } catch (error) {
      console.error('Error fetching workout context:', error);
    }

    try {
      const exercises = await this.getExercisesForWorkout(workoutId);

      if (exercises.length > 0) {
        const exerciseContexts = exercises
          .map((ex: { agent_context: string | null }) => ex.agent_context)
          .filter(Boolean)
          .join('\n\n');

        if (exerciseContexts) {
          prompt += '\n\n' + exerciseContexts;
        }
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }

    return { prompt };
  }

  async getUserDetails(userId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('user')
      .select('*')
      .eq('id', userId)
      .single();

    if (error?.code === 'PGRST116') {
      return null;
    }

    if (error) throw error;

    return data;
  }

  async getWorkoutDetails(workoutId: string): Promise<Workout | null> {
    const { data, error } = await this.supabase
      .from('workout')
      .select('*')
      .eq('id', workoutId)
      .single();

    if (error?.code === 'PGRST116') {
      return null;
    }

    if (error) throw error;

    return data;
  }

  async getExercisesForWorkout(workoutId: string): Promise<Exercise[]> {
    const { data, error } = await this.supabase
      .from('exercise')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order');

    if (error) throw error;

    return data;
  }

  async getExercisesForProgram(programId: string): Promise<
    Array<{
      id: string; // This will be the centralized exercise_id
      name: string;
      agent_context: string | null;
      training_exercise_ids: string[]; // All training_exercise IDs for this exercise
    }>
  > {
    // First, get all training_day IDs for this program
    const { data: trainingDays, error: daysError } = await this.supabase
      .from('training_day')
      .select('id')
      .eq('program_id', programId);

    if (daysError) {
      console.error('Error fetching training days:', daysError);
      throw daysError;
    }

    if (!trainingDays || trainingDays.length === 0) {
      return [];
    }

    const trainingDayIds = trainingDays.map((td) => td.id);

    // Now fetch training_exercises for these training days
    const { data, error } = await this.supabase
      .from('training_exercise')
      .select(
        `
        id,
        exercise_id,
        agent_context,
        exercise:exercise_id(
          id,
          name
        )
      `
      )
      .in('training_day_id', trainingDayIds)
      .order('exercise_order');

    if (error) {
      console.error('Error fetching exercises for program:', error);
      throw error;
    }

    if (!data) return [];

    // Group by centralized exercise_id to deduplicate
    const exerciseMap = new Map<
      string,
      {
        id: string;
        name: string;
        agent_context: string | null;
        training_exercise_ids: string[];
      }
    >();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((te: any) => {
      const exerciseId = te.exercise_id;
      const exerciseName = te.exercise?.name || 'Unknown Exercise';

      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          id: exerciseId, // Use centralized exercise_id as the key
          name: exerciseName,
          agent_context: te.agent_context,
          training_exercise_ids: [te.id]
        });
      } else {
        const existing = exerciseMap.get(exerciseId)!;
        existing.training_exercise_ids.push(te.id);
        // If this instance has an agent_context and the existing doesn't, use it
        if (te.agent_context && !existing.agent_context) {
          existing.agent_context = te.agent_context;
        }
      }
    });

    return Array.from(exerciseMap.values());
  }

  async getGlobalPrompts(): Promise<{
    nutrition: string;
    workout: string;
  }> {
    const [nutritionResult, workoutResult] = await Promise.all([
      this.getGlobalPrompt('nutrition'),
      this.getGlobalPrompt('workout')
    ]);

    return {
      nutrition: nutritionResult?.content || '',
      workout: workoutResult?.content || ''
    };
  }

  async getUserPrompts(userId: string): Promise<{
    nutrition: string;
    workout: string;
  }> {
    const [nutritionResult, workoutResult] = await Promise.all([
      this.getUserSpecificPrompt('nutrition', userId),
      this.getUserSpecificPrompt('workout', userId)
    ]);

    return {
      nutrition: nutritionResult?.content || '',
      workout: workoutResult?.content || ''
    };
  }

  async validateTrainee(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user')
      .select('role')
      .eq('id', userId)
      .eq('role', 'trainee')
      .single();

    if (error?.code === 'PGRST116') {
      return false;
    }

    if (error) throw error;

    return !!data;
  }

  async validateWorkoutOwnership(
    workoutId: string,
    userId: string
  ): Promise<boolean> {
    // First check if it's a program
    const { data: programData } = await this.supabase
      .from('program')
      .select('trainee_id')
      .eq('id', workoutId)
      .eq('trainee_id', userId)
      .maybeSingle();

    if (programData) {
      return true;
    }

    // If not a program, check if it's a legacy workout
    const { data: workoutData } = await this.supabase
      .from('workout')
      .select('user_id')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .maybeSingle();

    if (workoutData) {
      return true;
    }

    return false;
  }

  async getUserSpecificPrompt(
    type: 'workout' | 'nutrition',
    userId: string
  ): Promise<{
    content: string;
    id: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('prompt')
      .select('id, content')
      .eq(
        'type',
        type === 'workout' ? 'workout_coach_user' : 'nutrition_coach_user'
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error?.code === 'PGRST116') {
      return null;
    }

    if (error) throw error;

    return { id: data.id, content: data?.content || '' };
  }

  async getGlobalPrompt(type: 'workout' | 'nutrition'): Promise<{
    content: string;
  } | null> {
    const { data, error } = await this.supabase
      .from('prompt')
      .select('content')
      .eq(
        'type',
        type === 'workout' ? 'workout_coach_global' : 'nutrition_coach_global'
      )
      .is('user_id', null)
      .eq('is_active', true)
      .single();

    if (error?.code === 'PGRST116') {
      return null;
    }

    if (error) throw error;

    return { content: data?.content || '' };
  }

  async getUserContext(userId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('user')
      .select('agent_context')
      .eq('id', userId)
      .single();

    if (error?.code === 'PGRST116') {
      return '';
    }

    if (error) throw error;

    return data?.agent_context || '';
  }

  async getWorkoutContext(workoutId: string): Promise<string> {
    // First check if it's a program
    const { data: programData } = await this.supabase
      .from('program')
      .select('agent_context')
      .eq('id', workoutId)
      .maybeSingle();

    if (programData) {
      return programData.agent_context || '';
    }

    // If not a program, check legacy workout table
    const { data: workoutData } = await this.supabase
      .from('workout')
      .select('agent_context')
      .eq('id', workoutId)
      .maybeSingle();

    if (workoutData) {
      return workoutData.agent_context || '';
    }

    return '';
  }

  async updateUserSpecificPrompt(
    type: 'workout' | 'nutrition',
    promptId: string,
    content: string
  ) {
    const { error } = await this.supabase
      .from('prompt')
      .update({ content })
      .eq(
        'type',
        type === 'workout' ? 'workout_coach_user' : 'nutrition_coach_user'
      )
      .eq('id', promptId)
      .eq('is_active', true)
      .single();

    if (error) return error.message;
  }

  async updateUserContext(userId: string, content: string) {
    const { error } = await this.supabase
      .from('user')
      .update({ agent_context: content })
      .eq('id', userId)
      .single();

    if (error) return error.message;
  }

  async updateWorkoutContext(workoutId: string, content: string) {
    // First check if it's a program
    const { data: programData } = await this.supabase
      .from('program')
      .select('id')
      .eq('id', workoutId)
      .maybeSingle();

    if (programData) {
      // Update program
      const { error } = await this.supabase
        .from('program')
        .update({ agent_context: content })
        .eq('id', workoutId);

      if (error) return error.message;
      return;
    }

    // If not a program, update legacy workout
    const { error } = await this.supabase
      .from('workout')
      .update({ agent_context: content })
      .eq('id', workoutId);

    if (error) return error.message;
  }

  async createUserSpecificPrompt(
    type: 'workout' | 'nutrition',
    userId: string,
    content: string
  ) {
    const { error } = await this.supabase.from('prompt').insert({
      type: type === 'workout' ? 'workout_coach_user' : 'nutrition_coach_user',
      user_id: userId,
      content,
      is_active: true
    });

    if (error) return error.message;
  }

  async updateGlobalPrompt(type: 'workout' | 'nutrition', content: string) {
    const { error } = await this.supabase
      .from('prompt')
      .update({ content })
      .eq(
        'type',
        type === 'workout' ? 'workout_coach_global' : 'nutrition_coach_global'
      )
      .is('user_id', null)
      .eq('is_active', true)
      .single();

    if (error) throw error;
  }
}

export const promptInspectorService = new PromptInspectorService();
