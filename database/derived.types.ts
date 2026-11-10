import { Database, Json as DatabaseJson } from './database.types';

export type CitationsMeta = Array<{
  source: string;
  citation: string;
}>;

export type ToolUsage = {
  toolName: string;
  parameters: Record<string, unknown>;
  timestamp: string;
  response?: string;
  error?: string;
};

// Thread-level debug information (consistent across all messages in a thread)
export type ThreadDebugInfo = {
  systemPrompt?: string;
  customPrompt?: string;
  userInfo?: string;
  userId?: string;
};

// Message-level debug information (specific to each message)
export type MessageDebugInfo = {
  processingTime?: number;
  tokensUsed?: number;
  modelUsed?: string;
  toolUsage?: ToolUsage[];
};

export type Json = DatabaseJson;

// Table Row types
export type Message = Database['public']['Tables']['message']['Row'] & {
  metadata: {
    citations?: CitationsMeta;
    debug?: MessageDebugInfo;
  } | null;
};
export type MessageThread =
  Database['public']['Tables']['message_thread']['Row'] & {
    debug?: ThreadDebugInfo;
  };
export type User = Database['public']['Tables']['user']['Row'];
export type Workout = Database['public']['Tables']['workout']['Row'];
export type Exercise = Database['public']['Tables']['exercise']['Row'];
export type WorkoutSession =
  Database['public']['Tables']['workout_session']['Row'];
export type Prompt = Database['public']['Tables']['prompt']['Row'];

// Table Insert types
export type MessageInsert = Database['public']['Tables']['message']['Insert'];
export type MessageThreadInsert =
  Database['public']['Tables']['message_thread']['Insert'];
export type UserInsert = Database['public']['Tables']['user']['Insert'];
export type WorkoutInsert = Database['public']['Tables']['workout']['Insert'];
export type ExerciseInsert = Database['public']['Tables']['exercise']['Insert'];
export type WorkoutSessionInsert =
  Database['public']['Tables']['workout_session']['Insert'];
export type PromptInsert = Database['public']['Tables']['prompt']['Insert'];

// Table Update types
export type MessageUpdate = Database['public']['Tables']['message']['Update'];
export type MessageThreadUpdate =
  Database['public']['Tables']['message_thread']['Update'];
export type UserUpdate = Database['public']['Tables']['user']['Update'];
export type WorkoutUpdate = Database['public']['Tables']['workout']['Update'];
export type ExerciseUpdate = Database['public']['Tables']['exercise']['Update'];
export type WorkoutSessionUpdate =
  Database['public']['Tables']['workout_session']['Update'];
export type PromptUpdate = Database['public']['Tables']['prompt']['Update'];

// Enum types
export type MessageRole = Database['public']['Enums']['message_role'];
export type MessageThreadType =
  Database['public']['Enums']['message_thread_type'];
export type UserRole = Database['public']['Enums']['user_role'];
export type PromptType = Database['public']['Enums']['prompt_type'];

// Function return types
export type UserWorkoutHistory =
  Database['public']['Functions']['get_user_workout_history']['Returns'][0];

// Utility types for relationships
export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];
export type Functions = Database['public']['Functions'];

// Training Session enums
export type TrainingSession =
  Database['public']['Tables']['training_session']['Row'];
export type TrainingSessionInsert =
  Database['public']['Tables']['training_session']['Insert'];
export type TrainingSessionUpdate =
  Database['public']['Tables']['training_session']['Update'];
export type TrainingSessionStatus =
  Database['public']['Enums']['training_session_status'];
