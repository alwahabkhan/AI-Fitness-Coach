/* eslint-disable @typescript-eslint/no-explicit-any */
import { assign, fromPromise, setup } from 'xstate';
import { createActorContext } from '@xstate/react';
import {
  ExerciseGroup,
  WorkoutState,
  WorkoutStatus,
  Exercise
} from '@/types/workout';
import {
  addCompletedSetToExercise,
  mapFetchedWorkoutToExerciseGroup,
  removeCompletedSetFromExercise
} from '@/util/workout';
import { mockWorkout1, mockWorkout2, mockWorkout3 } from '@/mocks/mockWorkout';

type WorkoutContext = {
  workoutState: WorkoutState;
  workoutData: ExerciseGroup[];
  messageThreadId: string;
  costTracking: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
  };
  isLoadingWorkout: boolean;
  isExerciseVideoShownOnMobile: boolean;
  workoutAgentContext: string;
  startDate?: Date;
  adaptReturnState?: string;
  workoutId?: string;
  trainingDayId?: string;
  programId?: string;
  sessionId?: string;
  nextSessionNumber?: number;
  snapshotData?: {
    workoutState: WorkoutState;
    workoutData: ExerciseGroup[];
    messageThreadId: string;
    costTracking: any;
  } | null;
  finishResults?: {
    workoutSessionId?: string;
    trainingSessionId?: string;
    sessionSummary: {
      total_duration_minutes: number;
      exercises_completed: number;
      total_volume?: number;
    };
    exercises: Array<{
      exercise_id?: string;
      training_exercise_id?: string;
      sets_completed: Array<{
        set_number?: number;
        weight: number;
        reps: number;
        completed_at: string;
      }>;
    }>;
  };
};

export type WorkoutEvent =
  | { type: 'event.load_workout'; workoutId: string }
  | { type: 'event.load_training_day'; trainingDayId: string }
  | {
      type: 'event.adapt_workout';
      exercises: {
        id: string;
        reps?: number;
        weight?: number;
        sets?: number;
        restSeconds?: number;
      }[];
    }
  | { type: 'event.start' }
  | { type: 'event.resume_workout' }
  | { type: 'event.start_fresh' }
  | { type: 'event.pause' }
  | { type: 'event.resume' }
  | { type: 'event.next_set' }
  | { type: 'event.previous_set' }
  | { type: 'event.go_to_exercise'; exerciseId: string }
  | { type: 'event.go_to_group'; groupId: string }
  | { type: 'event.finish_workout' }
  | { type: 'event.skip_rest' }
  | { type: 'event.rest_complete' }
  | { type: 'event.add_tokens'; inputTokens: number; outputTokens: number }
  | { type: 'event.show_exercise_video' }
  | { type: 'event.hide_exercise_video' }
  | { type: 'event.update_rest_timer'; restTimeRemaining: number };

