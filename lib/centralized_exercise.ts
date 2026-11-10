import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/database/database.types';

type CentralizedExercise =
  Database['public']['Tables']['centralized_exercise']['Row'];
type CentralizedExerciseInsert =
  Database['public']['Tables']['centralized_exercise']['Insert'];
type CentralizedExerciseUpdate =
  Database['public']['Tables']['centralized_exercise']['Update'];

// Muscle options as given in doc
export type MainMuscleType =
  | 'Back1'
  | 'Back2'
  | 'Lats1'
  | 'Lats2'
  | 'Low back'
  | 'Chest1'
  | 'Chest2'
  | 'Quads1'
  | 'Quads2'
  | 'Tibialis'
  | 'Hams1'
  | 'Hams2'
  | 'Glutes1'
  | 'Glutes2'
  | 'Shoulders1'
  | 'Shoulders2'
  | 'Biceps'
  | 'Triceps'
  | 'Forearm'
  | 'Calves'
  | 'Plantar fascia'
  | 'Core'
  | 'Mobility'
  | 'Traps'
  | 'Cardio'
  | 'Circuits'
  | 'Neck';

// Muscle ratios object, as given in doc
export interface MuscleRatios {
  Glutes?: number;
  Chest?: number;
  Shoulders?: number;
  Triceps?: number;
  Back?: number;
  'R. shoulders'?: number;
  Quads?: number;
  Hamstrings?: number;
  Biceps?: number;
  Lats?: number;
  Abdominals?: number;
  Calves?: number;
  Cardio?: number;
  Forearms?: number;
  'Lower back'?: number;
  Traps?: number;
  'Low traps'?: number;
  Neck?: number;
  Adductors?: number;
  Abductors?: number;
}

export interface ExerciseFilters {
  name?: string;
  hasVideo?: boolean;
  searchTerm?: string;
  main_muscle?: MainMuscleType;
  short_name?: string;
}

export interface ExerciseSortOptions {
  field: keyof Pick<CentralizedExercise, 'name' | 'short_name' | 'created_at'>;
  direction: 'asc' | 'desc';
}
export interface ExerciseQueryOptions {
  filters?: ExerciseFilters;
  sort?: ExerciseSortOptions;
  limit?: number;
  offset?: number;
}

// Service response types
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> extends ServiceResponse<T> {
  count?: number;
  hasMore?: boolean;
}

