import { Database } from '@/database/database.types';
import {
  CompletedSet,
  Exercise,
  ExerciseGroup,
  WorkoutState,
  WorkoutStatus
} from '@/types/workout';

export const getExerciseStatus = (
  workoutState: WorkoutState,
  exercise: Exercise,
  groupIndex: number,
  exerciseIndex: number
) => {
  const isCurrentGroup = workoutState.currentGroup === groupIndex;
  const isCurrentExercise = workoutState.currentExerciseIndex === exerciseIndex;
  const isActive =
    workoutState.status === WorkoutStatus.IN_PROGRESS &&
    isCurrentGroup &&
    isCurrentExercise;
  const isCompleted = exercise.completedSet !== null;
  const isUpcoming =
    groupIndex + 1 > workoutState.currentGroup ||
    (groupIndex + 1 === workoutState.currentGroup &&
      exerciseIndex > workoutState.currentExerciseIndex);

  if (isCompleted) return 'completed';
  if (isActive) return 'active';
  if (isUpcoming) return 'upcoming';
  return 'completed';
};

export const getGroupStatus = (
  workoutState: WorkoutState,
  group: ExerciseGroup,
  groupIndex: number
) => {
  const isCurrentGroup = workoutState.currentGroup === groupIndex;
  const isCompleted = group.exercises.every(
    (exercise) => exercise.completedSet !== null
  );
  const isActive =
    workoutState.status === WorkoutStatus.IN_PROGRESS && isCurrentGroup;

  if (isCompleted) return 'completed';
  if (isActive) return 'active';
  if (groupIndex + 1 > workoutState.currentGroup) return 'upcoming';
  return 'completed';
};

export const addCompletedSetToExercise = (
  workoutData: ExerciseGroup[],
  groupIndex: number,
  exerciseIndex: number
) => {
  const newWorkoutData = workoutData.slice();

  return newWorkoutData.map((group, index) => {
    if (index !== groupIndex) return group;

    const newExercises = group.exercises.map((exercise, loopExerciseIndex) => {
      if (loopExerciseIndex !== exerciseIndex) return exercise;

      if (exercise.completedSet !== null) return exercise;

      const newCompletedSet: CompletedSet = {
        weight: exercise.weight,
        reps: exercise.reps,
        completedAt: new Date()
      };

      const newExercise = { ...exercise, completedSet: newCompletedSet };
      return newExercise;
    });

    const newGroup = { ...group, exercises: newExercises };
    return newGroup;
  });
};

export const removeCompletedSetFromExercise = (
  workoutData: ExerciseGroup[],
  groupIndex: number,
  exerciseIndex: number
) => {
  const newWorkoutData = workoutData.slice();

  return newWorkoutData.map((group, index) => {
    if (index !== groupIndex) return group;

    const newExercises = group.exercises.map((exercise, loopExerciseIndex) => {
      if (loopExerciseIndex !== exerciseIndex) return exercise;

      const newExercise = { ...exercise, completedSet: null };
      return newExercise;
    });

    const newGroup = { ...group, exercises: newExercises };
    return newGroup;
  });
};

export const getShouldFinishWorkout = (workoutData: ExerciseGroup[]) => {
  let totalSets = 0;
  let totalCompletedSets = 0;

  for (const group of workoutData) {
    for (const exercise of group.exercises) {
      if (exercise.reps > 0) {
        totalSets += 1;
        totalCompletedSets += exercise.completedSet ? 1 : 0;
      }
    }
  }

  return totalCompletedSets >= totalSets - 1;
};

export const mapFetchedWorkoutToExerciseGroup = (
  exercises: Database['public']['Tables']['exercise']['Row'][]
): ExerciseGroup[] => {
  // Sort exercises by group, then by order
  const sortedExercises = [...exercises].sort((a, b) => {
    if (a.group !== b.group) return a.group - b.group;
    return a.order - b.order;
  });

  const exerciseGroups: ExerciseGroup[] = [];

  // Group exercises by group number first
  const exercisesByGroup: Map<number, typeof sortedExercises> = new Map();
  for (const ex of sortedExercises) {
    if (!exercisesByGroup.has(ex.group)) {
      exercisesByGroup.set(ex.group, []);
    }
    exercisesByGroup.get(ex.group)!.push(ex);
  }

  // Process each group
  for (const [groupNumber, groupExercises] of exercisesByGroup) {
    // Parse execution_meta for all exercises to determine max sets
    const exercisesWithMeta = groupExercises.map((ex) => {
      type ExecutionMeta = {
        sets?: number;
        reps?: number;
        weight?: number;
        rest_seconds?: number;
      };
      const meta: ExecutionMeta =
        typeof ex.execution_meta === 'object' && ex.execution_meta !== null
          ? (ex.execution_meta as ExecutionMeta)
          : {};
      const sets = typeof meta.sets === 'number' ? meta.sets : 3;
      const reps = typeof meta.reps === 'number' ? meta.reps : 10;
      const weight = typeof meta.weight === 'number' ? meta.weight : 0;
      const restSeconds =
        typeof meta.rest_seconds === 'number' ? meta.rest_seconds : 0;

      return {
        ...ex,
        parsedSets: sets,
        parsedReps: reps,
        parsedWeight: weight,
        parsedRestSeconds: restSeconds
      };
    });

    // Find the maximum number of sets in this group
    const maxSets = Math.max(...exercisesWithMeta.map((ex) => ex.parsedSets));

    // Create the group
    const group: ExerciseGroup = {
      group: groupNumber,
      id: groupExercises[0].id, // Use first exercise's id as group id
      exercises: [],
      sets: maxSets
    };

    // Create exercise records in interleaved order (set 1 for all exercises, then set 2 for all exercises, etc.)
    for (let setNumber = 1; setNumber <= maxSets; setNumber++) {
      for (const ex of exercisesWithMeta) {
        // Only add this set if the exercise has this many sets
        if (setNumber <= ex.parsedSets) {
          const exerciseRecord: Exercise = {
            id: `${ex.id}`,
            name: ex.name,
            videoUrl: ex.video_url || '',
            reps: ex.parsedReps,
            setNumber,
            weight: ex.parsedWeight,
            restSeconds: ex.parsedRestSeconds,
            completedSet: null,
            agentContext: ex.agent_context || '',
            sets: ex.parsedSets
          };

          group.exercises.push(exerciseRecord);
        }
      }
    }

    exerciseGroups.push(group);
  }

  return exerciseGroups;
};
