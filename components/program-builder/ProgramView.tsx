/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/program-builder/ProgramView.tsx
import { useState, useEffect } from 'react';
import { UserWithoutPassword } from '@/lib/auth';
import {
  ProgramWithDetails,
  TrainingDayWithExercises,
  TrainingExerciseWithDetails,
  CreateTrainingDayRequest,
  CreateTrainingExerciseRequest,
  UpdateTrainingExerciseRequest
} from '@/database/program-builder.types';
import HeaderBackButton from './ui/new/HeaderBackButton';
import HeaderClientChooser from './ui/new/HeaderClientChooser';
import HeaderViewSwitcher from './ui/new/HeaderViewSwitcher';
import TableSuperContainer from './ui/new/TableSuperContainer';
import AddNewDayButton from './ui/new/AddNewDayButton';
import TableContainer from './ui/new/TableContainer';
import TableHeaderRow from './ui/new/TableHeaderRow';
import ExercisesTable from './ui/new/ExercisesTable';
import VolumeSessionsPerWeek from './ui/new/VolumeSessionsPerWeek';
import VolumeLegend from './ui/new/VolumeLegend';
import VolumeTable from './ui/new/VolumeTable';
import {
  Exercise,
  TrainingDay,
  MuscleGroupVolume,
  ClientData,
  getVolumeColor
} from './PLACEHOLDER';
import { TrainingSession } from '@/database/derived.types';
import { calculateVolumeData } from './utils/volumeCalculations';
import ProgressModeSwitcher from './ui/new/ProgressModeSwitcher';
import ProgressTable from './ui/new/ProgressTable';
import {
  calculateProgressData,
  MuscleGroupProgress
} from './utils/progressCalculations';
import { CentralizedExercise } from '@/lib/centralized_exercise';
import { UpwardTrend } from './ui/icons/UpwardTrend';
import { formatWeight } from '@/lib/utils';
import TraineeEditModeModal from './ui/new/popups/TraineeEditModeModal';

interface ProgramViewProps {
  onBack: () => void;
  trainees: UserWithoutPassword[];
  initialData?: ProgramWithDetails | null;
  mode: 'create' | 'edit' | 'sessions';
  userRole?: 'trainer' | 'trainee' | 'admin';
}

interface SessionData {
  sessionNumber: number;
  exercises: Exercise[];
  isInitial?: boolean;
  sessionId?: string | null;
  sessionStatus?: 'in_progress' | 'completed' | 'cancelled';
}

interface ExtendedProgramData {
  id: string;
  name: string;
  client: ClientData;
  sessionsPerWeek: number;
  trainingDays: TrainingDay[];
  volumeData: MuscleGroupVolume[];
  currentDayIndex: number;
  currentSessionNumber: number;
  currentSessionData: SessionData;
  availableSessions: number[];
  showInitialValues: boolean;
}

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

// Transform real database types to UI types
function transformExerciseData(
  trainingExercise: TrainingExerciseWithDetails
): Exercise {
  const groupColor =
    GROUP_COLORS[(trainingExercise.group_number || 1) - 1] || GROUP_COLORS[0];

  const displayReps = trainingExercise.reps?.[0] ?? 0;
  const displayWeight = formatWeight(trainingExercise.weights?.[0] ?? 0);
  const sets = trainingExercise.sets || 3;
  const repsProgression = trainingExercise.reps_progression ?? 0;
  const weightProgression = trainingExercise.weight_progression ?? 0;

  // Calculate next session reps using progression logic
  const baseReps = trainingExercise.reps || [displayReps];
  const nextReps = calculateNextRepsForDisplay(baseReps, 1, trainingExercise.r_plus_option || 1, repsProgression);
  const nextDisplayReps = nextReps[0];
  const nextWeight = parseFloat(displayWeight) + weightProgression;

  return {
    id: trainingExercise.id,
    name: trainingExercise.exercise.name,
    sets,
    rest: trainingExercise.rest_seconds ?? 60,
    repsProgression,
    weightProgression,
    reps: trainingExercise.reps || [displayReps],
    weight: (trainingExercise.weights || [parseFloat(displayWeight)]).map((w) =>
      parseFloat(formatWeight(w))
    ), // CHANGED: Store full array
    lastSession: 'Not Found',
    progress: {
      current: `${sets}x${displayReps}@${displayWeight}`,
      next: `${sets}x${nextDisplayReps}@${formatWeight(nextWeight)}`
    },
    videoUrl: trainingExercise.exercise.video_url || undefined,
    notes: trainingExercise.notes || undefined,
    groupNumber: trainingExercise.group_number || 1,
    groupColor
  };
}

// Add helper function for calculating next reps based on progression option
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
      result = result.map((r) => r + (sessionNumber * repsProgression));
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
      result = result.map((r) => r + (sessionNumber * repsProgression));
      return result;
  }
}

function transformTrainingDayData(
  trainingDay: TrainingDayWithExercises,
  index: number
): TrainingDay {
  const exercises =
    trainingDay.training_exercises?.map(transformExerciseData) || [];

  return {
    id: trainingDay.id,
    name: trainingDay.name,
    order: trainingDay.day_order,
    estimatedMinutes: Math.max(exercises.length * 3, 15), // Rough estimate
    exercises
  };
}

