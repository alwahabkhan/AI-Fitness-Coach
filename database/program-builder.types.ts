import { Tables, TablesInsert, TablesUpdate } from './database.types';

// Base types from generated schema
export type Program = Tables<'program'>;
export type TrainingDay = Tables<'training_day'>;
export type TrainingExercise = Tables<'training_exercise'>;
export type CentralizedExercise = Tables<'centralized_exercise'>;
export type User = Tables<'user'>;

// Insert types
export type ProgramInsert = TablesInsert<'program'>;
export type TrainingDayInsert = TablesInsert<'training_day'>;
export type TrainingExerciseInsert = TablesInsert<'training_exercise'>;

// Update types
export type ProgramUpdate = TablesUpdate<'program'>;
export type TrainingDayUpdate = TablesUpdate<'training_day'>;
export type TrainingExerciseUpdate = TablesUpdate<'training_exercise'>;

// Extended types with relations
export interface ProgramWithDetails extends Program {
  trainee: {
    id: string;
    name: string;
    email: string;
    allowed_sessions: number | null;
  };
  trainer: {
    id: string;
    name: string;
    email: string;
  };
  training_days?: TrainingDayWithExercises[];
}

export interface ProgramWithRelations extends Program {
  trainee: {
    id: string;
    name: string;
    email: string;
  };
  trainer: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TrainingDayWithExercises extends TrainingDay {
  training_exercises: TrainingExerciseWithDetails[];
}

export interface TrainingExerciseWithDetails extends TrainingExercise {
  exercise: CentralizedExercise;
}

// API request/response types
export interface CreateProgramRequest {
  trainee_id: string;
  name: string;
  description?: string;
  max_sessions?: number | null;
  session_duration_days?: number | null;
}

export interface CreateTrainingDayRequest {
  program_id: string;
  name: string;
  day_order: number;
  description?: string;
}

export interface CreateTrainingExerciseRequest {
  training_day_id: string;
  exercise_id: string;
  exercise_order?: number;
  group_number?: number;
  sets?: number;
  reps?: number[];
  weights?: number[];
  rest_seconds?: number;
  reps_progression?: number;
  weight_progression?: number;
  r_plus_option?: number;
  notes?: string;
}

export interface UpdateProgramRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_completed?: boolean;
  max_sessions?: number | null;
  session_duration_days?: number | null;
}

export interface ProgramSessionCapSummary {
  program_id: string;
  max_sessions: number | null;
  session_window_days: number | null;
  sessions_in_window: number;
  percent_used: number | null;
  status: 'unlimited' | 'ok' | 'warning' | 'limit_reached';
  window_start: string | null;
  window_end: string | null;
}

export interface UpdateTrainingDayRequest {
  name?: string;
  day_order?: number;
  description?: string;
}

export interface UpdateTrainingExerciseRequest {
  exercise_order?: number;
  group_number?: number;
  sets?: number;
  reps?: number[];
  weights?: number[];
  rest_seconds?: number;
  reps_progression?: number;
  weight_progression?: number;
  r_plus_option?: number;
  notes?: string;
}

// Helper functions for working with arrays
export function createDefaultRepsArray(
  sets: number,
  defaultReps: number = 10
): number[] {
  return Array(sets).fill(defaultReps);
}

export function createDefaultWeightsArray(
  sets: number,
  defaultWeight: number = 0
): number[] {
  return Array(sets).fill(defaultWeight);
}

// Utility to ensure arrays match sets count
export function normalizeExerciseArrays(
  sets: number,
  reps?: number[],
  weights?: number[]
): { reps: number[]; weights: number[] } {
  const normalizedReps =
    reps?.length === sets
      ? reps
      : createDefaultRepsArray(sets, reps?.[0] || 10);

  const normalizedWeights =
    weights?.length === sets
      ? weights
      : createDefaultWeightsArray(sets, weights?.[0] || 0);

  return { reps: normalizedReps, weights: normalizedWeights };
}
