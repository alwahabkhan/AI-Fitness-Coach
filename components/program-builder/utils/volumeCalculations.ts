// components/program-builder/utils/volumeCalculations.ts
import {
  TrainingDayWithExercises,
  TrainingExerciseWithDetails
} from '@/database/program-builder.types';

interface MuscleGroupVolume {
  name: string;
  totalPerWeek: number;
  color: string;
  dailyVolumes: number[];
  total: number;
}

interface DayVolumeData {
  [muscleGroup: string]: number;
}

export function calculateVolumeData(
  trainingDays: TrainingDayWithExercises[],
  sessionsPerWeek: number
): MuscleGroupVolume[] {
  console.log(trainingDays);
  // Step 1: Calculate volume for each day
  const dailyVolumes: DayVolumeData[] = trainingDays.map((day) =>
    calculateDayVolume(day.training_exercises || [])
  );

  // Step 2: Collect all unique muscle groups across all days
  const allMuscleGroups = new Set<string>();
  dailyVolumes.forEach((dayData) => {
    Object.keys(dayData).forEach((muscle) => allMuscleGroups.add(muscle));
  });

  console.log(allMuscleGroups);

  // Step 3: Calculate totals for each muscle group
  const volumeData: MuscleGroupVolume[] = Array.from(allMuscleGroups)
    .sort()
    .map((muscleName) => {
      // Get volume for this muscle on each day
      const volumes = trainingDays.map((_, dayIndex) => {
        return dailyVolumes[dayIndex]?.[muscleName] || 0;
      });

      // Sum up all days
      const totalPerWeek = volumes.reduce((sum, vol) => sum + vol, 0);

      // Apply sessions per week multiplier
      const multipliedTotal = totalPerWeek * sessionsPerWeek;

      return {
        name: formatMuscleName(muscleName),
        dailyVolumes: volumes,
        totalPerWeek: multipliedTotal,
        total: multipliedTotal,
        color: getVolumeColor(multipliedTotal)
      };
    });

  return volumeData;
}

function calculateDayVolume(
  exercises: TrainingExerciseWithDetails[]
): DayVolumeData {
  const dayVolume: DayVolumeData = {};

  exercises.forEach((exercise) => {
    const sets = exercise.sets || 0;
    const mainMuscle = exercise.exercise.main_muscle;
    const ratios = exercise.exercise.ratios as Record<string, number> | null;

    if (!mainMuscle || sets === 0) return;

    // Add secondary muscle volumes (ratio per set)
    if (ratios && typeof ratios === 'object') {
      Object.entries(ratios).forEach(([muscle, ratio]) => {
        if (typeof ratio === 'number' && ratio > 0) {
          dayVolume[muscle] = (dayVolume[muscle] || 0) + sets * ratio;
        }
      });
    }
  });

  return dayVolume;
}

function formatMuscleName(rawName: string): string {
  // Convert "Back1" to "Back", "Shoulders1" to "Shoulders", etc.
  return rawName.replace(/\d+$/, '');
}

function getVolumeColor(sets: number): string {
  if (sets <= 5) return '#B9F8CF'; // Low Volume
  if (sets <= 15) return '#05E072'; // Moderate Volume
  if (sets <= 20) return '#00A63E'; // High Volume
  if (sets <= 25) return '#FB2C37'; // Very High Volume
  return '#cf1b24'; // Overtraining
}
