import { WorkoutMachineContext } from '@/state-machine/workout';
import { ExerciseGroup, Exercise } from '@/types/workout';
import {
  CheckCircle,
  Dumbbell,
  Timer,
  Activity,
  Clock,
  Hourglass
} from 'lucide-react';

import { memo, useCallback, useEffect } from 'react';

interface ExerciseListProps {
  workoutData: ExerciseGroup[];
}

const ExerciseList = memo(function ExerciseList({
  workoutData
}: ExerciseListProps) {
  const status = WorkoutMachineContext.useSelector((state) => {
    return state?.context?.workoutState?.status ?? 'not-started';
  });

  const isResting = WorkoutMachineContext.useSelector((state) => {
    return state?.context?.workoutState?.isResting ?? false;
  });

  const currentGroup = WorkoutMachineContext.useSelector((state) => {
    return state?.context?.workoutState?.currentGroup ?? 0;
  });

  const currentExerciseIndex = WorkoutMachineContext.useSelector((state) => {
    return state?.context?.workoutState?.currentExerciseIndex ?? 0;
  });

  // Debug logging for workout state
  useEffect(() => {
    console.log('[WORKOUT STATE DEBUG]', {
      status,
      isResting,
      currentGroup,
      currentExerciseIndex,
      currentExercise: workoutData[currentGroup]?.exercises?.[currentExerciseIndex] ? {
        id: workoutData[currentGroup].exercises[currentExerciseIndex].id,
        name: workoutData[currentGroup].exercises[currentExerciseIndex].name,
        setNumber: workoutData[currentGroup].exercises[currentExerciseIndex].setNumber,
        completedSet: workoutData[currentGroup].exercises[currentExerciseIndex].completedSet !== null
      } : null,
      group0Exercises: workoutData[0]?.exercises?.map((ex, i) => ({
        index: i,
        id: ex.id,
        name: ex.name,
        setNumber: ex.setNumber,
        completedSet: ex.completedSet !== null
      }))
    });
  }, [status, isResting, currentGroup, currentExerciseIndex, workoutData]);

  const getExerciseIcon = useCallback((exerciseName: string | undefined | null) => {
    if (!exerciseName) {
      return Dumbbell;
    }
    const name = exerciseName.toLowerCase();
    if (
      name.includes('run') ||
      name.includes('jog') ||
      name.includes('cardio')
    ) {
      return Activity;
    }
    return Dumbbell;
  }, []);

  const isExerciseCompletedForSet = useCallback((exercise: Exercise) => {
    return exercise.completedSet !== null;
  }, []);

  const isCurrentExercise = useCallback(
    (groupIndex: number, exerciseIndex: number) => {
      if (status === 'not-started') return false;
      if (status === 'paused') return false;
      if (isResting) return false;
      if (currentGroup !== groupIndex) return false;

      const currentEx = workoutData[groupIndex].exercises[currentExerciseIndex];
      const exAtIndex = workoutData[groupIndex].exercises[exerciseIndex];
      if (!currentEx || !exAtIndex || !currentEx.name || !exAtIndex.name) return false;
      return currentEx.name === exAtIndex.name && currentEx.completedSet === null;
    },
    [status, isResting, currentGroup, currentExerciseIndex, workoutData]
  );

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-8 px-2 sm:px-0">Workout</h2>

      {workoutData.map((group, groupIndex) => (
        <div key={group.id} className="flex gap-4 sm:gap-8 h-max px-2 sm:px-0">
          <div className="flex-1 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs sm:text-sm font-semibold text-gray-900">
                Group {group.group}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-600">
                Rounds: {Math.max(1, group.sets || 1)}
              </div>
            </div>
            <div className="space-y-3">
              {group.exercises.map((exercise, exerciseIndex) => {
                if (exercise.reps === 0) return null;
                if (!exercise.name) return null;

                const ExerciseIcon = getExerciseIcon(exercise.name);
                const firstIndexOfThis = group.exercises.findIndex((e) => e.name === exercise.name);
                const isFirstOccurrence = firstIndexOfThis === exerciseIndex;
                if (!isFirstOccurrence) return null;

                const allSetsForThisExercise = group.exercises.filter((e) => e.name === exercise.name);
                const isExerciseCompleted = allSetsForThisExercise.every((e) =>
                  isExerciseCompletedForSet(e)
                );
                const isCurrent = isCurrentExercise(groupIndex, exerciseIndex);

                // Determine which reps/weight to display
                // Priority:
                // 1. If currently active (not resting), show the active set's reps/weight
                // 2. If resting, find the previous exercise (the one that was just completed) and show its reps
                // 3. Otherwise, show the first set's values
                let displayReps = exercise.reps;
                let displayWeight = exercise.weight;
                
                if (currentGroup === groupIndex) {
                  if (isResting) {
                    // When resting, currentExerciseIndex points to the NEXT exercise
                    // We need to find the PREVIOUS exercise (the one that was just completed)
                    let prevGroup = currentGroup;
                    let prevIndex = currentExerciseIndex - 1;
                    
                    if (prevIndex < 0) {
                      prevGroup = currentGroup - 1;
                      if (prevGroup >= 0 && prevGroup < workoutData.length) {
                        prevIndex = workoutData[prevGroup].exercises.length - 1;
                      }
                    }
                    
                    // Check if the previous exercise matches this exercise name
                    if (prevGroup >= 0 && prevGroup < workoutData.length && prevIndex >= 0 && prevGroup === groupIndex) {
                      const prevExercise = workoutData[prevGroup]?.exercises?.[prevIndex];
                      if (prevExercise && prevExercise.name === exercise.name) {
                        // Show the set that was just completed (before rest started)
                        displayReps = prevExercise.reps;
                        displayWeight = prevExercise.weight;
                      }
                    }
                  } else {
                    // Not resting - show the currently active set's reps/weight
                    const exerciseAtCurrentIndex = workoutData[currentGroup]?.exercises?.[currentExerciseIndex];
                    if (exerciseAtCurrentIndex && exerciseAtCurrentIndex.name === exercise.name) {
                      displayReps = exerciseAtCurrentIndex.reps;
                      displayWeight = exerciseAtCurrentIndex.weight;
                    }
                  }
                }

                return (
                  <div
                    key={`${exercise.id}-${exercise.setNumber}`}
                    className="space-y-2"
                  >
                    {/* Exercise */}
                    <div
                      className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                        isCurrent
                          ? 'border-blue-400 bg-blue-100 shadow-md'
                          : isExerciseCompleted
                            ? 'border-green-400 bg-green-100'
                            : 'border-gray-200 bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <ExerciseIcon
                            className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${
                              isCurrent
                                ? 'text-blue-600'
                                : isExerciseCompleted
                                  ? 'text-green-600'
                                  : 'text-gray-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                              {exercise.name}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              {isExerciseCompleted ? (
                                <>
                                  {exercise.completedSet?.reps || displayReps}{' '}
                                  reps
                                  {(exercise.completedSet?.weight ||
                                    displayWeight) > 0 &&
                                    ` • ${exercise.completedSet?.weight || displayWeight}lbs`}
                                </>
                              ) : (
                                <>
                                  {displayReps} reps
                                  {displayWeight > 0 &&
                                    ` • ${displayWeight}lbs`}
                                </>
                              )}
                            </div>
                            {/* Set chips (per-set status) */}
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              {allSetsForThisExercise.map((setEx, idx) => {
                                const done = isExerciseCompletedForSet(setEx);
                                // Find the exact index of this setEx in the workoutData exercises array
                                // This ensures we're comparing the exact same exercise instance
                                const setExIndexInWorkoutData = workoutData[groupIndex]?.exercises?.findIndex(
                                  (ex) => ex.name === setEx.name && ex.setNumber === setEx.setNumber && ex.id === setEx.id
                                );
                                // Only highlight if the currentExerciseIndex matches the exact index of this set
                                const isThisSetCurrent =
                                  currentGroup === groupIndex &&
                                  setExIndexInWorkoutData !== undefined &&
                                  setExIndexInWorkoutData !== -1 &&
                                  setExIndexInWorkoutData === currentExerciseIndex &&
                                  !isResting;
                                
                                // Debug logging
                                if (exercise.name === '1A DB OH Ext' || exercise.name === '1A DB Row') {
                                  console.log(`[SET HIGHLIGHT DEBUG] Exercise: ${exercise.name}, Set: ${idx + 1} (setNumber: ${setEx.setNumber})`, {
                                    setEx: {
                                      id: setEx.id,
                                      name: setEx.name,
                                      setNumber: setEx.setNumber
                                    },
                                    setExIndexInWorkoutData,
                                    currentGroup,
                                    groupIndex,
                                    currentExerciseIndex,
                                    isResting,
                                    isThisSetCurrent,
                                    done,
                                    currentExercise: workoutData[groupIndex]?.exercises?.[currentExerciseIndex] ? {
                                      id: workoutData[groupIndex].exercises[currentExerciseIndex].id,
                                      name: workoutData[groupIndex].exercises[currentExerciseIndex].name,
                                      setNumber: workoutData[groupIndex].exercises[currentExerciseIndex].setNumber
                                    } : null,
                                    allExercisesInGroup: workoutData[groupIndex]?.exercises?.map((ex, i) => ({
                                      index: i,
                                      id: ex.id,
                                      name: ex.name,
                                      setNumber: ex.setNumber,
                                      completedSet: ex.completedSet !== null
                                    }))
                                  });
                                }
                                
                                return (
                                  <span
                                    key={`${setEx.id}-chip-${idx}`}
                                    className={[
                                      'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-[11px] font-medium border',
                                      done
                                        ? 'bg-green-500 text-white border-green-500'
                                        : isThisSetCurrent
                                          ? 'bg-blue-500 text-white border-blue-500'
                                          : 'bg-gray-100 text-gray-700 border-gray-200'
                                    ].join(' ')}
                                    title={`Set ${idx + 1}${done ? ' • completed' : isThisSetCurrent ? ' • current' : ''}`}
                                  >
                                    {idx + 1}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ml-2 ${
                            isExerciseCompleted
                              ? 'bg-green-500 text-white'
                              : isCurrent
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {isExerciseCompleted ? (
                            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          ) : isCurrent ? (
                            <Hourglass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          ) : (
                            <span className="text-xs sm:text-sm">•</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rest Period */}
                    {exercise.restSeconds > 0 && (
                      <RestPeriod
                        exercise={exercise}
                        groupIndex={groupIndex}
                        exerciseIndex={exerciseIndex}
                        isExerciseCompleted={isExerciseCompleted}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export default ExerciseList;

const RestPeriod = memo(function RestPeriod({
  exercise,
  groupIndex,
  exerciseIndex,
  isExerciseCompleted
}: {
  exercise: Exercise;
  groupIndex: number;
  exerciseIndex: number;
  isExerciseCompleted: boolean;
}) {
  const isResting = WorkoutMachineContext.useSelector((state) => {
    return state.context.workoutState.isResting;
  });
  const currentGroup = WorkoutMachineContext.useSelector((state) => {
    return state.context.workoutState.currentGroup;
  });
  const currentExerciseIndex = WorkoutMachineContext.useSelector((state) => {
    return state.context.workoutState.currentExerciseIndex;
  });

  const workoutData = WorkoutMachineContext.useSelector((state) => {
    return state.context.workoutData;
  });

  const isRestingFromExercise = (grpIndex: number, exerciseName: string) => {
    if (!isResting) return false;
    const groups = workoutData;
    const cg = currentGroup;
    const ci = currentExerciseIndex;
    if (cg == null || ci == null) return false;
    if (cg < 0 || cg >= groups.length) return false;

    let prevGroup = cg;
    let prevIndex = ci - 1;
    if (prevIndex < 0) {
      prevGroup = cg - 1;
      if (prevGroup < 0 || prevGroup >= groups.length) return false;
      prevIndex = groups[prevGroup].exercises.length - 1;
    }
    const prevEx = groups[prevGroup]?.exercises?.[prevIndex];
    if (!prevEx || !prevEx.name) return false;

    return prevGroup === grpIndex && prevEx.name === exerciseName;
  };

  const restTimeRemaining = WorkoutMachineContext.useSelector((state) => {
    return state.context.workoutState.restTimeRemaining;
  });
  const isCurrentlyResting =
    restTimeRemaining > 0 && isRestingFromExercise(groupIndex, exercise.name);

  return (
    <div
      className={`p-2 rounded-md border-l-4 ${
        isCurrentlyResting
          ? 'border-l-orange-400 bg-orange-50'
          : isExerciseCompleted
            ? 'border-l-green-400 bg-green-50'
            : 'border-l-gray-300 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Timer
            className={`h-3 w-3 ${
              isCurrentlyResting
                ? 'text-orange-600'
                : isExerciseCompleted
                  ? 'text-green-600'
                  : 'text-gray-500'
            }`}
          />
          <div className="text-[10px] sm:text-xs text-gray-700">
            Rest {exercise.restSeconds}s{isCurrentlyResting && <RestTimer />}
          </div>
        </div>
        <Clock className="h-3 w-3 text-gray-400" />
      </div>
    </div>
  );
});

const RestTimer = memo(function RestTimer() {
  const restTimeRemaining = WorkoutMachineContext.useSelector((state) => {
    return state.context.workoutState.restTimeRemaining;
  });
  if (restTimeRemaining <= 0) return null;
  return (
    <span className="ml-1 font-medium text-orange-600">
      ({restTimeRemaining}s)
    </span>
  );
});