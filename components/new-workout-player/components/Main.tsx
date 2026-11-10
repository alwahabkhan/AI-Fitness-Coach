import React, { useCallback, useMemo } from "react";
import { WorkoutMachineContext } from '@/state-machine/workout';
import { WorkoutStatus } from '@/types/workout';
import { getShouldFinishWorkout } from '@/util/workout';
import { SessionDurationTimer } from '@/components/session-duration-timer';

interface Exercise {
  id: string;
  title: string;
  reps: number;
  sets: number;
  videoUrl?: string;
}

interface MainProps {
  selectedExercise?: Exercise | null;
  formattedSession?: string;
  currentSet?: number;
}

export default function Main({ selectedExercise, formattedSession, currentSet = 1 }: MainProps) {
  const workoutMachineRef = WorkoutMachineContext.useActorRef();
  
  const workoutState = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutState
  );

  const sessionId = WorkoutMachineContext.useSelector(
    (state) => state?.context?.sessionId
  );
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutData ?? []
  );

  const currentGroup = workoutState?.currentGroup ?? 0;
  const currentExerciseIndex = workoutState?.currentExerciseIndex ?? 0;

  // Check if we can go previous
  const canGoPrevious = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return false;
    
    const currentExercise = workoutData[currentGroup]?.exercises?.[currentExerciseIndex];
    
    return (
      currentExerciseIndex > 0 ||
      currentExercise?.completedSet !== null ||
      currentGroup > 0
    );
  }, [workoutData, currentGroup, currentExerciseIndex]);

  // Check if we should finish workout
  const shouldFinishWorkout = useMemo(() => {
    return getShouldFinishWorkout(workoutData);
  }, [workoutData]);

  const isCompleted = workoutState?.status === WorkoutStatus.COMPLETED;

  const onPreviousSet = useCallback(() => {
    workoutMachineRef?.send({ type: 'event.previous_set' });
  }, [workoutMachineRef]);

  const onNextSet = useCallback(() => {
    workoutMachineRef?.send({ type: 'event.next_set' });
  }, [workoutMachineRef]);

  return (
    <main className="col-span-6 p-6 pt-0 bg-gray-50 flex flex-col gap-6">
      {/* Video section */}
      <div className="bg-gray-100 h-64 rounded-md flex items-center justify-center overflow-hidden">
        {selectedExercise?.videoUrl ? (
          <video
            src={selectedExercise.videoUrl}
            controls
            className="w-full h-full object-cover"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 text-gray-400 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-500">No video available</p>
          </div>
        )}
      </div>

      {/* Exercise details & controls */}
      <div className="bg-white px-6 py-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        {/* Top Row: Exercise info + Timer */}
        <div className="flex items-start justify-between">
          {/* Left: Exercise info */}
          <div className="flex flex-col">
            <div className="text-base font-semibold text-gray-900">
              {selectedExercise?.title ?? "DB Bench Press"}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <span>Set {currentSet} of {selectedExercise?.sets ?? 3}</span>
              <span>•</span>
              <span>{selectedExercise?.reps ?? 7} reps</span>
            </div>
          </div>

          {/* Right: Timer pill */}
          <SessionDurationTimer sessionId={sessionId} workoutStatus={workoutState?.status} />
        </div>

        {/* Bottom Row: Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button 
            onClick={onPreviousSet}
            disabled={!canGoPrevious || isCompleted}
            className="px-4 py-2 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button 
            onClick={onNextSet}
            disabled={isCompleted}
            className="px-4 py-2 text-sm rounded-md text-black border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shouldFinishWorkout ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </main>
  );
}