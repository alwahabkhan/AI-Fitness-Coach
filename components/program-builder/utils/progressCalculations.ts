import { TrainingSession } from '@/database/derived.types';
import { CentralizedExercise } from '@/database/program-builder.types';
import { formatWeight } from '@/lib/utils';

export interface SessionDataPoint {
  sessionNumber: number;
  date: string;
  avgReps: number;
  avgWeight: number;
  normalizedWeight: number;
  percentIncrease: number;
}

export interface DaySeries {
  dayId: string;
  dayName: string;
  dataPoints: SessionDataPoint[];
}

export interface MuscleGroupProgress {
  muscleName: string;
  series: DaySeries[];
}

// export interface MuscleGroupProgress {
//   muscleName: string;
//   dataPoints: SessionDataPoint[];
// }

interface ExerciseResult {
  training_exercise_id: string;
  sets_completed: Array<{
    reps: number;
    weight: number;
    completed_at: string;
  }>;
}

interface SessionResults {
  exercises: ExerciseResult[];
}

export function calculateProgressData(
  sessions: TrainingSession[],
  exerciseMap: Record<string, CentralizedExercise>,
  dayNameMap: Record<string, string>
): MuscleGroupProgress[] {
  // Group sessions by exercise name and training day
  const exerciseDays: Record<
    string,
    Record<
      string,
      {
        dayName: string;
        sessions: Map<
          number,
          {
            sessionNumber: number;
            totalReps: number;
            totalWeight: number;
            count: number;
            dates: string[];
          }
        >;
      }
    >
  > = {};

  const validSessions = sessions.filter(
    (s) => s.status === 'completed' && s.results
  );

  // Group sessions by training_day_id and calculate sequential session numbers
  // This handles cases where multiple sessions have the same session_number
  const daySessionMap: Record<string, { sessions: typeof validSessions; sessionIndexMap: Map<string, number> }> = {};
  
  validSessions.forEach((session) => {
    const dayId = session.training_day_id;
    if (!daySessionMap[dayId]) {
      daySessionMap[dayId] = {
        sessions: [],
        sessionIndexMap: new Map()
      };
    }
    daySessionMap[dayId].sessions.push(session);
  });

  // Calculate sequential session indices for each day
  Object.keys(daySessionMap).forEach((dayId) => {
    const dayData = daySessionMap[dayId];
    // Sort sessions by start_time to get chronological order
    dayData.sessions.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    
    // Create a map from session id to sequential index
    dayData.sessions.forEach((session, index) => {
      dayData.sessionIndexMap.set(session.id, index + 1);
    });
  });

  validSessions.forEach((session) => {
    const results = session.results as unknown as SessionResults;
    if (!results?.exercises) return;

    const sessionDate = new Date(session.start_time).toLocaleDateString();
    const dayId = session.training_day_id;
    const dayName = dayNameMap[dayId] || `Day ${dayId.slice(0, 8)}`;
    
    // Use sequential index if available, otherwise use session_number
    // This ensures each session gets a unique sequential number even if session_number is duplicated
    const sessionIndex = daySessionMap[dayId]?.sessionIndexMap.get(session.id) || session.session_number;
    const sessionNumber = sessionIndex;

    results.exercises.forEach((exerciseResult) => {
      const exercise = exerciseMap[exerciseResult.training_exercise_id];
      if (!exercise?.name) return;

      const exerciseName = exercise.name;

      if (!exerciseDays[exerciseName]) {
        exerciseDays[exerciseName] = {};
      }

      if (!exerciseDays[exerciseName][dayId]) {
        exerciseDays[exerciseName][dayId] = {
          dayName,
          sessions: new Map()
        };
      }

      const dayData = exerciseDays[exerciseName][dayId];

      if (!dayData.sessions.has(sessionNumber)) {
        dayData.sessions.set(sessionNumber, {
          sessionNumber,
          totalReps: 0,
          totalWeight: 0,
          count: 0,
          dates: []
        });
      }

      const sessionData = dayData.sessions.get(sessionNumber)!;

      exerciseResult.sets_completed.forEach((set) => {
        sessionData.totalReps += set.reps;
        sessionData.totalWeight += set.weight;
        sessionData.count += 1;
      });

      if (!sessionData.dates.includes(sessionDate)) {
        sessionData.dates.push(sessionDate);
      }
    });
  });

  // Convert to final data structure
  const progressData: MuscleGroupProgress[] = Object.entries(exerciseDays)
    .map(([exerciseName, days]) => {
      const series: DaySeries[] = Object.entries(days)
        .map(([dayId, dayData]) => {
          const dataPoints: SessionDataPoint[] = Array.from(
            dayData.sessions.values()
          )
            .sort((a, b) => a.sessionNumber - b.sessionNumber)
            .map((sessionData) => {
              const avgReps = sessionData.totalReps / sessionData.count;
              const avgWeight = sessionData.totalWeight / sessionData.count;
              const normalizedWeight = avgWeight * Math.pow(0.94, 10 - avgReps);

              return {
                sessionNumber: sessionData.sessionNumber,
                date: sessionData.dates.sort().join(', '),
                avgReps: Math.round(avgReps * 10) / 10,
                avgWeight: parseFloat(formatWeight(avgWeight)),
                normalizedWeight: parseFloat(formatWeight(normalizedWeight)),
                percentIncrease: 0
              };
            });

          if (dataPoints.length === 0) return null;

          const firstSession = dataPoints[0];
          const processedPoints = dataPoints.map((point) => ({
            ...point,
            percentIncrease:
              firstSession.normalizedWeight === 0
                ? 0
                : Math.round(
                    ((point.normalizedWeight - firstSession.normalizedWeight) /
                      firstSession.normalizedWeight) *
                      100
                  )
          }));

          return {
            dayId,
            dayName: dayData.dayName,
            dataPoints: processedPoints
          };
        })
        .filter((s): s is DaySeries => s !== null);

      return {
        muscleName: exerciseName,
        series
      };
    })
    .filter((item) => item.series.length > 0)
    .sort((a, b) => a.muscleName.localeCompare(b.muscleName));

  return progressData;
}

