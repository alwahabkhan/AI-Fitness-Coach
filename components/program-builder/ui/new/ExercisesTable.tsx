'use client';

import { useEffect, useState } from 'react';
import ExercisesTableDesktop from './ExercisesTableDesktop';
import ExercisesTableMobile from './ExercisesTableMobile';
import { Exercise } from '../../PLACEHOLDER';
import { TrainingExerciseWithDetails } from '@/database/program-builder.types';

export interface ExercisesTableProps {
  exercises: Exercise[];
  trainingExercises?: TrainingExerciseWithDetails[];
  onExerciseUpdate: (
    exerciseId: string,
    updates: Partial<TrainingExerciseWithDetails>
  ) => void;
  onExerciseReorder: (exerciseId: string, direction: 'up' | 'down') => void;
  onExerciseDelete: (exerciseId: string) => void;
  sessionId?: string | null;
  sessionStatus?: 'in_progress' | 'completed' | 'cancelled';
  onSessionStatusChange?: (status: 'in_progress' | 'completed') => void;
  isCompleted?: boolean;
  userRole?: 'trainer' | 'trainee' | 'admin';
  currentSessionNumber?: number;
  availableSessions?: number[];
  isTraineeEditMode?: boolean;
  onRequestEditMode?: () => void;
}

export default function ExercisesTable(props: ExercisesTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile ? <ExercisesTableMobile {...props} /> : <ExercisesTableDesktop {...props} />;
}