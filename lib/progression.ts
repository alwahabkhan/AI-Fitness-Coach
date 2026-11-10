import { createServerSupabase } from './supabase';

interface SetResult {
  set_number: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed_at: string;
  notes?: string;
}

interface ExerciseResult {
  training_exercise_id: string;
  sets_completed: SetResult[];
}

interface SessionResults {
  exercises: ExerciseResult[];
  session_summary: {
    total_duration_minutes: number;
    exercises_completed: number;
  };
}

interface ProgressedExercise {
  id: string;
  sets: number;
  session_reps: number[];
  session_weights: number[];
  reps_progression: number;
  weight_progression: number;
}

function calculateNextReps(
  baseReps: number[],
  sessionNumber: number,
  rPlusOption: number,
  repsProgression: number
): number[] {
  if (sessionNumber === 0) return [...baseReps];

  let result = [...baseReps];

  console.log(
    `Starting calculation - Base reps: [${baseReps}], Session: ${sessionNumber}, Option: ${rPlusOption}, R+: ${repsProgression}`
  );

  switch (rPlusOption) {
    case 1: {
      // Add repsProgression to all sets per session
      result = result.map((r) => r + sessionNumber * repsProgression);
      console.log(`Option 1 result: [${result}]`);
      return result;
    }

    case 2: {
      // Add repsProgression to the weakest set only, once per session
      for (let session = 1; session <= sessionNumber; session++) {
        // Find the minimum value
        const minValue = Math.min(...result);
        // Find the first index with that minimum value
        const minIndex = result.indexOf(minValue);
        // Increment it by repsProgression
        result[minIndex] += repsProgression;
        console.log(`Option 2 - Session ${session}: [${result}]`);
      }
      return result;
    }

    case 3: {
      // Add repsProgression to the TWO weakest sets, per session
      for (let session = 1; session <= sessionNumber; session++) {
        // Create array of {value, originalIndex} pairs
        const indexed = result.map((val, idx) => ({ val, idx }));

        // Sort by value (ascending) to find the two weakest
        indexed.sort((a, b) => {
          if (a.val !== b.val) return a.val - b.val;
          return a.idx - b.idx; // If tied, prefer earlier index
        });

        // Increment the weakest set(s) by repsProgression
        if (indexed.length >= 2) {
          // If we have at least 2 sets, increment the two weakest
        result[indexed[0].idx] += repsProgression;
        result[indexed[1].idx] += repsProgression;
        console.log(
          `Option 3 - Session ${session}: [${result}] (incremented indices ${indexed[0].idx} and ${indexed[1].idx})`
        );
        } else if (indexed.length === 1) {
          // If we only have 1 set, increment just that one
          result[indexed[0].idx] += repsProgression;
          console.log(
            `Option 3 - Session ${session}: [${result}] (incremented index ${indexed[0].idx}, only one set available)`
          );
        }
      }
      return result;
    }

    default: {
      // Default to option 1 if invalid option provided
      console.warn(
        `Invalid r_plus_option: ${rPlusOption}, defaulting to option 1`
      );
      result = result.map((r) => r + sessionNumber * repsProgression);
      return result;
    }
  }
}

export async function calculateExerciseProgression(
  trainingDayId: string,
  sessionNumber: number
): Promise<ProgressedExercise[]> {
  const supabase = createServerSupabase();

  // Get the training exercises for this day
  const { data: trainingExercises, error: exerciseError } = await supabase
    .from('training_exercise')
    .select(
      `
      *,
      exercise:exercise_id(*)
    `
    )
    .eq('training_day_id', trainingDayId)
    .order('exercise_order');

  if (exerciseError) throw exerciseError;

  // Progression count is sessionNumber - 1 because:
  // - Session 1 (first session): 0 progressions (base values)
  // - Session 2 (after 1 completed): 1 progression
  // - Session N: N-1 progressions
  const progressionCount = Math.max(0, sessionNumber - 1);

  const progressedExercises = trainingExercises.map((exercise) => {
    const baseReps = exercise.reps || [];
    const baseWeights = exercise.weights || [];
    const repsProgression = exercise.reps_progression || 0;
    const weightProgression = exercise.weight_progression || 0;
    const rPlusOption = exercise.r_plus_option || 1;

    console.log(
      `Exercise: ${exercise.exercise?.name}, r_plus_option from DB: ${rPlusOption}, progressionCount: ${progressionCount}`
    );

    // Calculate reps using the selected R+ option
    // Use progressionCount (sessionNumber - 1) instead of sessionNumber
    const sessionReps = calculateNextReps(
      baseReps,
      progressionCount,
      rPlusOption,
      repsProgression
    );

    // Weight progression also uses progressionCount
    const sessionWeights = baseWeights.map(
      (weight) => weight + weightProgression * progressionCount
    );

    return {
      id: exercise.id,
      sets: exercise.sets || 3,
      session_reps: sessionReps,
      session_weights: sessionWeights,
      reps_progression: repsProgression,
      weight_progression: weightProgression
    };
  });

  return progressedExercises;
}

export function buildSessionResults(
  exercises: ProgressedExercise[],
  startTime: Date
): SessionResults {
  const exerciseResults: ExerciseResult[] = exercises.map((ex) => {
    const sets_completed: SetResult[] = [];

    for (let i = 0; i < ex.sets; i++) {
      sets_completed.push({
        set_number: i + 1,
        reps: ex.session_reps[i] || 10,
        weight: ex.session_weights[i] || 20,
        rpe: 7, // Default RPE
        completed_at: new Date(
          startTime.getTime() + i * 3 * 60 * 1000
        ).toISOString(), // 3 mins per set
        notes: ''
      });
    }

    return {
      training_exercise_id: ex.id,
      sets_completed
    };
  });

  return {
    exercises: exerciseResults,
    session_summary: {
      total_duration_minutes: Math.max(exercises.length * 10, 15), // ~10 mins per exercise
      exercises_completed: exercises.length
    }
  };
}