// Program-level progress aggregation
export interface ProgramProgress {
  programId: string;
  programName: string;
  totalSessions: number;
  totalExercises: number;
  totalVolume: number;
  averageWeight: number;
  exercises: MuscleGroupProgress[];
}

export function calculateProgramProgress(
  sessions: TrainingSession[],
  programs: Array<{ id: string; name: string }>,
  exerciseMap: Record<string, CentralizedExercise>,
  dayNameMap: Record<string, string>
): ProgramProgress[] {
  const programProgressMap: Record<string, ProgramProgress> = {};

  programs.forEach((program) => {
    const programSessions = sessions.filter((s) => s.program_id === program.id);
    const progress = calculateProgressData(programSessions, exerciseMap, dayNameMap);

    // Calculate totals
    let totalVolume = 0;
    let totalWeight = 0;
    let totalSets = 0;
    const validSessions = programSessions.filter((s) => s.status === 'completed' && s.results);

    validSessions.forEach((session) => {
      const results = session.results as unknown as SessionResults;
      if (!results?.exercises) return;

      results.exercises.forEach((exerciseResult) => {
        exerciseResult.sets_completed?.forEach((set) => {
          totalVolume += set.reps * set.weight;
          totalWeight += set.weight;
          totalSets += 1;
        });
      });
    });

    programProgressMap[program.id] = {
      programId: program.id,
      programName: program.name,
      totalSessions: validSessions.length,
      totalExercises: progress.length,
      totalVolume: Math.round(totalVolume),
      averageWeight: totalSets > 0 ? parseFloat(formatWeight(totalWeight / totalSets)) : 0,
      exercises: progress
    };
  });

  return Object.values(programProgressMap);
}

// Cumulative progress over time
export interface CumulativeDataPoint {
  date: string;
  sessionNumber: number;
  totalVolume: number;
  averageWeight: number;
  exercisesCompleted: number;
  programsActive: number;
}

export function calculateCumulativeProgress(
  sessions: TrainingSession[],
  programs: Array<{ id: string; name: string }>
): CumulativeDataPoint[] {
  const validSessions = sessions
    .filter((s) => s.status === 'completed' && s.results)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const cumulativeData: CumulativeDataPoint[] = [];
  const programSet = new Set<string>();
  let cumulativeVolume = 0;
  let cumulativeWeight = 0;
  let cumulativeSets = 0;

  validSessions.forEach((session, index) => {
    const results = session.results as unknown as SessionResults;
    if (!results?.exercises) return;

    programSet.add(session.program_id || '');

    let sessionVolume = 0;
    let sessionWeight = 0;
    let sessionSets = 0;

    results.exercises.forEach((exerciseResult) => {
      exerciseResult.sets_completed?.forEach((set) => {
        sessionVolume += set.reps * set.weight;
        sessionWeight += set.weight;
        sessionSets += 1;
      });
    });

    cumulativeVolume += sessionVolume;
    cumulativeWeight += sessionWeight;
    cumulativeSets += sessionSets;

    cumulativeData.push({
      date: new Date(session.start_time).toLocaleDateString(),
      sessionNumber: index + 1,
      totalVolume: Math.round(cumulativeVolume),
      averageWeight: cumulativeSets > 0 ? parseFloat(formatWeight(cumulativeWeight / cumulativeSets)) : 0,
      exercisesCompleted: results.exercises.length,
      programsActive: programSet.size
    });
  });

  return cumulativeData;
}