// Calculate volume data from training days
// function calculateVolumeData(trainingDays: TrainingDay[], sessionsPerWeek: number): MuscleGroupVolume[] {
//   // This is a simplified calculation - you might want to enhance this based on exercise muscle groups
//   const muscleGroups = ['Shoulders', 'Chest', 'Quads', 'Back', 'Hamstrings'];

//   return muscleGroups.map(name => {
//     const totalSets = Math.floor(Math.random() * 25) + 10; // Placeholder calculation
//     const dailyVolumes = trainingDays.map(() => Math.floor(totalSets / trainingDays.length));

//     return {
//       name,
//       totalPerWeek: totalSets,
//       color: getVolumeColor(totalSets),
//       dailyVolumes,
//       total: totalSets
//     };
//   });
// }

// Helper component for the session counter
function SessionCounter({ 
  traineeId, 
  trainees, 
  programDaysCount,
  traineeAllowedSessions
}: { 
  traineeId: string; 
  trainees: UserWithoutPassword[]; 
  programDaysCount: number;
  traineeAllowedSessions?: number | null;
}) {
  const [completedSessions, setCompletedSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  const trainee = trainees.find(t => t.id === traineeId);
  const allowedSessions = trainee?.allowed_sessions ?? traineeAllowedSessions;
  const hasSessionLimit = allowedSessions !== null && allowedSessions !== undefined;

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/training-session?user_id=${traineeId}&status=completed`);
        if (res.ok) {
          const sessions = await res.json();
          setCompletedSessions(sessions.length);
        }
      } catch (e) {
        console.error("Error fetching session count", e);
      } finally {
        setLoading(false);
      }
    };

    if (traineeId) {
      fetchSessions();
    }
  }, [traineeId]);

  if (loading) return null;

  let progressPercentage = 0;
  let denominatorText = '';

  if (hasSessionLimit) {
    progressPercentage = allowedSessions > 0 ? (completedSessions / allowedSessions) * 100 : 0;
    denominatorText = `of ${allowedSessions}`;
  } else {
    progressPercentage = programDaysCount > 0 ? (completedSessions / programDaysCount) * 100 : 0;
    denominatorText = `of ${programDaysCount}`;
  }
  
  progressPercentage = Math.min(progressPercentage, 100);

  return (
    <div className="flex items-center gap-4 animate-in fade-in duration-500">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full" viewBox="0 0 36 36">
          {/* Background circle */}
          <path
            className="text-gray-200"
            strokeWidth="3"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          {/* Progress circle */}
          <path
            className="text-blue-500"
            strokeWidth="3"
            strokeDasharray={`${progressPercentage}, 100`}
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="">
          
        </div>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-gray-900 leading-none">{completedSessions}</span>
          <span className="text-[10px] text-gray-400 leading-none mt-0.5">{denominatorText}</span>
        </div>
      </div>
      
      <div className="flex flex-col items-start justify-center">
        <div className="text-sm text-gray-900 mt-1 flex flex-row items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7H3v12a2 2 0 002 2z"
            />
          </svg>
          <span>Session Tally</span>
        </div>
        <span className='text-xs text-gray-600'>You have created {completedSessions} out of {allowedSessions ?? programDaysCount} allowed sessions</span>
      </div>
    </div>
  );
}

function WorkoutView({
  programData,
  setProgramData,
  trainees,
  realProgramData,
  onProgramUpdate,
  setRealProgramData,
  mode,
  userRole,
  isTraineeEditMode = false,
  onRequestEditMode
}: {
  programData: ExtendedProgramData;
  setProgramData: React.Dispatch<
    React.SetStateAction<ExtendedProgramData | null>
  >;
  trainees: UserWithoutPassword[];
  realProgramData: ProgramWithDetails | null;
  onProgramUpdate: () => void;
  mode: 'create' | 'edit' | 'sessions';
  setRealProgramData: React.Dispatch<
    React.SetStateAction<ProgramWithDetails | null>
  >;
  userRole?: 'trainer' | 'trainee' | 'admin';
  isTraineeEditMode?: boolean;
  onRequestEditMode?: () => void;
}) {
  const [daySessionData, setDaySessionData] = useState<
    Record<
      string,
      {
        currentSessionNumber: number;
        availableSessions: number[];
        currentSessionData: SessionData;
        showInitialValues: boolean;
      }
    >
  >({});

  // Initialize session data for each day
  useEffect(() => {
    if (realProgramData?.training_days) {
      const initialSessionData: typeof daySessionData = {};

      realProgramData.training_days.forEach((day) => {
        const initialExercises =
          day.training_exercises
            ?.sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0))
            .map(transformExerciseData) || [];

        // Start with the first session (completed or Up Next)
        const defaultSessionNumber = 1;

        initialSessionData[day.id] = {
          currentSessionNumber: defaultSessionNumber,
          availableSessions: [],
          currentSessionData: {
            sessionNumber: defaultSessionNumber,
            exercises: initialExercises,
            isInitial: false
          },
          showInitialValues: false
        };

        // Fetch sessions for this day
        fetchSessionsForDay(day.id);
      });

      setDaySessionData(initialSessionData);
    }
  }, [realProgramData, mode]);

  const fetchSessionsForDay = async (dayId: string) => {
    try {
      const response = await fetch(`/api/training-session/day/${dayId}`);
      if (response.ok) {
        const sessionData = await response.json();
        
        // Filter completed sessions and ensure they belong to the correct day
        const completedSessions = sessionData.filter(
          (s: TrainingSession) => s.status === 'completed' && s.training_day_id === dayId
        );
        
        // Extract unique session numbers and sort them
        const sessionNumbers = completedSessions.map((s: TrainingSession) => s.session_number);
        const completedSessionNumbers = Array.from(new Set(sessionNumbers))
          .map((n) => Number(n))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);

        // Calculate Up Next session number
        const upNextSessionNumber =
          completedSessionNumbers.length > 0
            ? Math.max(...completedSessionNumbers) + 1
            : 1;

        // Update to Up Next session after fetching
        setDaySessionData((prev) => ({
          ...prev,
          [dayId]: {
            ...prev[dayId],
            availableSessions: completedSessionNumbers,
            currentSessionNumber: upNextSessionNumber
          }
        }));

        // Load Up Next session data
        handleSessionChange(dayId, upNextSessionNumber);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleInstantiateSession = async (dayId: string) => {
    if (!realProgramData) return;

    try {
      // Fetch latest sessions from database to get accurate count
      const sessionsResponse = await fetch(`/api/training-session/day/${dayId}`);
      if (!sessionsResponse.ok) throw new Error('Failed to fetch sessions');

      const existingSessions = await sessionsResponse.json();
      const sessionNumbers = existingSessions.map((s: TrainingSession) => s.session_number);
      const nextSessionNumber = sessionNumbers.length > 0 ? Math.max(...sessionNumbers) + 1 : 1;

      const response = await fetch(`/api/training-session/day/${dayId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_number: nextSessionNumber,
          program_id: realProgramData.id,
          auto_complete: false
        })
      });

      if (response.ok) {
        await fetchSessionsForDay(dayId);
        setTimeout(() => handleSessionChange(dayId, nextSessionNumber), 50);
      }
    } catch (error) {
      console.error('Error instantiating session:', error);
    }
  };

  const handleUpdateDay = async (dayId: string, updates: { name: string }) => {
    try {
      const response = await fetch(`/api/program/day/${dayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await onProgramUpdate(); // Refresh the program data
      }
    } catch (error) {
      console.error('Error updating day:', error);
    }
  };

  const handleCreateSession = async (dayId: string) => {
    const dayData = daySessionData[dayId];
    if (!dayData || !realProgramData) return;

    const actualSessions = dayData.availableSessions.filter((s) => s > 0);
    const nextSessionNumber =
      actualSessions.length > 0 ? Math.max(...actualSessions) + 1 : 1;

    try {
      const response = await fetch(`/api/training-session/day/${dayId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_number: nextSessionNumber,
          program_id: realProgramData.id,
          auto_complete: true // Auto-complete the session
        })
      });

      if (response.ok) {
        // Refresh from server to ensure data consistency
        await fetchSessionsForDay(dayId);
        setTimeout(() => handleSessionChange(dayId, nextSessionNumber), 50);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleSessionChange = async (dayId: string, sessionNumber: number) => {
    const currentDay = realProgramData?.training_days?.find(d => d.id === dayId);
    if (!currentDay) return;

    // Calculate which sessions are completed, Up Next, and Following
    const completedSessions = daySessionData[dayId]?.availableSessions.filter(s => s > 0) || [];
    const upNextSessionNumber = completedSessions.length > 0 ? Math.max(...completedSessions) + 1 : 1;
    const followingSessionNumber = upNextSessionNumber + 1;

    const isCompleted = completedSessions.includes(sessionNumber);
    const isUpNext = sessionNumber === upNextSessionNumber;
    const isFollowing = sessionNumber === followingSessionNumber;

    try {
      // Fetch session from database if it's a completed session
      let sessionId: string | null = null;
      let sessionStatus: 'in_progress' | 'completed' | 'cancelled' = 'completed';

      if (isCompleted) {
        const sessionsResponse = await fetch(`/api/training-session/day/${dayId}`);
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json();
          const currentSession = sessions.find((s: any) => s.session_number === sessionNumber);
          if (currentSession) {
            sessionId = currentSession.id;
            sessionStatus = currentSession.status;
          }
        }
      }

      // Calculate progression for this session
      const response = await fetch('/api/training-session/calculate-progression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          training_day_id: dayId,
          session_number: sessionNumber
        })
      });

      if (response.ok) {
        const { exercises } = await response.json();
        const sessionExercises = exercises.map((ex: any) => transformSessionExerciseData(ex, isFollowing, sessionNumber, upNextSessionNumber));

        setDaySessionData(prev => ({
          ...prev,
          [dayId]: {
            ...prev[dayId],
            currentSessionNumber: sessionNumber,
            showInitialValues: false,
            currentSessionData: {
              sessionNumber,
              exercises: sessionExercises,
              isInitial: false,
              sessionId: isCompleted ? sessionId : null,
              sessionStatus: isCompleted ? sessionStatus : undefined
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error calculating session progression:', error);
    }
  };

  const handleSessionStatusChange = async (dayId: string, sessionId: string, newStatus: 'in_progress' | 'completed') => {
    try {
      const response = await fetch(`/api/training-session/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Update local state
        setDaySessionData(prev => ({
          ...prev,
          [dayId]: {
            ...prev[dayId],
            currentSessionData: {
              ...prev[dayId].currentSessionData,
              sessionStatus: newStatus
            }
          }
        }));
      } else {
        console.error('Failed to update session status');
      }
    } catch (error) {
      console.error('Error updating session status:', error);
    }
  };

  const transformSessionExerciseData = (sessionExercise: any, isFollowing: boolean = false, currentSessionNumber: number = 1, upNextSessionNumber: number = 1): Exercise => {
    const groupColor =
      GROUP_COLORS[(sessionExercise.group_number || 1) - 1] || GROUP_COLORS[0];

    // Use session-specific reps and weights ARRAYS (not just first value)
    const sessionReps =
      sessionExercise.session_reps || sessionExercise.reps || [];
    const sessionWeights =
      sessionExercise.session_weights || sessionExercise.weights || [];
    const displayReps = sessionReps[0] ?? 0;
    const displayWeight = formatWeight(sessionWeights[0] ?? 0);
    const sets = sessionExercise.sets || 3;
    const repsProgression = sessionExercise.reps_progression ?? 0;
    const weightProgression = sessionExercise.weight_progression ?? 0;
    const rPlusOption = sessionExercise.r_plus_option || 1;

    // Calculate next progression for the session after the current one
    // The "next" values shown are for the session AFTER the one being viewed
    // progressionCount for next session = currentSessionNumber (since next session is currentSessionNumber + 1, and progression = sessionNumber - 1)
    let nextReps = displayReps;
    const baseReps = sessionExercise.reps || [];
    if (baseReps.length > 0) {
      // For the NEXT session display, use currentSessionNumber as the progression count
      // because next session number is currentSessionNumber + 1, and progression = sessionNumber - 1 = currentSessionNumber
      const nextProgressionCount = currentSessionNumber;
      const nextSessionReps = calculateNextRepsForDisplay(baseReps, nextProgressionCount, rPlusOption, repsProgression);
      nextReps = nextSessionReps[0] ?? displayReps;
    }
    // Weight for next session: base weight + (currentSessionNumber * weightProgression)
    const baseWeight = (sessionExercise.weights || [])[0] ?? 0;
    const nextWeight = baseWeight + (currentSessionNumber * weightProgression);

    return {
      id: sessionExercise.id,
      name: sessionExercise.exercise?.name || 'Unknown Exercise',
      sets,
      rest: sessionExercise.rest_seconds ?? 60,
      repsProgression,
      weightProgression,
      reps: sessionReps, // Store full array
      weight: sessionWeights.map((w: number) => parseFloat(formatWeight(w))), // Store full array
      lastSession: sessionExercise.last_session || 'Not Found',
      progress: {
        current: `${sets}x${displayReps}@${displayWeight}`,
        next: `${sets}x${nextReps}@${formatWeight(nextWeight)}`
      },
      videoUrl: sessionExercise.exercise?.video_url || undefined,
      notes: sessionExercise.notes || undefined,
      groupNumber: sessionExercise.group_number || 1,
      groupColor
    };
  };

  // Exercise management functions (same as before)
  const handleExerciseUpdate = async (
    exerciseId: string,
    updates: Partial<TrainingExerciseWithDetails>
  ) => {
    try {
      const response = await fetch(`/api/program/exercise/${exerciseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await onProgramUpdate(); // Refresh the program data
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
    }
  };

  const handleExerciseReorder = async (
    exerciseId: string,
    direction: 'up' | 'down'
  ) => {
    if (!realProgramData) return;

    // Find the day containing this exercise
    const day = realProgramData.training_days?.find((d) =>
      d.training_exercises?.some((e) => e.id === exerciseId)
    );
    if (!day?.training_exercises) return;
    console.warn(day);
    const exercises = [...day.training_exercises].sort(
      (a, b) => a.exercise_order! - b.exercise_order!
    );
    const currentIndex = exercises.findIndex((e) => e.id === exerciseId);
    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    console.warn(targetIndex < 0 || targetIndex >= exercises.length);
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    const current = exercises[currentIndex];
    const target = exercises[targetIndex];

    // Optimistic update - swap orders in local state immediately
    setRealProgramData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        training_days: prev.training_days?.map((d) => {
          if (d.id !== day.id) return d;
          return {
            ...d,
            training_exercises: d.training_exercises?.map((ex) => {
              if (ex.id === current.id)
                return { ...ex, exercise_order: target.exercise_order };
              if (ex.id === target.id)
                return { ...ex, exercise_order: current.exercise_order };
              return ex;
            })
          };
        })
      };
    });

    // Persist to backend
    try {
      await Promise.all([
        fetch(`/api/program/exercise/${current.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercise_order: target.exercise_order })
        }),
        fetch(`/api/program/exercise/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercise_order: current.exercise_order })
        })
      ]);
    } catch (error) {
      console.error('Error reordering:', error);
      // Revert on error
      await onProgramUpdate();
    }
  };

  const handleExerciseDelete = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return;

    try {
      const response = await fetch(`/api/program/exercise/${exerciseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await onProgramUpdate(); // Refresh the program data
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const handleAddExercise = async (
    dayId: string,
    exerciseData: CreateTrainingExerciseRequest
  ) => {
    try {
      const response = await fetch('/api/program/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...exerciseData,
          training_day_id: dayId
        })
      });

      if (response.ok) {
        await onProgramUpdate(); // Refresh the program data
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const handleAddDay = async () => {
    if (!realProgramData) return;

    const nextOrder =
      Math.max(
        ...(realProgramData.training_days?.map((d) => d.day_order) || []),
        0
      ) + 1;

    try {
      const createData: CreateTrainingDayRequest = {
        program_id: realProgramData.id,
        name: `Day ${nextOrder}`,
        day_order: nextOrder,
        description: ''
      };

      const response = await fetch('/api/program/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });

      if (response.ok) {
        await onProgramUpdate(); // Refresh the program data
      }
    } catch (error) {
      console.error('Error adding day:', error);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this training day and all its exercises?'
      )
    )
      return;

    try {
      const response = await fetch(`/api/program/day/${dayId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await onProgramUpdate(); // Refresh the program data
      }
    } catch (error) {
      console.error('Error deleting day:', error);
    }
  };

  const handleCopyDay = async (sourceDayId: string) => {
    if (!realProgramData) return;

    try {
      const response = await fetch(`/api/program/day/${sourceDayId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_program_id: realProgramData.id
        })
      });

      if (response.ok) {
        await onProgramUpdate();
      }
    } catch (error) {
      console.error('Error copying day:', error);
    }
  };

  // Determine the trainee ID for the session counter
  const sessionCounterTraineeId = realProgramData?.trainee?.id || realProgramData?.trainee_id;

  return (
    <TableSuperContainer>
      {(userRole === 'trainer' || userRole === 'admin') && (
        <div className="relative flex items-center justify-center mb-6 min-h-[80px]">
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <AddNewDayButton
              onAddDay={handleAddDay}
              onCopyDay={handleCopyDay}
              currentProgramId={realProgramData?.id}
              trainees={trainees}
            />
          </div>
          
          {sessionCounterTraineeId && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <SessionCounter 
                traineeId={sessionCounterTraineeId} 
                trainees={trainees}
                programDaysCount={realProgramData.training_days?.length || 0}
                traineeAllowedSessions={realProgramData.trainee?.allowed_sessions}
              />
            </div>
          )}
        </div>
      )}

      {userRole === 'trainee' && sessionCounterTraineeId && (
        <div className="flex justify-end mb-6">
          <SessionCounter 
            traineeId={sessionCounterTraineeId} 
            trainees={trainees}
            programDaysCount={realProgramData?.training_days?.length || 0}
            traineeAllowedSessions={realProgramData?.trainee?.allowed_sessions}
          />
        </div>
      )}

      {realProgramData?.training_days &&
        realProgramData.training_days.length > 0 ? (
        <div className="space-y-6">
          {realProgramData.training_days
            .sort((a, b) => a.day_order - b.day_order)
            .map((day) => {
              const dayData = daySessionData[day.id];
              const exercises =
                dayData?.currentSessionData?.exercises ||
                day.training_exercises
                  ?.sort(
                    (a, b) => (a.exercise_order || 0) - (b.exercise_order || 0)
                  )
                  .map(transformExerciseData) ||
                [];

              return (
                <TableContainer key={day.id}>
                  <TableHeaderRow
                    currentDay={{
                      id: day.id,
                      name: day.name,
                      order: day.day_order,
                      estimatedMinutes: Math.max(exercises.length * 3, 15),
                      exercises
                    }}
                    currentSessionNumber={dayData?.currentSessionNumber || 0}
                    availableSessions={dayData?.availableSessions || [0]}
                    onSessionChange={(sessionNumber) =>
                      handleSessionChange(day.id, sessionNumber)
                    }
                    // onCreateSession={() => handleCreateSession(day.id)}
                    onAddExercise={() => { }}
                    onAddExerciseData={(exerciseData) =>
                      handleAddExercise(day.id, exerciseData)
                    }
                    onAddMultipleExercises={() =>
                      handleAddExercise(day.id, {
                        exercise_id: '19b3fd24-2fdd-46db-a69c-c9f43cef52d6',
                        training_day_id: day.id,
                        sets: 3,
                        reps: [10, 10, 10],
                        weights: [20, 20, 20],
                        rest_seconds: 60,
                        group_number: 1,
                        exercise_order:
                          (day.training_exercises?.length || 0) + 1,
                        notes: '',
                        reps_progression: 1,
                        weight_progression: 2.5
                      })
                    }
                    onDeleteDay={() => handleDeleteDay(day.id)}
                    onUpdateDay={handleUpdateDay} // <--- ADD THIS LINE
                    showInitialValues={false}
                    isCompleted={realProgramData?.is_completed || false}
                    sessionStatus={dayData?.currentSessionData?.sessionStatus}
                    mode={mode}
                    userRole={userRole}
                    traineeId={realProgramData?.trainee_id}
                    isTraineeEditMode={isTraineeEditMode}
                    onRequestEditMode={onRequestEditMode}
                  />
                  <ExercisesTable
                    exercises={exercises}
                    trainingExercises={day.training_exercises || []}
                    onExerciseUpdate={handleExerciseUpdate}
                    onExerciseReorder={handleExerciseReorder}
                    onExerciseDelete={handleExerciseDelete}
                    sessionId={dayData?.currentSessionData?.sessionId}
                    sessionStatus={dayData?.currentSessionData?.sessionStatus}
                    onSessionStatusChange={(newStatus) => {
                      const sessionId = dayData?.currentSessionData?.sessionId;
                      if (sessionId) {
                        handleSessionStatusChange(day.id, sessionId, newStatus);
                      }
                    }}
                    isCompleted={realProgramData?.is_completed || false}
                    userRole={userRole}
                    currentSessionNumber={dayData?.currentSessionNumber || 1}
                    availableSessions={dayData?.availableSessions || []}
                    isTraineeEditMode={isTraineeEditMode}
                    onRequestEditMode={onRequestEditMode}
                  />
                  {/* {mode === 'edit' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        className="flex items-center gap-2 bg-green-500 text-white rounded-md px-4 py-2 hover:bg-green-600 transition-all"
                        onClick={() => handleInstantiateSession(day.id)}
                      >
                        Test: Instantiate Session
                      </button>
                    </div>
                  )} */}
                </TableContainer>
              );
            })}
        </div>
      ) : (
        <TableContainer>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No training days yet. {(userRole === 'trainer' || userRole === 'admin') ? 'Add your first training day to get started.' : 'Your trainer will add training days to your program.'}
            </p>
            {(userRole === 'trainer' || userRole === 'admin') && (
              <button
                onClick={handleAddDay}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-all"
              >
                Add First Training Day
              </button>
            )}
          </div>
        </TableContainer>
      )}
    </TableSuperContainer>
  );
}

function VolumeView({
  programData,
  setProgramData,
  realProgramData
}: {
  programData: ExtendedProgramData;
  setProgramData: (data: ExtendedProgramData) => void;
  realProgramData: ProgramWithDetails | null;
}) {
  const handleSessionsChange = (sessions: number) => {
    if (!realProgramData?.training_days) return;

    const newVolumeData = calculateVolumeData(
      realProgramData.training_days,
      sessions
    );
    setProgramData({
      ...programData,
      sessionsPerWeek: sessions,
      volumeData: newVolumeData
    });
  };

  return (
    <>
      <TableSuperContainer>
        <VolumeSessionsPerWeek
          sessionsPerWeek={programData.sessionsPerWeek}
          onSessionsChange={handleSessionsChange}
        />
        <VolumeTable
          volumeData={programData.volumeData}
          dayCount={programData.trainingDays.length}
        />
      </TableSuperContainer>
      <VolumeLegend />
    </>
  );
}

function ProgressView({
  realProgramData
}: {
  realProgramData: ProgramWithDetails | null;
}) {
  const [progressMode, setProgressMode] = useState<
    'weight' | 'reps' | 'normalized' | 'percentage'
  >('weight');
  const [progressData, setProgressData] = useState<MuscleGroupProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    console.warn(realProgramData);
    if (realProgramData?.id) {
      fetchProgressData();
    }
  }, [realProgramData?.id]);

  const fetchProgressData = async () => {
    if (!realProgramData?.id) return;

    try {
      setIsLoading(true);

      // Fetch only completed sessions for this program
      const sessionsResponse = await fetch(
        `/api/training-session?program_id=${realProgramData.id}&status=completed`
      );
      if (!sessionsResponse.ok) throw new Error('Failed to fetch sessions');

      const sessions: TrainingSession[] = await sessionsResponse.json();
      // console.log(sessions)
      // Filter for sessions with results (double check)
      const validSessions = sessions.filter(s => s.results);
      setSessionCount(validSessions.length);
      // console.log(validSessions)

      // Build exercise map from training days
      const exerciseMap: Record<string, CentralizedExercise> = {};
      const dayNameMap: Record<string, string> = {};

      realProgramData.training_days?.forEach((day) => {
        dayNameMap[day.id] = day.name;
        day.training_exercises?.forEach((te) => {
          exerciseMap[te.id] = te.exercise;
        });
      });

      // Calculate progress data with day name mapping
      const progress = calculateProgressData(validSessions, exerciseMap, dayNameMap);
      console.log(progress)
      setProgressData(progress);
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <TableSuperContainer>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading progress data...</p>
        </div>
      </TableSuperContainer>
    );
  }

  return (
    <>
      <TableSuperContainer>
        <div className="flex flex-col items-end justify-end mb-4">
          <ProgressModeSwitcher
            mode={progressMode}
            onModeChange={setProgressMode}
          />
          <div className="flex items-center justify-center w-full md:justify-end md:w-auto gap-3 mt-4">
            <UpwardTrend />
            <span className="text-[#909090]">
              {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'}{' '}
              Tracked
            </span>
          </div>
        </div>
        <ProgressTable progressData={progressData} mode={progressMode} />
      </TableSuperContainer>
    </>
  );
}

export default function ProgramView({
  onBack,
  trainees,
  initialData,
  mode,
  userRole
}: ProgramViewProps) {
  const [tab, setTab] = useState<'Workout' | 'Volume' | 'Progress'>('Workout');

  // Ensure trainees can only access Workout tab
  useEffect(() => {
    if (userRole === 'trainee' && (tab === 'Volume' || tab === 'Progress')) {
      setTab('Workout');
    }
  }, [userRole, tab]);
  const [programData, setProgramData] = useState<ExtendedProgramData | null>(
    null
  );
  const [realProgramData, setRealProgramData] =
    useState<ProgramWithDetails | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(
    mode === 'create' && !initialData
  );
  const [isTraineeEditMode, setIsTraineeEditMode] = useState(false);
  const [showEditModeModal, setShowEditModeModal] = useState(false);

  const refreshProgramData = async () => {
    if (!realProgramData?.id) return;

    try {
      const response = await fetch(`/api/program/${realProgramData.id}`);
      if (response.ok) {
        const updatedData = await response.json();
        setRealProgramData(updatedData);
        // Also update the UI data
        updateUIData(updatedData);
      }
    } catch (error) {
      console.error('Error refreshing program data:', error);
    }
  };

  const updateUIData = (data: ProgramWithDetails) => {
    const trainingDays =
      data.training_days?.map((day, index) =>
        transformTrainingDayData(day, index)
      ) || [];
    const sessionsPerWeek =
      programData?.sessionsPerWeek || trainingDays.length || 1;

    const safeDayIndex = Math.min(
      programData?.currentDayIndex || 0,
      Math.max(0, trainingDays.length - 1)
    );

    const transformedData: ExtendedProgramData = {
      id: data.id,
      name: data.name,
      client: {
        id: data.trainee.id,
        name: data.trainee.name,
        email: data.trainee.email
      },
      sessionsPerWeek: trainingDays.length || sessionsPerWeek,
      trainingDays,
      // Pass the real database types to the calculation function
      volumeData: calculateVolumeData(
        data.training_days || [],
        sessionsPerWeek
      ),
      currentDayIndex: safeDayIndex,
      currentSessionNumber: 0,
      availableSessions: programData?.availableSessions || [],
      showInitialValues: true,
      currentSessionData: {
        sessionNumber: 0,
        exercises: trainingDays[safeDayIndex]?.exercises || [],
        isInitial: true
      }
    };

    setProgramData(transformedData);
  };

  useEffect(() => {
    if (initialData) {
      updateUIData(initialData);
    } else if (mode === 'create') {
      // Initialize empty program for creation
      const emptyData: ExtendedProgramData = {
        id: '',
        name: '',
        client: { id: '', name: '', email: '' },
        sessionsPerWeek: 1,
        trainingDays: [],
        volumeData: [],
        currentDayIndex: 0,
        currentSessionNumber: 0,
        availableSessions: [],
        showInitialValues: true,
        currentSessionData: {
          sessionNumber: 0,
          exercises: [],
          isInitial: true
        }
      };
      setProgramData(emptyData);
    }
    setIsLoading(false);
  }, [initialData, mode]);

  const handleClientChange = async (client: ClientData) => {
    if (!realProgramData) return;

    try {
      const response = await fetch(`/api/program/${realProgramData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainee_id: client.id })
      });

      if (response.ok) {
        await refreshProgramData();
      }
    } catch (error) {
      console.error('Error updating program client:', error);
    }
  };

  const handleProgramCreate = async (data: {
    name: string;
    description: string;
    trainee_id: string;
  }) => {
    try {
      const response = await fetch('/api/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const newProgram = await response.json();
        // Fetch full program details
        const detailsResponse = await fetch(`/api/program/${newProgram.id}`);
        if (detailsResponse.ok) {
          const programDetails = await detailsResponse.json();
          setRealProgramData(programDetails);
          setIsCreating(false);
          updateUIData(programDetails);
        }
      }
    } catch (error) {
      console.error('Error creating program:', error);
    }
  };

  const handleProgramUpdate = async (data: {
    name: string;
    description: string;
    trainee_id: string;
  }) => {
    if (!realProgramData) {
      // Handle creation
      await handleProgramCreate(data);
      return;
    }

    try {
      const response = await fetch(`/api/program/${realProgramData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await refreshProgramData();
      }
    } catch (error) {
      console.error('Error updating program:', error);
    }
  };

  if (isLoading || !programData) {
    return (
      <div className="container">
        <div className="flex items-center justify-center py-8">
          <p>Loading program data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* ========== RESPONSIVE HEADER ========== */}
      <div className="space-y-4 mb-6">
        {/* Mobile Layout */}
        <div className="flex md:hidden flex-col gap-3">
          {/* Row 1: Back Button */}
          <div className="flex items-center">
            <HeaderBackButton onBack={onBack} />
          </div>
  
          {/* Row 2: Client Chooser (Trainers/Admins only) */}
          {(userRole === 'trainer' || userRole === 'admin') && (
            <div className="w-full">
              <HeaderClientChooser
                client={programData.client.id ? programData.client : null}
                trainees={trainees}
                onClientChange={handleClientChange}
              />
            </div>
          )}
  
          {/* Row 3: View Switcher */}
          <div className="w-full">
            <HeaderViewSwitcher tab={tab} setTab={setTab} userRole={userRole} />
          </div>
  
          {/* Row 4: Program Completion Checkbox (Trainers/Admins only) */}
          {!isCreating && realProgramData && (userRole === 'trainer' || userRole === 'admin') && (
            <div className="flex justify-start">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={realProgramData.is_completed || false}
                  onChange={async (e) => {
                    const isCompleted = e.target.checked;
  
                    setRealProgramData((prev) => {
                      if (!prev) return prev;
                      return { ...prev, is_completed: isCompleted };
                    });
  
                    try {
                      const response = await fetch(`/api/program/${realProgramData.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_completed: isCompleted })
                      });
  
                      if (!response.ok) throw new Error('Failed to update program completion status');
  
                      await refreshProgramData();
                    } catch (error) {
                      console.error('Error updating program completion:', error);
                      setRealProgramData((prev) => {
                        if (!prev) return prev;
                        return { ...prev, is_completed: !isCompleted };
                      });
                    }
                  }}
                  className="w-4 h-4 cursor-pointer accent-blue-700 rounded"
                />
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Program is Completed
                </span>
              </label>
            </div>
          )}
        </div>
  
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between gap-4">
          {/* Left Section: Back Button + Completion Checkbox */}
          <div className="flex items-center gap-6">
            <HeaderBackButton onBack={onBack} />
  
            {!isCreating && realProgramData && (userRole === 'trainer' || userRole === 'admin') && (
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={realProgramData.is_completed || false}
                  onChange={async (e) => {
                    const isCompleted = e.target.checked;
  
                    setRealProgramData((prev) => {
                      if (!prev) return prev;
                      return { ...prev, is_completed: isCompleted };
                    });
  
                    try {
                      const response = await fetch(`/api/program/${realProgramData.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_completed: isCompleted })
                      });
  
                      if (!response.ok) throw new Error('Failed to update program completion status');
  
                      await refreshProgramData();
                    } catch (error) {
                      console.error('Error updating program completion:', error);
                      setRealProgramData((prev) => {
                        if (!prev) return prev;
                        return { ...prev, is_completed: !isCompleted };
                      });
                    }
                  }}
                  className="w-4 h-4 cursor-pointer accent-blue-700 rounded"
                />
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors whitespace-nowrap">
                  Program is Completed
                </span>
              </label>
            )}
          </div>
  
          {/* Center Section: Client Chooser (Trainers/Admins only) */}
          {(userRole === 'trainer' || userRole === 'admin') && (
            <div className="flex-shrink-0">
              <HeaderClientChooser
                client={programData.client.id ? programData.client : null}
                trainees={trainees}
                onClientChange={handleClientChange}
              />
            </div>
          )}
  
          {/* Right Section: View Switcher */}
          <div className="flex-shrink-0">
            <HeaderViewSwitcher tab={tab} setTab={setTab} userRole={userRole} />
          </div>
        </div>
      </div>
  
      {tab === 'Workout' && !isCreating && (
        <WorkoutView
          programData={programData}
          setProgramData={setProgramData}
          trainees={trainees}
          realProgramData={realProgramData}
          setRealProgramData={setRealProgramData}
          onProgramUpdate={refreshProgramData}
          mode={mode}
          userRole={userRole}
          isTraineeEditMode={isTraineeEditMode}
          onRequestEditMode={() => {
            if (userRole === 'trainee') {
              setShowEditModeModal(true);
            }
          }}
        />
      )}

      {/* Trainee Edit Mode Confirmation Modal */}
      {userRole === 'trainee' && (
        <TraineeEditModeModal
          isOpen={showEditModeModal}
          onClose={() => setShowEditModeModal(false)}
          onConfirm={() => setIsTraineeEditMode(true)}
          programName={realProgramData?.name}
        />
      )}
  
      {tab === 'Workout' && isCreating && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Please create a program first to start adding training days and exercises.
          </p>
        </div>
      )}
  
      {tab === 'Volume' && programData && !isCreating && (userRole === 'trainer' || userRole === 'admin') && (
        <VolumeView
          programData={programData}
          setProgramData={setProgramData}
          realProgramData={realProgramData}
        />
      )}
  
      {tab === 'Progress' && !isCreating && (userRole === 'trainer' || userRole === 'admin') && (
        <ProgressView realProgramData={realProgramData} />
      )}
    </div>
  );
  
}
