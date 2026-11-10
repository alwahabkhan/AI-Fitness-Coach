export interface Exercise {
  id: string;
  name: string;
  videoUrl: string;
  reps: number;
  setNumber: number;
  weight: number;
  restSeconds: number;
  completedSet: CompletedSet | null;
  agentContext: string;
  trainingExerciseId?: string;
  startTime?: Date | null;
  sets: number;
}

export interface CompletedSet {
  weight: number;
  reps: number;
  completedAt: Date;
}

export interface ExerciseGroup {
  group: number;
  id: string;
  exercises: Exercise[];
  sets: number;
}

export interface WorkoutState {
  currentGroup: number;
  currentExerciseIndex: number;
  status: WorkoutStatus;
  restTimeRemaining: number;
  isResting: boolean;
}

export enum WorkoutStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

export type MessageType = 'system' | 'user' | 'assistant' | 'error';

export interface Message {
  type: MessageType;
  content: string;
  timestamp: number;
  id: number;
}
