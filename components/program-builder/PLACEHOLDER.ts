export interface MuscleGroupVolume {
  name: string;
  totalPerWeek: number;
  color: string;
  dailyVolumes: number[];
  total: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  rest: number;
  repsProgression: number;
  weightProgression: number;
  reps: number | number[];
  weight: number | number[];
  lastSession: string;
  progress: {
    current: string;
    next: string | null;
  };
  videoUrl?: string;
  notes?: string;
  groupNumber: number;
  groupColor: string;
}

export interface TrainingDay {
  id: string;
  name: string;
  order: number;
  estimatedMinutes: number;
  exercises: Exercise[];
}

export interface MuscleGroupVolume {
  name: string;
  totalPerWeek: number;
  color: string;
  dailyVolumes: number[];
  total: number;
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
}

export interface ProgramData {
  id: string;
  name: string;
  client: ClientData;
  sessionsPerWeek: number;
  trainingDays: TrainingDay[];
  volumeData: MuscleGroupVolume[];
  currentDayIndex: number;
  currentSessionNumber: number;
}

export const PLACEHOLDER_DATA: ProgramData = {
  id: 'prog-1',
  name: 'Upper/Lower Split',
  client: {
    id: 'client-1',
    name: 'John Doe',
    email: 'john.doe@example.com'
  },
  sessionsPerWeek: 4,
  currentDayIndex: 0,
  currentSessionNumber: 1,
  trainingDays: [
    {
      id: 'day-1',
      name: 'Upper Body',
      order: 1,
      estimatedMinutes: 23,
      exercises: [
        {
          id: 'ex-1',
          name: 'BB Bench Press',
          sets: 3,
          rest: 60,
          repsProgression: 1,
          weightProgression: 0.25,
          reps: 8,
          weight: 20,
          lastSession: 'Not Found',
          progress: {
            current: '3x8@20',
            next: '3x9@20'
          },
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          notes: 'Focus on controlled tempo',
          groupNumber: 1,
          groupColor: '#036FE3'
        },
        {
          id: 'ex-2',
          name: 'DB Shoulder Press',
          sets: 3,
          rest: 45,
          repsProgression: 1,
          weightProgression: 1,
          reps: 10,
          weight: 15,
          lastSession: '12.5kg x 10',
          progress: {
            current: '3x10@15',
            next: '3x11@15'
          },
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          notes: 'Keep core tight',
          groupNumber: 2,
          groupColor: '#10B981'
        },
        {
          id: 'ex-3',
          name: 'Lat Pulldown',
          sets: 3,
          rest: 60,
          repsProgression: 1,
          weightProgression: 2.5,
          reps: 12,
          weight: 40,
          lastSession: '37.5kg x 12',
          progress: {
            current: '3x12@40',
            next: '3x13@40'
          },
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          notes: 'Full range of motion',
          groupNumber: 3,
          groupColor: '#F59E0B'
        }
      ]
    },
    {
      id: 'day-2',
      name: 'Lower Body',
      order: 2,
      estimatedMinutes: 35,
      exercises: [
        {
          id: 'ex-4',
          name: 'Back Squat',
          sets: 4,
          rest: 90,
          repsProgression: 1,
          weightProgression: 2.5,
          reps: 6,
          weight: 60,
          lastSession: '57.5kg x 6',
          progress: {
            current: '4x6@60',
            next: '4x7@60'
          },
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          notes: 'Go to parallel depth',
          groupNumber: 1,
          groupColor: '#036FE3'
        },
        {
          id: 'ex-5',
          name: 'Romanian Deadlift',
          sets: 3,
          rest: 60,
          repsProgression: 1,
          weightProgression: 2.5,
          reps: 8,
          weight: 50,
          lastSession: '47.5kg x 8',
          progress: {
            current: '3x8@50',
            next: '3x9@50'
          },
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          notes: 'Feel stretch in hamstrings',
          groupNumber: 2,
          groupColor: '#10B981'
        }
      ]
    },
    {
      id: 'day-3',
      name: 'Push',
      order: 3,
      estimatedMinutes: 28,
      exercises: [
        {
          id: 'ex-6',
          name: 'Overhead Press',
          sets: 3,
          rest: 75,
          repsProgression: 1,
          weightProgression: 1.25,
          reps: 5,
          weight: 30,
          lastSession: '28.75kg x 5',
          progress: {
            current: '3x5@30',
            next: '3x6@30'
          },
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          notes: 'Drive through heels',
          groupNumber: 1,
          groupColor: '#036FE3'
        }
      ]
    }
  ],
  volumeData: [
    {
      name: 'Shoulders',
      totalPerWeek: 30,
      color: '#cf1b24',
      dailyVolumes: [10, 10, 10],
      total: 30
    },
    {
      name: 'Chest',
      totalPerWeek: 30,
      color: '#05E072',
      dailyVolumes: [10, 10, 10],
      total: 30
    },
    {
      name: 'Quads',
      totalPerWeek: 30,
      color: '#B9F8CF',
      dailyVolumes: [10, 10, 10],
      total: 30
    },
    {
      name: 'Back',
      totalPerWeek: 25,
      color: '#00A63E',
      dailyVolumes: [8, 9, 8],
      total: 25
    },
    {
      name: 'Hamstrings',
      totalPerWeek: 20,
      color: '#B9F8CF',
      dailyVolumes: [7, 6, 7],
      total: 20
    }
  ]
};

export const getVolumeColor = (sets: number): string => {
  if (sets <= 5) return '#B9F8CF'; // Low Volume
  if (sets <= 15) return '#05E072'; // Moderate Volume
  if (sets <= 20) return '#00A63E'; // High Volume
  if (sets <= 25) return '#FB2C37'; // Very High Volume
  return '#cf1b24'; // Overtraining
};