const workoutMachine = setup({
  types: {
    context: {} as WorkoutContext,
    events: {} as WorkoutEvent
  },
  actions: {
    saveSnapshot: ({ context }: { context: WorkoutContext }) => {
      if (!context.sessionId) return;

      // Create snapshot payload
      const snapshot = {
        workoutState: context.workoutState,
        workoutData: context.workoutData,
        messageThreadId: context.messageThreadId,
        costTracking: context.costTracking
      };

      // Fire and forget snapshot save
      fetch(`/api/training-session/${context.sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_data: snapshot,
          snapshot_type: 'auto_save'
        })
      }).catch(async (err) => {
        console.error('Auto-save failed', err);
        // Create error notification for data sync failure
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alertType: 'error',
              title: 'Data Sync Failed',
              message: 'Failed to save your workout progress. Please check your connection and try again.',
              deliveryChannels: ['in_app', 'chat'],
              messageThreadId: context.messageThreadId
            })
          });
        } catch (notificationError) {
          console.error('Failed to create error notification', notificationError);
        }
      });
    },
    saveProgress: ({ context }: { context: WorkoutContext }) => {
      if (!context.sessionId) return;

      // Extract completed exercises from workout data
      const completedExercises = context.workoutData.flatMap((group) =>
        group.exercises
          .filter((ex) => ex.completedSet)
          .map((ex) => ({
            training_exercise_id: ex.id,
            sets_completed: [
              {
                set_number: ex.setNumber || 1,
                reps: ex.completedSet?.reps || 0,
                weight: ex.completedSet?.weight || 0,
                completed_at: ex.completedSet?.completedAt?.toISOString() || new Date().toISOString()
              }
            ]
          }))
      );

      // Fire and forget progress save with last_activity_time
      fetch(`/api/training-session/${context.sessionId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_data: {
            workoutState: context.workoutState,
            workoutData: context.workoutData
          },
          results: {
            exercises: completedExercises,
            session_summary: {
              exercises_completed: completedExercises.length
            }
          },
          last_activity_time: new Date().toISOString()
        })
      }).catch((err) => {
        console.error('Progress save failed', err);
      });
    }
  },
  actors: {
    loadWorkoutActor: fromPromise(
      async ({ input }: { input: { workoutId: string } }) => {
        const { workoutId } = input;

        if (workoutId === '1') {
          return {
            workoutData: mockWorkout1,
            workoutAgentContext: '',
            messageThreadId: '',
            workoutId
          };
        } else if (workoutId === '2') {
          return {
            workoutData: mockWorkout2,
            workoutAgentContext: '',
            messageThreadId: '',
            workoutId
          };
        } else if (workoutId === '3') {
          return {
            workoutData: mockWorkout3,
            workoutAgentContext: '',
            messageThreadId: '',
            workoutId
          };
        }

        const response = await fetch(`/api/workout/${workoutId}`);
        if (!response.ok) {
          throw new Error('Failed to load workout');
        }

        const { workout, exercises } = await response.json();

        const workoutData = mapFetchedWorkoutToExerciseGroup(exercises);

        const threadResponse = await fetch('/api/workout-coach/thread', {
          method: 'POST'
        });
        if (!threadResponse.ok) {
          throw new Error('Failed to create workout coach thread');
        }

        const { thread } = await threadResponse.json();

        return {
          workoutData,
          workoutAgentContext: workout.agent_context,
          messageThreadId: thread.id,
          workoutId
        };
      }
    ),
    loadTrainingDayActor: fromPromise(
      async ({ input }: { input: { trainingDayId: string } }) => {
        const { trainingDayId } = input;

        // 1. Check for active session/snapshot first
        let activeSessionId: string | undefined;
        let snapshotData: any | null = null;

        try {
          const sessionResponse = await fetch(
            `/api/training-session/active?trainingDayId=${trainingDayId}`
          );
          if (sessionResponse.ok) {
            const session = await sessionResponse.json();
            if (session) {
              activeSessionId = session.id;
              if (session.snapshot_data) {
                snapshotData = session.snapshot_data;
              } else {
                const snapRes = await fetch(
                  `/api/training-session/${session.id}/snapshot`
                );
                if (snapRes.ok) {
                  const snap = await snapRes.json();
                  snapshotData = snap.snapshot_data;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Failed to check for active session:', e);
        }

        // 2. Fetch standard training day data
        const response = await fetch(
          `/api/training-day/${trainingDayId}/execute`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch training day');
        }

        const { trainingDay, program, exercises } = await response.json();
        const trainingDayData = {
          ...trainingDay,
          training_exercises: exercises,
          program_id: program.id
        };

        // Get the next session number based on completed sessions
        const sessionsResponse = await fetch(
          `/api/training-session/day/${trainingDayId}`
        );

        let nextSessionNumber = 1;
        if (sessionsResponse.ok) {
          const existingSessions = await sessionsResponse.json();
          const completedSessions = existingSessions.filter(
            (s: any) => s.status === 'completed'
          );
          if (completedSessions.length > 0) {
            nextSessionNumber =
              Math.max(...completedSessions.map((s: any) => s.session_number)) +
              1;
          }
        }

        console.log('Next session number for execution:', nextSessionNumber);

        // Calculate progression for the next session
        const progressionResponse = await fetch(
          '/api/training-session/calculate-progression',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              training_day_id: trainingDayId,
              session_number: nextSessionNumber
            })
          }
        );

        let workoutData: ExerciseGroup[];

        if (progressionResponse.ok) {
          const { exercises: progressedExercises } =
            await progressionResponse.json();

          console.log(
            'Progressed exercises fetched:',
            progressedExercises.length
          );

          // Group exercises by group_number
          const groupedExercises = progressedExercises.reduce(
            (acc: Record<number, any[]>, ex: any) => {
              const groupNum = ex.group_number || 1;
              if (!acc[groupNum]) {
                acc[groupNum] = [];
              }
              acc[groupNum].push(ex);
              return acc;
            },
            {}
          );
          
          // Log grouped exercises to debug duplicates
          console.log('[WORKOUT] Grouped exercises before processing:', 
            Object.entries(groupedExercises).map(([groupNum, exercises]) => ({
              group: groupNum,
              count: (exercises as any[]).length,
              exercises: (exercises as any[]).map((e: any) => ({
                id: e.id,
                name: e.exercise?.name,
                exerciseId: e.exercise?.id,
                group_number: e.group_number
              }))
            }))
          );

          workoutData = Object.entries(groupedExercises)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([groupNum, exercises]) => {
              const groupExercises = exercises as any[];
              
              // Deduplicate exercises by trainingExerciseId to prevent duplicates
              // This ensures each exercise appears only once per group
              const uniqueExercises = groupExercises.reduce((acc: any[], ex: any) => {
                // Use trainingExerciseId (training_exercise.id) as the unique identifier
                // This is the ID from the training_exercise table, which should be unique per exercise in a group
                const trainingExId = ex.id || ex.training_exercise_id;
                const existingIndex = acc.findIndex(
                  (e) => (e.id || e.training_exercise_id) === trainingExId
                );
                if (existingIndex === -1) {
                  acc.push(ex);
                } else {
                  console.warn(`[WORKOUT] Duplicate exercise found in group ${groupNum}:`, {
                    name: ex.exercise?.name,
                    trainingExerciseId: trainingExId,
                    exerciseId: ex.exercise?.id,
                    existing: acc[existingIndex]?.exercise?.name
                  });
                }
                return acc;
              }, []);
              
              const sets = uniqueExercises[0]?.sets || 3;

              console.log(`[WORKOUT] Group ${groupNum}: ${groupExercises.length} exercises before dedup, ${uniqueExercises.length} after dedup`, {
                before: groupExercises.map((e: any) => ({ id: e.id, name: e.exercise?.name })),
                after: uniqueExercises.map((e: any) => ({ id: e.id, name: e.exercise?.name }))
              });

              // Create exercise instances for each set with progressed values
              const allExercises: Exercise[] = [];

              // @note INTERLEAVE: Loop through sets first, then exercises
              // This creates: Ex1_Set1, Ex2_Set1, Ex1_Set2, Ex2_Set2, etc.
              for (let setNum = 1; setNum <= sets; setNum++) {
                uniqueExercises.forEach((ex: any) => {
                  const sessionReps = ex.session_reps || ex.reps || [];
                  const sessionWeights = ex.session_weights || ex.weights || [];
                  const exerciseSets = ex.sets || 3;

                  // Only add this set if the exercise has this many sets
                  if (setNum <= exerciseSets) {
                    allExercises.push({
                      id: ex.exercise.id,
                      trainingExerciseId: ex.id,
                      name: ex.exercise.name,
                      videoUrl: ex.exercise.video_url || '',
                      reps: sessionReps[setNum - 1] || sessionReps[0] || 10,
                      weight:
                        sessionWeights[setNum - 1] || sessionWeights[0] || 0,
                      setNumber: setNum,
                      completedSet: null,
                      restSeconds: ex.rest_seconds ?? 60,
                      agentContext: ex.exercise.agent_context || '',
                      sets: exerciseSets
                    });
                  }
                });
              }

              return {
                group: Number(groupNum),
                id: `group-${groupNum}`,
                exercises: allExercises,
                sets
              };
            });
        } else {
          // Fallback to initial values if progression calculation fails
          console.warn('Failed to fetch progression, using initial values');
          workoutData = mapFetchedWorkoutToExerciseGroup(
            trainingDayData.training_exercises || []
          );
        }

        return {
          workoutData,
          workoutAgentContext: trainingDayData.description || '',
          messageThreadId: '',
          trainingDayId,
          programId: program.id,
          sessionId: activeSessionId,
          snapshotData,
          nextSessionNumber
        };
      }
    ),
    startSessionActor: fromPromise(
      async ({
        input
      }: {
        input: { trainingDayId: string; programId?: string; session_number?: number };
      }) => {
        // Create a new session in the DB
        const response = await fetch('/api/training-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            training_day_id: input.trainingDayId,
            program_id: input.programId,
            session_number: input.session_number,
            status: 'in_progress',
            start_time: new Date().toISOString()
          })
        });

        if (!response.ok) throw new Error('Failed to start session');
        const session = await response.json();
        return { sessionId: session.id };
      }
    ),
    nextSetActor: fromPromise(
      async ({ input }: { input: { context: WorkoutContext } }) => {
        const { context } = input;
        const { workoutState, workoutData } = context;

        // Mark current exercise as completed
        const updatedWorkoutData = addCompletedSetToExercise(
          workoutData,
          workoutState.currentGroup,
          workoutState.currentExerciseIndex
        );

        let newCurrentGroupIndex = workoutState.currentGroup;
        let newCurrentExerciseIndex = workoutState.currentExerciseIndex + 1;

        // Get current group
        const currentGroup = updatedWorkoutData[newCurrentGroupIndex];

        // Check if we've reached the end of the current group
        if (newCurrentExerciseIndex >= currentGroup.exercises.length) {
          // Move to next group
          newCurrentGroupIndex += 1;
          newCurrentExerciseIndex = 0;

          // Check if we've completed all groups
          if (newCurrentGroupIndex >= updatedWorkoutData.length) {
            // Workout is complete, stay on last exercise
            newCurrentGroupIndex = updatedWorkoutData.length - 1;
            newCurrentExerciseIndex =
              updatedWorkoutData[newCurrentGroupIndex].exercises.length - 1;
          }
        }

        // Skip exercises with 0 reps (if any exist)
        while (
          newCurrentGroupIndex < updatedWorkoutData.length &&
          updatedWorkoutData[newCurrentGroupIndex].exercises[
            newCurrentExerciseIndex
          ]?.reps === 0
        ) {
          newCurrentExerciseIndex += 1;
          if (
            newCurrentExerciseIndex >=
            updatedWorkoutData[newCurrentGroupIndex].exercises.length
          ) {
            newCurrentGroupIndex += 1;
            newCurrentExerciseIndex = 0;
            if (newCurrentGroupIndex >= updatedWorkoutData.length) {
              // All exercises done
              newCurrentGroupIndex = updatedWorkoutData.length - 1;
              newCurrentExerciseIndex =
                updatedWorkoutData[newCurrentGroupIndex].exercises.length - 1;
              break;
            }
          }
        }

        const restTimeRemaining =
          updatedWorkoutData[workoutState.currentGroup].exercises[
            workoutState.currentExerciseIndex
          ].restSeconds;
        const isResting = restTimeRemaining > 0;

        return {
          ...context,
          workoutState: {
            ...workoutState,
            currentGroup: newCurrentGroupIndex,
            currentExerciseIndex: newCurrentExerciseIndex,
            restTimeRemaining,
            isResting
          },
          workoutData: updatedWorkoutData
        };
      }
    ),
    previousSetActor: fromPromise(
      async ({ input }: { input: { context: WorkoutContext } }) => {
        const { context } = input;
        const { workoutState, workoutData } = context;

        let groupIndexForRemoval = workoutState.currentGroup;
        let exerciseIndexForRemoval = workoutState.currentExerciseIndex;
        let hasFoundCompletedExercise = false;

        for (let i = workoutState.currentGroup; i >= 0; i--) {
          const group = workoutData[i];

          const exerciseIndex =
            workoutState.currentGroup === i
              ? workoutState.currentExerciseIndex
              : group.exercises.length - 1;

          if (exerciseIndex === 0) continue;

          for (let j = exerciseIndex; j >= 0; j--) {
            const exercise = group.exercises[j];

            if (exercise.completedSet !== null) {
              groupIndexForRemoval = i;
              exerciseIndexForRemoval = j;
              hasFoundCompletedExercise = true;
              break;
            }
          }

          if (hasFoundCompletedExercise) {
            break;
          }
        }

        const updatedWorkoutData = removeCompletedSetFromExercise(
          workoutData,
          groupIndexForRemoval,
          exerciseIndexForRemoval
        );

        return {
          ...context,
          workoutState: {
            ...workoutState,
            currentGroup: groupIndexForRemoval,
            currentExerciseIndex: exerciseIndexForRemoval,
            restTimeRemaining: 0,
            isResting: false
          },
          workoutData: updatedWorkoutData
        };
      }
    ),
    goToExerciseActor: fromPromise(
      async ({
        input
      }: {
        input: { exerciseId: string; context: WorkoutContext };
      }) => {
        const { context, exerciseId } = input;

        const foundGroupIndex = context.workoutData.findIndex((group) =>
          group.exercises.some((exercise) => {
            return (
              exercise.id === exerciseId ||
              (exercise as any).trainingExerciseId === exerciseId ||
              exercise.id.startsWith(exerciseId + '-')
            );
          })
        );

        let foundExerciseIndex = 0;
        let shouldRemoveCompletedSet = false;

        if (foundGroupIndex === -1) {
          return context;
        }

        const foundGroup = context.workoutData[foundGroupIndex];

        for (let i = 0; i < foundGroup.exercises.length; i++) {
          const exercise = foundGroup.exercises[i];

          const isMatch =
            exercise.id === exerciseId ||
            (exercise as any).trainingExerciseId === exerciseId ||
            exercise.id.startsWith(exerciseId + '-');

          if (!isMatch) continue;

          const exerciseTotalSets = foundGroup.exercises.filter((e) => {
            const eIsMatch =
              e.id === exerciseId ||
              (e as any).trainingExerciseId === exerciseId ||
              e.id.startsWith(exerciseId + '-');
            return eIsMatch && e.reps > 0;
          }).length;

          if (exercise.completedSet === null) {
            foundExerciseIndex = i;
            break;
          }

          if (exercise.setNumber === exerciseTotalSets) {
            foundExerciseIndex = i;
            shouldRemoveCompletedSet = true;
            break;
          }
        }

        return {
          ...context,
          workoutData: shouldRemoveCompletedSet
            ? removeCompletedSetFromExercise(
                context.workoutData,
                foundGroupIndex,
                foundExerciseIndex
              )
            : context.workoutData,
          workoutState: {
            ...context.workoutState,
            currentGroup: foundGroupIndex,
            currentExerciseIndex: foundExerciseIndex
          }
        };
      }
    ),
    goToGroupActor: fromPromise(
      async ({
        input
      }: {
        input: { groupId: string; context: WorkoutContext };
      }) => {
        const { context, groupId } = input;

        const foundGroupIndex = context.workoutData.findIndex(
          (group) => group.id === groupId
        );
        let foundExerciseIndex = 0;
        let lastCorrectExerciseIndex = 0;
        let hasFoundUncompletedExercise = false;
        let shouldRemoveCompletedSet = false;

        if (foundGroupIndex === -1) {
          return context;
        }

        const foundGroup = context.workoutData[foundGroupIndex];

        for (let i = 0; i < foundGroup.exercises.length; i++) {
          const exercise = foundGroup.exercises[i];

          if (exercise.reps === 0) continue;

          lastCorrectExerciseIndex = i;

          if (exercise.completedSet === null) {
            foundExerciseIndex = i;
            hasFoundUncompletedExercise = true;
            break;
          }
        }

        if (!hasFoundUncompletedExercise) {
          foundExerciseIndex = lastCorrectExerciseIndex;
          shouldRemoveCompletedSet = true;
        }

        return {
          ...context,
          workoutData: shouldRemoveCompletedSet
            ? removeCompletedSetFromExercise(
                context.workoutData,
                foundGroupIndex,
                foundExerciseIndex
              )
            : context.workoutData,
          workoutState: {
            ...context.workoutState,
            currentGroup: foundGroupIndex,
            currentExerciseIndex: foundExerciseIndex
          }
        };
      }
    ),
    adaptWorkoutActor: fromPromise(
      async ({
        input
      }: {
        input: {
          context: WorkoutContext;
          exercises: {
            id: string;
            reps?: number;
            weight?: number;
            sets?: number;
            restSeconds?: number;
          }[];
        };
      }) => {
        const { context, exercises } = input;
        const { workoutState, workoutData } = context;

        // Get the current active exercise
        const currentGroup = workoutData[workoutState.currentGroup];
        const currentExercise = currentGroup?.exercises[workoutState.currentExerciseIndex];
        
        if (!currentExercise) {
          console.warn('No current exercise found for adaptation');
          return context;
        }

        // Find matching update request - try to match by current exercise's ID or trainingExerciseId
        let matchingUpdate = exercises.find((e) => e.id === currentExercise.id);
        
        if (!matchingUpdate && (currentExercise as any).trainingExerciseId) {
          matchingUpdate = exercises.find(
            (e) => e.id === (currentExercise as any).trainingExerciseId
          );
        }

        if (!matchingUpdate) {
          // Try matching by ID prefix
          matchingUpdate = exercises.find((e) =>
            currentExercise.id.startsWith(e.id + '-')
          );
        }

        if (!matchingUpdate) {
          console.warn('No matching update found for current exercise');
          return context;
        }

        const trainingExerciseId = (currentExercise as any).trainingExerciseId;
        if (!trainingExerciseId) {
          console.warn('Current exercise has no trainingExerciseId');
          return context;
        }

        // Update only the current exercise instance in workout data
        const updatedWorkoutData = workoutData.map((group, groupIndex) => {
          if (groupIndex !== workoutState.currentGroup) {
            return group;
          }

          const updatedExercises = group.exercises.map((exercise, exerciseIndex) => {
            // Only update the current active exercise
            if (exerciseIndex !== workoutState.currentExerciseIndex) {
              return exercise;
            }

            return {
              ...exercise,
              reps: matchingUpdate.reps ?? exercise.reps,
              weight: matchingUpdate.weight ?? exercise.weight,
              restSeconds: matchingUpdate.restSeconds ?? exercise.restSeconds
            };
          });

          return {
            ...group,
            exercises: updatedExercises
          };
        });

        // Update database - only update the specific set's reps/weight in the array
        try {
          // Fetch current exercise data to get the reps/weights arrays
          const exerciseResponse = await fetch(`/api/program/exercise/${trainingExerciseId}`);
          if (!exerciseResponse.ok) {
            throw new Error('Failed to fetch current exercise data');
          }

          const currentExerciseData = await exerciseResponse.json();
          const currentReps = currentExerciseData.reps || [];
          const currentWeights = currentExerciseData.weights || [];
          const setIndex = currentExercise.setNumber - 1; // Convert 1-based to 0-based index

          const updateFields: {
            reps?: number[];
            weights?: number[];
            sets?: number;
            rest_seconds?: number;
          } = {};

          // Update only the specific set's reps in the array
          if (matchingUpdate.reps !== undefined) {
            const updatedReps = [...currentReps];
            if (setIndex >= 0 && setIndex < updatedReps.length) {
              updatedReps[setIndex] = matchingUpdate.reps;
              updateFields.reps = updatedReps;
            } else {
              // If set index is out of bounds, update all sets
              updateFields.reps = Array(currentReps.length || 3).fill(matchingUpdate.reps);
            }
          }

          // Update only the specific set's weight in the array
          if (matchingUpdate.weight !== undefined) {
            const updatedWeights = [...currentWeights];
            if (setIndex >= 0 && setIndex < updatedWeights.length) {
              updatedWeights[setIndex] = matchingUpdate.weight;
              updateFields.weights = updatedWeights;
            } else {
              // If set index is out of bounds, update all sets
              updateFields.weights = Array(currentWeights.length || 3).fill(matchingUpdate.weight);
            }
          }

          if (matchingUpdate.sets !== undefined) {
            updateFields.sets = matchingUpdate.sets;
          }

          if (matchingUpdate.restSeconds !== undefined) {
            updateFields.rest_seconds = matchingUpdate.restSeconds;
          }

          if (Object.keys(updateFields).length > 0) {
            const updateResponse = await fetch(`/api/program/exercise/${trainingExerciseId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateFields)
            });

            if (!updateResponse.ok) {
              const error = await updateResponse.json();
              console.error(`Failed to update exercise ${trainingExerciseId}:`, error);
            } else {
              console.log(`Successfully updated exercise ${trainingExerciseId} in program (set ${currentExercise.setNumber}):`, updateFields);
            }
          }
        } catch (error) {
          console.error(`Error updating exercise ${trainingExerciseId}:`, error);
        }

        // Keep current position - don't jump to next group
        return {
          ...context,
          workoutData: updatedWorkoutData,
          workoutState: {
            ...context.workoutState
            // Keep currentGroup and currentExerciseIndex unchanged
          }
        };
      }
    ),
    finishWorkoutActor: fromPromise(
      async ({
        input
      }: {
        input: {
          context: WorkoutContext;
          workoutId?: string;
          trainingDayId?: string;
        };
      }) => {
        const { context, trainingDayId } = input;

        // Use training day endpoint if trainingDayId is present
        const isTrainingSession = !!trainingDayId;

        const currentExercise =
          context.workoutData[context.workoutState.currentGroup]?.exercises[
            context.workoutState.currentExerciseIndex
          ];

        let finalWorkoutData = context.workoutData;

        // Mark current exercise as completed if it's not already completed
        if (currentExercise && currentExercise.completedSet === null) {
          finalWorkoutData = addCompletedSetToExercise(
            context.workoutData,
            context.workoutState.currentGroup,
            context.workoutState.currentExerciseIndex
          );
          console.log('Marked current exercise as completed:', {
            group: context.workoutState.currentGroup,
            exerciseIndex: context.workoutState.currentExerciseIndex,
            exerciseName: currentExercise.name,
            trainingExerciseId: (currentExercise as any).trainingExerciseId
          });
        }

        const endTime = new Date();
        const startTime = context.startDate || endTime;
        const totalDurationMinutes = Math.round(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60)
        );

        if (isTrainingSession) {
          // New training session format
          const exerciseResults: Array<{
            training_exercise_id: string;
            sets_completed: Array<{
              set_number: number;
              weight: number;
              reps: number;
              completed_at: string;
            }>;
          }> = [];

          let totalExercisesCompleted = 0;

          for (const group of finalWorkoutData) {
            for (const exercise of group.exercises) {
              if (exercise.completedSet) {
                const trainingExerciseId = (exercise as any).trainingExerciseId;
                
                if (!trainingExerciseId) {
                  console.warn('Exercise has completedSet but no trainingExerciseId:', {
                    exerciseName: exercise.name,
                    setId: exercise.id,
                    setNumber: exercise.setNumber
                  });
                  continue;
                }

                const exerciseResult = exerciseResults.find(
                  (e) => e.training_exercise_id === trainingExerciseId
                );

                if (exerciseResult) {
                  exerciseResult.sets_completed.push({
                    set_number: exercise.setNumber,
                    weight: exercise.completedSet.weight,
                    reps: exercise.completedSet.reps,
                    completed_at:
                      exercise.completedSet.completedAt.toISOString()
                  });
                } else {
                  exerciseResults.push({
                    training_exercise_id: trainingExerciseId,
                    sets_completed: [
                      {
                        set_number: exercise.setNumber,
                        weight: exercise.completedSet.weight,
                        reps: exercise.completedSet.reps,
                        completed_at:
                          exercise.completedSet.completedAt.toISOString()
                      }
                    ]
                  });
                }

                totalExercisesCompleted++;
              } else {
                // Log incomplete exercises for debugging
                const trainingExerciseId = (exercise as any).trainingExerciseId;
                if (trainingExerciseId) {
                  console.log('Exercise not completed:', {
                    exerciseName: exercise.name,
                    trainingExerciseId,
                    setNumber: exercise.setNumber,
                    group: group.group
                  });
                }
              }
            }
          }

          console.log('Collected exercise results:', {
            totalExercises: exerciseResults.length,
            totalSetsCompleted: totalExercisesCompleted,
            exerciseResults: exerciseResults.map(e => ({
              training_exercise_id: e.training_exercise_id,
              sets_count: e.sets_completed.length
            }))
          });

          const sessionSummary = {
            total_duration_minutes: totalDurationMinutes,
            exercises_completed: totalExercisesCompleted
          };

          // Get the session number - either from existing session or calculate next
          let sessionNumber = 1;

          if (context.sessionId) {
            // Fetch the existing session to get its session_number
            try {
              const sessionResponse = await fetch(
                `/api/training-session/${context.sessionId}`
              );
              if (sessionResponse.ok) {
                const existingSession = await sessionResponse.json();
                sessionNumber = existingSession.session_number || 1;
                console.log('Using existing session number:', sessionNumber, 'for session:', context.sessionId);
              }
            } catch (error) {
              console.error('Failed to fetch existing session:', error);
            }
          } else {
            // No existing session, calculate next session number
            const existingSessionsResponse = await fetch(
              `/api/training-session/day/${trainingDayId}`
            );

            if (existingSessionsResponse.ok) {
              const existingSessions = await existingSessionsResponse.json();
              // Find the highest session_number and add 1
              const completedSessions = existingSessions.filter(
                (s: any) => s.status === 'completed'
              );
              if (completedSessions.length > 0) {
                sessionNumber =
                  Math.max(
                    ...completedSessions.map((s: any) => s.session_number)
                  ) + 1;
                console.log('Calculated next session number:', sessionNumber, 'from', completedSessions.length, 'completed sessions');
              } else {
                console.log('No completed sessions found, using session number 1');
              }
            }
          }

          const response = await fetch(
            `/api/training-day/${trainingDayId}/finish`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                session_id: context.sessionId, // Pass the ID so it updates instead of creates new
                session_number: sessionNumber,
                message_thread_id: context.messageThreadId,
                start_time: startTime.toISOString(),
                exercises: exerciseResults,
                session_summary: sessionSummary,
                agent_prompt: context.workoutAgentContext,
                operational_cost: context.costTracking.totalCost
              })
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to finish training session:', errorData);
            throw new Error('Failed to finish training session');
          }

          const { trainingSession } = await response.json();

          return {
            trainingSessionId: trainingSession.id,
            sessionSummary,
            exercises: exerciseResults
          };
        } else {
          // Old workout format (keep for backward compatibility)
          const exercises: {
            exercise_id: string;
            sets_completed: {
              weight: number;
              reps: number;
              completed_at: string;
            }[];
          }[] = [];
          let totalExercisesCompleted = 0;
          let totalVolume = 0;

          for (const group of finalWorkoutData) {
            for (const exercise of group.exercises) {
              if (exercise.completedSet !== null) {
                totalExercisesCompleted++;

                const exerciseVolume =
                  exercise.completedSet.weight * exercise.completedSet.reps;
                totalVolume += exerciseVolume;

                const foundExercise = exercises.find(
                  (e) => e.exercise_id === exercise.id
                );

                if (foundExercise) {
                  foundExercise.sets_completed.push({
                    weight: exercise.completedSet.weight,
                    reps: exercise.completedSet.reps,
                    completed_at:
                      exercise.completedSet.completedAt.toISOString()
                  });
                } else {
                  exercises.push({
                    exercise_id: exercise.id,
                    sets_completed: [
                      {
                        weight: exercise.completedSet.weight,
                        reps: exercise.completedSet.reps,
                        completed_at:
                          exercise.completedSet.completedAt.toISOString()
                      }
                    ]
                  });
                }
              }
            }
          }

          const sessionSummary = {
            total_duration_minutes: totalDurationMinutes,
            exercises_completed: totalExercisesCompleted,
            total_volume: totalVolume
          };

          const response = await fetch('/api/workout-coach/session/finish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              workoutId: input.workoutId,
              messageThreadId: context.messageThreadId,
              startTime: startTime.toISOString(),
              exercises,
              sessionSummary,
              agentPrompt: context.workoutAgentContext,
              operationalCost: context.costTracking.totalCost
            })
          });

          if (!response.ok) {
            throw new Error('Failed to finish workout');
          }

          const { workoutSession } = await response.json();

          return {
            workoutSessionId: workoutSession.id,
            sessionSummary,
            exercises
          };
        }
      }
    )
  }
}).createMachine({
  id: 'workout',
  initial: 'not_started',
  context: {
    workoutState: {
      currentGroup: 0,
      currentExerciseIndex: 0,
      status: WorkoutStatus.NOT_STARTED,
      restTimeRemaining: 0,
      isResting: false
    },
    workoutData: [],
    messageThreadId: '',
    costTracking: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0
    },
    isLoadingWorkout: true,
    isExerciseVideoShownOnMobile: false,
    workoutAgentContext: ''
  },
  on: {
    'event.load_workout': {
      target: '#workout.loading_workout'
    },
    'event.load_training_day': {
      target: '#workout.loading_training_day'
    }
  },
  states: {
    not_started: {
      on: {
        'event.start': {
          target: '#workout.starting_workout'
        },
        'event.adapt_workout': {
          target: '#workout.adapting_workout',
          actions: assign({
            adaptReturnState: 'not_started'
          })
        },
        'event.show_exercise_video': {
          actions: assign({
            isExerciseVideoShownOnMobile: true
          })
        },
        'event.hide_exercise_video': {
          actions: assign({
            isExerciseVideoShownOnMobile: false
          })
        }
      }
    },
    prompting_resume: {
      on: {
        'event.resume_workout': [
          {
            target: '#workout.resting',
            guard: ({ context }) => {
              return context.snapshotData?.workoutState?.isResting === true;
            },
            actions: assign(({ context }) => {
              // Restore state from snapshot
              if (!context.snapshotData) return {};

              // Need to ensure date strings are converted back to Date objects
              const restoredData = context.snapshotData.workoutData.map(
                (group: any) => ({
                  ...group,
                  exercises: group.exercises.map((ex: any) => ({
                    ...ex,
                    completedSet: ex.completedSet
                      ? {
                          ...ex.completedSet,
                          completedAt: new Date(ex.completedSet.completedAt)
                        }
                      : null
                  }))
                })
              );

              return {
                workoutData: restoredData,
                workoutState: {
                  ...context.snapshotData.workoutState,
                  status: WorkoutStatus.IN_PROGRESS
                },
                messageThreadId:
                  context.snapshotData.messageThreadId || context.messageThreadId,
                costTracking:
                  context.snapshotData.costTracking || context.costTracking,
                startDate: new Date()
              };
            })
          },
          {
            target: '#workout.in_progress',
            actions: assign(({ context }) => {
              // Restore state from snapshot
              if (!context.snapshotData) return {};

              // Need to ensure date strings are converted back to Date objects
              const restoredData = context.snapshotData.workoutData.map(
                (group: any) => ({
                  ...group,
                  exercises: group.exercises.map((ex: any) => ({
                    ...ex,
                    completedSet: ex.completedSet
                      ? {
                          ...ex.completedSet,
                          completedAt: new Date(ex.completedSet.completedAt)
                        }
                      : null
                  }))
                })
              );

              return {
                workoutData: restoredData,
                workoutState: {
                  ...context.snapshotData.workoutState,
                  status: WorkoutStatus.IN_PROGRESS
                },
                messageThreadId:
                  context.snapshotData.messageThreadId || context.messageThreadId,
                costTracking:
                  context.snapshotData.costTracking || context.costTracking,
                startDate: new Date()
              };
            })
          }
        ],
        'event.start_fresh': {
          target: '#workout.starting_workout',
          actions: assign({
            sessionId: undefined, // Clear old session
            snapshotData: null
          })
        }
      }
    },
    in_progress: {
      entry: ['saveSnapshot'],
      on: {
        'event.pause': {
          target: '#workout.pausing_workout',
          actions: ['saveSnapshot']
        },
        'event.resume': {
          target: '#workout.resuming_workout',
          actions: ['saveSnapshot']
        },
        'event.next_set': {
          target: '#workout.next_set',
          actions: ['saveProgress']
        },
        'event.previous_set': {
          target: '#workout.previous_set'
        },
        'event.go_to_exercise': {
          target: '#workout.go_to_exercise'
        },
        'event.go_to_group': {
          target: '#workout.go_to_group'
        },
        'event.finish_workout': {
          target: '#workout.finishing_workout'
        },
        'event.adapt_workout': {
          target: '#workout.adapting_workout',
          actions: assign({
            adaptReturnState: 'in_progress'
          })
        },
        'event.show_exercise_video': {
          actions: assign({
            isExerciseVideoShownOnMobile: true
          })
        },
        'event.hide_exercise_video': {
          actions: assign({
            isExerciseVideoShownOnMobile: false
          })
        },
        'event.add_tokens': {
          actions: [
            assign(({ context, event }) => {
              if (event.type !== 'event.add_tokens') {
                return {};
              }
              return {
                costTracking: {
                  totalInputTokens:
                    context.costTracking.totalInputTokens + event.inputTokens,
                  totalOutputTokens:
                    context.costTracking.totalOutputTokens + event.outputTokens,
                  totalCost:
                    context.costTracking.totalCost +
                    event.inputTokens * 0.00001 +
                    event.outputTokens * 0.00002
                }
              };
            }),
            'saveSnapshot'
          ]
        },
        'event.update_rest_timer': {
          actions: assign(({ context, event }) => {
            if (event.type !== 'event.update_rest_timer') {
              return {};
            }
            return {
              workoutState: {
                ...context.workoutState,
                restTimeRemaining: event.restTimeRemaining
              }
            };
          })
        },
        'event.skip_rest': {
          target: '#workout.skipping_rest',
          guard: ({ context }) => context.workoutState.isResting
        }
      }
    },
    resting: {
      entry: ['saveSnapshot'],
      on: {
        'event.pause': {
          target: '#workout.pausing_workout'
        },
        'event.skip_rest': {
          target: '#workout.skipping_rest'
        },
        'event.rest_complete': {
          target: '#workout.in_progress',
          actions: assign(({ context }) => ({
            workoutState: {
              ...context.workoutState,
              isResting: false,
              restTimeRemaining: 0
            }
          }))
        },
        'event.adapt_workout': {
          target: '#workout.adapting_workout',
          actions: assign({
            adaptReturnState: 'resting'
          })
        },
        'event.show_exercise_video': {
          actions: assign({
            isExerciseVideoShownOnMobile: true
          })
        },
        'event.hide_exercise_video': {
          actions: assign({
            isExerciseVideoShownOnMobile: false
          })
        },
        'event.add_tokens': {
          actions: [
            assign(({ context, event }) => {
              if (event.type !== 'event.add_tokens') {
                return {};
              }
              return {
                costTracking: {
                  totalInputTokens:
                    context.costTracking.totalInputTokens + event.inputTokens,
                  totalOutputTokens:
                    context.costTracking.totalOutputTokens + event.outputTokens,
                  totalCost:
                    context.costTracking.totalCost +
                    event.inputTokens * 0.00001 +
                    event.outputTokens * 0.00002
                }
              };
            }),
            'saveSnapshot'
          ]
        },
        'event.update_rest_timer': {
          actions: assign(({ context, event }) => {
            if (event.type !== 'event.update_rest_timer') {
              return {};
            }
            return {
              workoutState: {
                ...context.workoutState,
                restTimeRemaining: event.restTimeRemaining
              }
            };
          })
        }
      }
    },
    loading_workout: {
      entry: assign({
        isLoadingWorkout: true
      }),
      invoke: {
        src: 'loadWorkoutActor',
        input: ({ event }) => {
          if (event.type !== 'event.load_workout') {
            throw new Error('Invalid event type');
          }
          return {
            workoutId: event.workoutId
          };
        },
        onDone: {
          target: '#workout.not_started',
          actions: assign(({ event }) => ({
            workoutData: event.output.workoutData as ExerciseGroup[],
            workoutAgentContext: event.output.workoutAgentContext,
            messageThreadId: event.output.messageThreadId,
            workoutId: event.output.workoutId,
            isLoadingWorkout: false
          }))
        },
        onError: {
          target: '#workout.not_started',
          actions: assign({
            isLoadingWorkout: false
          })
        }
      }
    },
    loading_training_day: {
      entry: assign({
        isLoadingWorkout: true
      }),
      invoke: {
        src: 'loadTrainingDayActor',
        input: ({ event }) => {
          if (event.type !== 'event.load_training_day') {
            throw new Error('Invalid event type');
          }
          return {
            trainingDayId: event.trainingDayId
          };
        },
        onDone: [
          // If snapshot data exists, go to prompt
          {
            target: '#workout.prompting_resume',
            guard: ({ event }) => !!event.output.snapshotData,
            actions: assign(({ event }) => ({
              workoutData: event.output.workoutData as ExerciseGroup[],
              workoutAgentContext: event.output.workoutAgentContext,
              messageThreadId: event.output.messageThreadId,
              trainingDayId: event.output.trainingDayId,
              programId: event.output.programId,
              sessionId: event.output.sessionId,
              nextSessionNumber: event.output.nextSessionNumber,
              snapshotData: event.output.snapshotData,
              isLoadingWorkout: false
            }))
          },
          // Else go to not_started
          {
            target: '#workout.not_started',
            actions: assign(({ event }) => ({
              workoutData: event.output.workoutData as ExerciseGroup[],
              workoutAgentContext: event.output.workoutAgentContext,
              messageThreadId: event.output.messageThreadId,
              trainingDayId: event.output.trainingDayId,
              programId: event.output.programId,
              nextSessionNumber: event.output.nextSessionNumber,
              isLoadingWorkout: false
            }))
          }
        ],
        onError: {
          target: '#workout.not_started',
          actions: assign({
            isLoadingWorkout: false
          })
        }
      }
    },
    starting_workout: {
      invoke: {
        src: 'startSessionActor',
        input: ({ context }) => ({
          trainingDayId: context.trainingDayId!,
          programId: context.programId,
          session_number: context.nextSessionNumber
        }),
        onDone: {
          target: '#workout.in_progress',
          actions: assign(({ context, event }) => ({
            workoutState: {
              ...context.workoutState,
              status: WorkoutStatus.IN_PROGRESS
            },
            startDate: new Date(),
            sessionId: event.output.sessionId
          }))
        },
        onError: {
          target: '#workout.in_progress',
          actions: assign(({ context }) => ({
            workoutState: {
              ...context.workoutState,
              status: WorkoutStatus.IN_PROGRESS
            },
            startDate: new Date()
          }))
        }
      }
    },
    pausing_workout: {
      always: {
        target: '#workout.in_progress',
        actions: assign(({ context }) => ({
          workoutState: {
            ...context.workoutState,
            status: WorkoutStatus.PAUSED
          }
        }))
      }
    },
    resuming_workout: {
      always: {
        target: '#workout.in_progress',
        actions: assign(({ context }) => ({
          workoutState: {
            ...context.workoutState,
            status: WorkoutStatus.IN_PROGRESS
          }
        }))
      }
    },
    next_set: {
      invoke: {
        src: 'nextSetActor',
        input: ({ context }) => ({ context }),
        onDone: [
          {
            target: '#workout.in_progress',
            guard: ({ event }) => !event.output.workoutState.isResting,
            actions: [
              assign(({ event, context }) => {
                // Save progress immediately after set completion
                if (context.sessionId) {
                  // Fire and forget - extract completed exercises
                  const completedExercises = event.output.workoutData.flatMap((group: any) =>
                    group.exercises
                      .filter((ex: any) => ex.completedSet)
                      .map((ex: any) => ({
                        training_exercise_id: ex.id,
                        sets_completed: [
                          {
                            set_number: ex.setNumber || 1,
                            reps: ex.completedSet?.reps || 0,
                            weight: ex.completedSet?.weight || 0,
                            completed_at: ex.completedSet?.completedAt?.toISOString() || new Date().toISOString()
                          }
                        ]
                      }))
                  );
                  
                  fetch(`/api/training-session/${context.sessionId}/progress`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      workout_data: {
                        workoutState: event.output.workoutState,
                        workoutData: event.output.workoutData
                      },
                      results: {
                        exercises: completedExercises,
                        session_summary: {
                          exercises_completed: completedExercises.length
                        }
                      },
                      last_activity_time: new Date().toISOString()
                    })
                  }).catch((err) => {
                    console.error('Progress save failed on next_set', err);
                  });
                }
                
                return {
                  workoutState: event.output.workoutState,
                  workoutData: event.output.workoutData
                };
              })
            ]
          },
          {
            target: '#workout.resting',
            actions: [
              assign(({ event, context }) => {
                // Save progress immediately after set completion
                if (context.sessionId) {
                  // Fire and forget - extract completed exercises
                  const completedExercises = event.output.workoutData.flatMap((group: any) =>
                    group.exercises
                      .filter((ex: any) => ex.completedSet)
                      .map((ex: any) => ({
                        training_exercise_id: ex.id,
                        sets_completed: [
                          {
                            set_number: ex.setNumber || 1,
                            reps: ex.completedSet?.reps || 0,
                            weight: ex.completedSet?.weight || 0,
                            completed_at: ex.completedSet?.completedAt?.toISOString() || new Date().toISOString()
                          }
                        ]
                      }))
                  );
                  
                  fetch(`/api/training-session/${context.sessionId}/progress`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      workout_data: {
                        workoutState: event.output.workoutState,
                        workoutData: event.output.workoutData
                      },
                      results: {
                        exercises: completedExercises,
                        session_summary: {
                          exercises_completed: completedExercises.length
                        }
                      },
                      last_activity_time: new Date().toISOString()
                    })
                  }).catch((err) => {
                    console.error('Progress save failed on next_set', err);
                  });
                }
                
                return {
                  workoutState: event.output.workoutState,
                  workoutData: event.output.workoutData
                };
              })
            ]
          }
        ]
      }
    },
    previous_set: {
      invoke: {
        src: 'previousSetActor',
        input: ({ context }) => ({ context }),
        onDone: {
          target: '#workout.in_progress',
          actions: assign(({ event }) => ({
            workoutState: event.output.workoutState,
            workoutData: event.output.workoutData
          }))
        }
      }
    },
    go_to_exercise: {
      invoke: {
        src: 'goToExerciseActor',
        input: ({ context, event }) => {
          if (event.type !== 'event.go_to_exercise') {
            throw new Error('Invalid event type');
          }
          return {
            exerciseId: event.exerciseId,
            context
          };
        },
        onDone: {
          target: '#workout.in_progress',
          actions: assign(({ event }) => ({
            workoutState: event.output.workoutState,
            workoutData: event.output.workoutData
          }))
        },
        onError: {
          target: '#workout.in_progress'
        }
      }
    },
    go_to_group: {
      invoke: {
        src: 'goToGroupActor',
        input: ({ context, event }) => {
          if (event.type !== 'event.go_to_group') {
            throw new Error('Invalid event type');
          }
          return { context, groupId: event.groupId };
        },
        onDone: {
          target: '#workout.in_progress',
          actions: assign(({ event }) => ({
            workoutState: event.output.workoutState,
            workoutData: event.output.workoutData
          }))
        },
        onError: {
          target: '#workout.in_progress'
        }
      }
    },
    skipping_rest: {
      always: {
        target: '#workout.in_progress',
        actions: assign(({ context }) => ({
          workoutState: {
            ...context.workoutState,
            isResting: false,
            restTimeRemaining: 0
          }
        }))
      }
    },
    adapting_workout: {
      invoke: {
        src: 'adaptWorkoutActor',
        input: ({ context, event }) => {
          if (event.type !== 'event.adapt_workout') {
            throw new Error('Invalid event type');
          }
          return { context, exercises: event.exercises };
        },
        onDone: [
          {
            target: '#workout.not_started',
            guard: ({ context }) => context.adaptReturnState === 'not_started',
            actions: assign(({ event }) => ({
              workoutData: event.output.workoutData,
              workoutState: event.output.workoutState,
              adaptReturnState: undefined
            }))
          },
          {
            target: '#workout.resting',
            guard: ({ context }) => context.adaptReturnState === 'resting',
            actions: assign(({ event }) => ({
              workoutData: event.output.workoutData,
              workoutState: event.output.workoutState,
              adaptReturnState: undefined
            }))
          },
          {
            target: '#workout.in_progress',
            actions: assign(({ event }) => ({
              workoutData: event.output.workoutData,
              workoutState: event.output.workoutState,
              adaptReturnState: undefined
            }))
          }
        ],
        onError: [
          {
            target: '#workout.not_started',
            guard: ({ context }) => context.adaptReturnState === 'not_started',
            actions: assign({
              adaptReturnState: undefined
            })
          },
          {
            target: '#workout.resting',
            guard: ({ context }) => context.adaptReturnState === 'resting',
            actions: assign({
              adaptReturnState: undefined
            })
          },
          {
            target: '#workout.in_progress',
            actions: assign({
              adaptReturnState: undefined
            })
          }
        ]
      }
    },
    finishing_workout: {
      invoke: {
        src: 'finishWorkoutActor',
        input: ({ context }) => ({
          context,
          workoutId: context.workoutId,
          trainingDayId: context.trainingDayId
        }),
        onDone: {
          target: '#workout.finished',
          actions: assign(({ context, event }) => ({
            finishResults: event.output,
            workoutState: {
              ...context.workoutState,
              status: WorkoutStatus.COMPLETED
            }
          }))
        },
        onError: {
          target: '#workout.in_progress'
        }
      }
    },
    finished: {
      type: 'final'
    }
  }
});

export const WorkoutMachineContext = createActorContext(workoutMachine);
