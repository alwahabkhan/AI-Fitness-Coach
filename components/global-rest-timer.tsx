'use client';

import {
  useEffect,
  useRef,
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback
} from 'react';
import { WorkoutMachineContext } from '@/state-machine/workout';

// Context for controlling the global timer
interface GlobalTimerContextType {
  isPaused: boolean;
  pauseTimer: () => void;
  resumeTimer: () => void;
}

const GlobalTimerContext = createContext<GlobalTimerContextType | null>(null);

export const useGlobalTimer = () => {
  const context = useContext(GlobalTimerContext);
  if (!context) {
    throw new Error('useGlobalTimer must be used within GlobalTimerProvider');
  }
  return context;
};

interface GlobalRestTimerProps {
  children: React.ReactNode;
  notifyRest?: (nextExerciseName?: string) => void;
  notifyRestStart?: (nextExerciseInfo?: string) => void;
  onRestComplete?: () => void;
  getNextExercise?: () => { name: string; reps?: number; weight?: number } | null;
}

// Global Rest Timer Component that runs independently of UI components
export function GlobalRestTimer({
  children,
  notifyRest,
  notifyRestStart,
  onRestComplete,
  getNextExercise
}: GlobalRestTimerProps) {
  const restTimeRemaining = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState.restTimeRemaining
  );
  const isResting = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState.isResting
  );
  const workoutMachineRef = WorkoutMachineContext.useActorRef();
  const hasNotifiedSmallRestRef = useRef(false);
  const lastRestTimeRef = useRef(restTimeRemaining);
  const [isPaused, setIsPaused] = useState(false);


  const wasRestingRef = useRef(false);
  // Fire once when we *enter* resting
  useEffect(() => {
    if (isResting && !wasRestingRef.current) {
      if (notifyRestStart) {
        const nextExercise = getNextExercise?.();
        if (nextExercise) {
          const exerciseInfo = `${nextExercise.name}${nextExercise.reps ? ` - ${nextExercise.reps} reps` : ''}${nextExercise.weight ? ` @ ${nextExercise.weight}lb` : ''}`;
          notifyRestStart(exerciseInfo);
        } else {
          notifyRestStart();
        }
      }
    }
    wasRestingRef.current = isResting;
  }, [isResting, notifyRestStart, getNextExercise]);

  // Reset notification flag when rest time changes (new rest period)
  useEffect(() => {
    if (restTimeRemaining > lastRestTimeRef.current) {
      hasNotifiedSmallRestRef.current = false;
    }
    lastRestTimeRef.current = restTimeRemaining;
  }, [restTimeRemaining]);

  useEffect(() => {
    if (!isResting || isPaused) {
      return;
    }

    if (restTimeRemaining <= 0) {
      // Auto-complete rest when timer reaches 0
      workoutMachineRef.send({ type: 'event.rest_complete' });
      if (onRestComplete) {
        onRestComplete();
      }
      return;
    }

    // Check for small rest notification (only once per rest period)
    if (restTimeRemaining <= 15 && !hasNotifiedSmallRestRef.current) {
      // Send notification to chat
      if (notifyRest) {
        const nextExercise = getNextExercise?.();
        if (nextExercise) {
          notifyRest(nextExercise.name);
        } else {
          notifyRest();
        }
      }
      hasNotifiedSmallRestRef.current = true;
    }

    const timeout = setTimeout(() => {
      // Update the global workout state every second
      if (restTimeRemaining > 0) {
        workoutMachineRef.send({
          type: 'event.update_rest_timer',
          restTimeRemaining: restTimeRemaining - 1
        });
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [
    isResting,
    restTimeRemaining,
    workoutMachineRef,
    isPaused,
    notifyRest,
    onRestComplete
  ]);

  const pauseTimer = useCallback(() => setIsPaused(true), []);
  const resumeTimer = useCallback(() => setIsPaused(false), []);

  // Reset pause state when rest period ends
  useEffect(() => {
    if (!isResting) {
      setIsPaused(false);
    }
  }, [isResting]);

  const contextValue: GlobalTimerContextType = useMemo(() => {
    return {
      isPaused,
      pauseTimer,
      resumeTimer
    };
  }, [isPaused, pauseTimer, resumeTimer]);

  return (
    <GlobalTimerContext.Provider value={contextValue}>
      {children}
    </GlobalTimerContext.Provider>
  );
}