class CentralizedExerciseService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabase: ReturnType<typeof createClient<Database>>) {
    this.supabase = supabase;
  }

  /**
   * Get all exercises with optional filtering and sorting
   */
  async getAll(
    options: ExerciseQueryOptions = {}
  ): Promise<PaginatedResponse<CentralizedExercise[]>> {
    try {
      let query = this.supabase
        .from('centralized_exercise')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.filters) {
        query = this.applyFilters(query, options.filters);
      }

      // Apply sorting
      if (options.sort) {
        query = query.order(options.sort.field, {
          ascending: options.sort.direction === 'asc'
        });
      } else {
        // Default sort by name
        query = query.order('name', { ascending: true });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
        if (options.offset) {
          query = query.range(
            options.offset,
            options.offset + options.limit - 1
          );
        }
      }

      const { data, error, count } = await query;

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      const hasMore = options.limit
        ? (count ?? 0) > (options.offset ?? 0) + options.limit
        : false;

      return {
        data: data || [],
        error: null,
        success: true,
        count: count ?? 0,
        hasMore
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Get exercise by ID
   */
  async getById(id: string): Promise<ServiceResponse<CentralizedExercise>> {
    try {
      const { data, error } = await this.supabase
        .from('centralized_exercise')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data, error: null, success: true };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Get exercise by name
   */
  async getByName(name: string): Promise<ServiceResponse<CentralizedExercise>> {
    try {
      const { data, error } = await this.supabase
        .from('centralized_exercise')
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data, error: null, success: true };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Search exercises by name or description
   */
  async search(
    searchTerm: string,
    limit = 20
  ): Promise<ServiceResponse<CentralizedExercise[]>> {
    try {
      const { data, error } = await this.supabase
        .from('centralized_exercise')
        .select('*')
        .or(
          `name.ilike.%${searchTerm}%,prompt_exercise_description.ilike.%${searchTerm}%`
        )
        .limit(limit)
        .order('name');

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data || [], error: null, success: true };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Create a new exercise
   */
  async create(
    exercise: CentralizedExerciseInsert
  ): Promise<ServiceResponse<CentralizedExercise>> {
    try {
      // Validate required fields
      if (!exercise.name?.trim()) {
        return {
          data: null,
          error: 'Exercise name is required',
          success: false
        };
      }

      // Check if name already exists
      const existingExercise = await this.getByName(exercise.name.trim());
      if (existingExercise.success && existingExercise.data) {
        return {
          data: null,
          error: 'Exercise with this name already exists',
          success: false
        };
      }

      const { data, error } = await this.supabase
        .from('centralized_exercise')
        .insert([
          {
            ...exercise,
            name: exercise.name.trim()
          }
        ])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data, error: null, success: true };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Update an exercise
   */
  async update(
    id: string,
    updates: CentralizedExerciseUpdate
  ): Promise<ServiceResponse<CentralizedExercise>> {
    try {
      // Validate ID
      if (!id) {
        return { data: null, error: 'Exercise ID is required', success: false };
      }

      // If updating name, check for duplicates (excluding current record)
      if (updates.name?.trim()) {
        const { data: existing } = await this.supabase
          .from('centralized_exercise')
          .select('id')
          .eq('name', updates.name.trim())
          .neq('id', id)
          .single();

        if (existing) {
          return {
            data: null,
            error: 'Exercise with this name already exists',
            success: false
          };
        }
      }

      const updateData = { ...updates };
      if (updateData.name) {
        updateData.name = updateData.name.trim();
      }

      const { data, error } = await this.supabase
        .from('centralized_exercise')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data, error: null, success: true };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Delete an exercise
   */
  async delete(id: string): Promise<ServiceResponse<boolean>> {
    try {
      if (!id) {
        return { data: null, error: 'Exercise ID is required', success: false };
      }

      const { error } = await this.supabase
        .from('centralized_exercise')
        .delete()
        .eq('id', id);

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: true, error: null, success: true };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Bulk create exercises
   */
  async bulkCreate(
    exercises: CentralizedExerciseInsert[]
  ): Promise<ServiceResponse<CentralizedExercise[]>> {
    try {
      if (!exercises.length) {
        return { data: [], error: null, success: true };
      }

      // Validate all exercises have names
      const invalidExercises = exercises.filter((ex) => !ex.name?.trim());
      if (invalidExercises.length > 0) {
        return {
          data: null,
          error: 'All exercises must have names',
          success: false
        };
      }

      // Trim names and prepare data
      const exerciseData = exercises.map((ex) => ({
        ...ex,
        name: ex.name!.trim()
      }));

      const { data, error } = await this.supabase
        .from('centralized_exercise')
        .insert(exerciseData)
        .select();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data || [], error: null, success: true };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Get exercise statistics
   */
  async getStats(): Promise<
    ServiceResponse<{
      totalExercises: number;
      exercisesWithVideos: number;
    }>
  > {
    try {
      const { data: exercises, error } = await this.supabase
        .from('centralized_exercise')
        .select('video_url');

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      const totalExercises = exercises?.length || 0;
      const exercisesWithVideos =
        exercises?.filter((ex) => ex.video_url).length || 0;

      return {
        data: {
          totalExercises,
          exercisesWithVideos
        },
        error: null,
        success: true
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Private method to apply filters to query
   */
  private applyFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
    filters: ExerciseFilters
  ) {
    if (filters.name) {
      query = query.ilike('name', `%${filters.name}%`);
    }

    if (filters.short_name) {
      query = query.ilike('short_name', `%${filters.short_name}%`);
    }

    if (filters.main_muscle !== undefined) {
      query = query.eq('main_muscle', filters.main_muscle);
    }

    if (filters.hasVideo !== undefined) {
      query = filters.hasVideo
        ? query.not('video_url', 'is', null)
        : query.is('video_url', null);
    }

    if (filters.searchTerm) {
      query = query.or(
        `name.ilike.%${filters.searchTerm}%,prompt_exercise_description.ilike.%${filters.searchTerm}%`
      );
    }

    return query;
  }
}

// Export singleton instance factory
export const createCentralizedExerciseService = (
  supabase: ReturnType<typeof createClient<Database>>
) => {
  return new CentralizedExerciseService(supabase);
};

// Export types
export type {
  CentralizedExercise,
  CentralizedExerciseInsert,
  CentralizedExerciseUpdate
};
