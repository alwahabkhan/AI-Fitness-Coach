import { TrainingExerciseWithDetails } from '@/database/program-builder.types';
import { Exercise } from '../PLACEHOLDER';
import { formatWeight } from '@/lib/utils';

// Group colors for visual organization
const GROUP_COLORS = [
  '#036FE3',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#84CC16',
  '#F97316'
];

export function getGroupColor(groupNumber: number): string {
  return GROUP_COLORS[(groupNumber - 1) % GROUP_COLORS.length];
}

export function formatProgress(
  sets: number,
  reps: number,
  weight: number
): string {
  return `${sets}x${reps}@${formatWeight(weight)}`;
}

// @note Temporary, link with Workout player in future sessions
export function calculateEstimatedMinutes(exerciseCount: number): number {
  // Rough estimate: 3-4 minutes per exercise
  return Math.max(exerciseCount * 3.5, 15);
}

export function transformExerciseForUI(
  trainingExercise: TrainingExerciseWithDetails
): Exercise {
  const groupColor = getGroupColor(trainingExercise.group_number || 1);

  const displayReps = trainingExercise.reps?.[0] ?? 0;
  const displayWeight = trainingExercise.weights?.[0] ?? 0;
  const sets = trainingExercise.sets || 3;
  const repsProgression = trainingExercise.reps_progression ?? 0;
  const weightProgression = trainingExercise.weight_progression ?? 0;

  // Calculate next session values
  // For the template/initial view, "current" is session 1 (base values)
  // "next" shows session 2 values (1 progression applied)
  const baseReps = trainingExercise.reps || [displayReps];
  // Session 2's progression count is 1 (sessionNumber - 1 = 2 - 1 = 1)
  const nextReps = calculateNextRepsForDisplay(
    baseReps,
    1, // This is correct - it's the progression count for session 2
    trainingExercise.r_plus_option || 1,
    repsProgression
  );
  const nextDisplayReps = nextReps[0];
  // Weight for session 2: base + (1 * weightProgression)
  const nextWeight = displayWeight + weightProgression;

  return {
    id: trainingExercise.id,
    name: trainingExercise.exercise.name,
    sets,
    rest: trainingExercise.rest_seconds ?? 60,
    repsProgression,
    weightProgression: trainingExercise.weight_progression ?? 0,
    reps: trainingExercise.reps || [displayReps], // CHANGED: Store full array
    weight: trainingExercise.weights || [displayWeight], // CHANGED: Store full array
    lastSession: 'Not Found',
    progress: {
      current: formatProgress(sets, displayReps, displayWeight),
      next: formatProgress(sets, nextDisplayReps, nextWeight)
    },
    videoUrl: trainingExercise.exercise.video_url || undefined,
    notes: trainingExercise.notes || undefined,
    groupNumber: trainingExercise.group_number || 1,
    groupColor
  };
}

function calculateNextRepsForDisplay(
  baseReps: number[],
  sessionNumber: number,
  rPlusOption: number,
  repsProgression: number
): number[] {
  if (sessionNumber === 0) return [...baseReps];

  let result = [...baseReps];

  switch (rPlusOption) {
    case 1:
      result = result.map((r) => r + sessionNumber * repsProgression);
      return result;

    case 2:
      for (let session = 1; session <= sessionNumber; session++) {
        const minValue = Math.min(...result);
        const minIndex = result.indexOf(minValue);
        result[minIndex] += repsProgression;
      }
      return result;

    case 3:
      for (let session = 1; session <= sessionNumber; session++) {
        const indexed = result.map((val, idx) => ({ val, idx }));
        indexed.sort((a, b) => {
          if (a.val !== b.val) return a.val - b.val;
          return a.idx - b.idx;
        });
        // Increment the weakest set(s) by repsProgression
        if (indexed.length >= 2) {
          // If we have at least 2 sets, increment the two weakest
        result[indexed[0].idx] += repsProgression;
        result[indexed[1].idx] += repsProgression;
        } else if (indexed.length === 1) {
          // If we only have 1 set, increment just that one
          result[indexed[0].idx] += repsProgression;
        }
      }
      return result;

    default:
      result = result.map((r) => r + sessionNumber * repsProgression);
      return result;
  }
}
