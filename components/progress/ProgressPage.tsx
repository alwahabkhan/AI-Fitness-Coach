/* eslint-disable @typescript-eslint/no-explicit-any */
import { Layout } from '@/components/layout/layout';
import { useState, useEffect, useMemo } from 'react';
import { UserWithoutPassword } from '@/lib/auth';
import { ProgramWithDetails } from '@/database/program-builder.types';
import { TrainingSession } from '@/database/derived.types';
import { 
  calculateProgressData, 
  calculateProgramProgress,
  calculateCumulativeProgress,
  MuscleGroupProgress, 
  SessionDataPoint,
  ProgramProgress,
  CumulativeDataPoint
} from '@/components/program-builder/utils/progressCalculations';
import ProgressModeSwitcher from '@/components/program-builder/ui/new/ProgressModeSwitcher';
import ExerciseProgressChart from '@/components/program-builder/ui/new/ExerciseProgressChart';
import MultiSeriesProgressChart from '@/components/program-builder/ui/new/MultiSeriesProgressChart';
import CumulativeProgressChart from '@/components/program-builder/ui/new/CumulativeProgressChart';
import { UpwardTrend } from '@/components/program-builder/ui/icons/UpwardTrend';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProgressPageProps {
  user: UserWithoutPassword;
  programs: ProgramWithDetails[];
  allSessions: TrainingSession[];
  trainees?: UserWithoutPassword[];
}

interface CumulativeStats {
  totalPrograms: number;
  totalVolumeIncrease: number;
  averageWeightIncrease: number;
  bestPerformance: string;
}

export default function ProgressPage({ user, programs: allPrograms, allSessions: allSessionsProp, trainees = [] }: ProgressPageProps) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | 'all'>(
    'all'
  );
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | 'all'>(
    'all'
  );
  const [progressMode, setProgressMode] = useState<'weight' | 'reps' | 'normalized' | 'percentage'>('reps');
  const [cumulativeMode, setCumulativeMode] = useState<'volume' | 'weight' | 'exercises' | 'programs'>('volume');
  const [viewMode, setViewMode] = useState<'exercises' | 'programs' | 'cumulative'>('exercises');
  const [progressData, setProgressData] = useState<MuscleGroupProgress[]>([]);
  const [programProgressData, setProgramProgressData] = useState<ProgramProgress[]>([]);
  const [cumulativeProgressData, setCumulativeProgressData] = useState<CumulativeDataPoint[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTraineeDropdownOpen, setIsTraineeDropdownOpen] = useState(false);
  const [cumulativeStats, setCumulativeStats] = useState<CumulativeStats>({
    totalPrograms: 0,
    totalVolumeIncrease: 0,
    averageWeightIncrease: 0,
    bestPerformance: 'N/A'
  });

  const isTrainerOrAdmin = user.role === 'trainer' || user.role === 'admin';

  // Filter programs and sessions based on selected trainee (memoized to prevent infinite loops)
  const programs = useMemo(() => {
    return selectedTraineeId === 'all' 
      ? allPrograms 
      : allPrograms.filter(p => p.trainee_id === selectedTraineeId);
  }, [selectedTraineeId, allPrograms]);

  const allSessions = useMemo(() => {
    return selectedTraineeId === 'all'
      ? allSessionsProp
      : allSessionsProp.filter(s => s.user_id === selectedTraineeId);
  }, [selectedTraineeId, allSessionsProp]);

  const selectedProgram = selectedProgramId === 'all' ? null : programs.find(p => p.id === selectedProgramId);
  const selectedTrainee = selectedTraineeId === 'all' ? null : trainees.find(t => t.id === selectedTraineeId);

  // Calculate cumulative stats from filtered sessions
  useEffect(() => {
    calculateCumulativeStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions, programs]);

  // Reset program selection when trainee changes (only if current selection is invalid)
  useEffect(() => {
    if (selectedTraineeId !== 'all') {
      // If a specific trainee is selected, check if current program belongs to them
      if (selectedProgramId !== 'all') {
        const currentProgram = programs.find(p => p.id === selectedProgramId);
        if (!currentProgram || currentProgram.trainee_id !== selectedTraineeId) {
          setSelectedProgramId('all');
        }
      }
    } else {
      // If "All Trainees" is selected, check if current program still exists
      if (selectedProgramId !== 'all') {
        const currentProgram = programs.find(p => p.id === selectedProgramId);
        if (!currentProgram) {
          setSelectedProgramId('all');
        }
      }
    }
  }, [selectedTraineeId, selectedProgramId, programs]);

  useEffect(() => {
    fetchProgressData(selectedProgramId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId, selectedTraineeId, programs, allSessions]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.trainee-dropdown') && !target.closest('.program-dropdown')) {
        setIsTraineeDropdownOpen(false);
        setIsDropdownOpen(false);
      }
    };

    if (isTraineeDropdownOpen || isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isTraineeDropdownOpen, isDropdownOpen]);

  const calculateCumulativeStats = () => {
    const completedSessions = allSessions.filter(s => s.status === 'completed' && s.results);
    
    // Calculate total programs
    const totalPrograms = programs.length;

    // Group sessions by exercise and track first/last volumes
    const exerciseData: Record<string, { 
      firstVolume: number | null; 
      lastVolume: number | null;
      firstWeight: number | null;
      lastWeight: number | null;
      sessionNumbers: number[];
    }> = {};

    // Sort sessions by date to get proper first/last
    const sortedSessions = [...completedSessions].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    sortedSessions.forEach((session) => {
      const results = session.results as any;
      if (!results?.exercises) return;

      results.exercises.forEach((exerciseResult: any) => {
        const exerciseId = exerciseResult.training_exercise_id;
        if (!exerciseData[exerciseId]) {
          exerciseData[exerciseId] = { 
            firstVolume: null, 
            lastVolume: null,
            firstWeight: null,
            lastWeight: null,
            sessionNumbers: []
          };
        }

        let exerciseVolume = 0;
        let exerciseWeight = 0;
        let setCount = 0;

        exerciseResult.sets_completed?.forEach((set: any) => {
          exerciseVolume += set.reps * set.weight;
          exerciseWeight += set.weight;
          setCount++;
        });

        if (setCount > 0) {
          const avgVolume = exerciseVolume;
          const avgWeight = exerciseWeight / setCount;
          
          if (exerciseData[exerciseId].firstVolume === null) {
            exerciseData[exerciseId].firstVolume = avgVolume;
            exerciseData[exerciseId].firstWeight = avgWeight;
          }
          exerciseData[exerciseId].lastVolume = avgVolume;
          exerciseData[exerciseId].lastWeight = avgWeight;
        }
      });
    });

    // Calculate totals
    let totalInitialVolume = 0;
    let totalFinalVolume = 0;
    let totalInitialWeight = 0;
    let totalFinalWeight = 0;
    let exerciseCount = 0;

    Object.values(exerciseData).forEach((data) => {
      if (data.firstVolume !== null && data.lastVolume !== null) {
        totalInitialVolume += data.firstVolume;
        totalFinalVolume += data.lastVolume;
        exerciseCount++;
      }
      if (data.firstWeight !== null && data.lastWeight !== null) {
        totalInitialWeight += data.firstWeight;
        totalFinalWeight += data.lastWeight;
      }
    });

    // Calculate percentage increases
    const totalVolumeIncrease = totalInitialVolume > 0 && exerciseCount > 0
      ? Math.round(((totalFinalVolume - totalInitialVolume) / totalInitialVolume) * 100)
      : 0;
    
    const averageWeightIncrease = exerciseCount > 0
      ? Math.round((totalFinalWeight - totalInitialWeight) / exerciseCount)
      : 0;

    // Find best performing program (using program with most sessions)
    const programSessionCounts: Record<string, number> = {};
    completedSessions.forEach(s => {
      if (s.program_id) {
        programSessionCounts[s.program_id] = (programSessionCounts[s.program_id] || 0) + 1;
      }
    });

    const bestProgramId = Object.entries(programSessionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const bestPerformance = programs.find(p => p.id === bestProgramId)?.name || 'N/A';

    setCumulativeStats({
      totalPrograms,
      totalVolumeIncrease,
      averageWeightIncrease,
      bestPerformance
    });
  };

  const fetchProgressData = async (programId: string | 'all') => {
    setIsLoading(true);
    try {
      let completedSessions: TrainingSession[] = [];
      const exerciseMap: Record<string, any> = {};
      const dayNameMap: Record<string, string> = {};

      if (programId === 'all') {
        // Use all sessions from props - filter for completed sessions with results
        completedSessions = allSessions.filter(s => s.status === 'completed' && s.results);
        setSessionCount(completedSessions.length);

        // Build exercise and day name maps from all programs
        programs.forEach((program) => {
          program.training_days?.forEach((day) => {
            // Use program name prefix for day names to avoid conflicts
            const dayKey = `${program.name} - ${day.name}`;
            dayNameMap[day.id] = dayKey;
            day.training_exercises?.forEach((te) => {
              exerciseMap[te.id] = te.exercise;
            });
          });
        });
      } else {
        // Find the program
        const program = programs.find(p => p.id === programId);
        if (!program) {
          setProgressData([]);
          setSessionCount(0);
          setIsLoading(false);
          return;
        }

        // Fetch all training sessions for this program
        const response = await fetch(`/api/training-session/program/${programId}`);
        if (!response.ok) {
          console.error('Failed to fetch sessions');
          setProgressData([]);
          setSessionCount(0);
          setIsLoading(false);
          return;
        }

        const sessions: TrainingSession[] = await response.json();
        // Filter by trainee if a specific trainee is selected
        let filteredSessions = sessions;
        if (selectedTraineeId !== 'all') {
          filteredSessions = sessions.filter(s => s.user_id === selectedTraineeId);
        }
        completedSessions = filteredSessions.filter(s => s.status === 'completed' && s.results);
        setSessionCount(completedSessions.length);

        // Build exercise and day name maps from selected program
        program.training_days?.forEach((day) => {
          dayNameMap[day.id] = day.name;
          day.training_exercises?.forEach((te) => {
            exerciseMap[te.id] = te.exercise;
          });
        });
      }

      // Calculate progress data
      const progress = calculateProgressData(completedSessions, exerciseMap, dayNameMap);
      setProgressData(progress);

      // Calculate program-level progress
      const programProgress = calculateProgramProgress(
        completedSessions,
        programs.map(p => ({ id: p.id, name: p.name })),
        exerciseMap,
        dayNameMap
      );
      setProgramProgressData(programProgress);

      // Calculate cumulative progress
      const cumulativeProgress = calculateCumulativeProgress(
        completedSessions,
        programs.map(p => ({ id: p.id, name: p.name }))
      );
      setCumulativeProgressData(cumulativeProgress);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      setProgressData([]);
      setProgramProgressData([]);
      setCumulativeProgressData([]);
      setSessionCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Get exercise charts with per-day breakdown
  const getExerciseCharts = () => {
    return progressData.map((muscleGroup) => ({
      name: muscleGroup.muscleName,
      series: muscleGroup.series
    }));
  };

  if (allPrograms.length === 0) {
    return (
      <Layout user={user}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Programs Found</h2>
            <p className="text-gray-600">You don&apos;t have any programs available yet.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (programs.length === 0 && selectedTraineeId !== 'all') {
    return (
      <Layout user={user}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Programs Found</h2>
            <p className="text-gray-600">Selected trainee doesn&apos;t have any programs yet.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const exerciseCharts = getExerciseCharts();

  return (
    <Layout user={user}>
      <div className="container mx-auto px-4 py-8">
        {/* Cumulative Progress Summary Card */}
        <Card className="mb-6 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Cumulative Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Programs</div>
                <div className="text-2xl font-bold text-gray-900">{cumulativeStats.totalPrograms}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Volume Increase</div>
                <div className={`text-2xl font-bold ${cumulativeStats.totalVolumeIncrease >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cumulativeStats.totalVolumeIncrease >= 0 ? '+' : ''}{cumulativeStats.totalVolumeIncrease}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Average Weight Increase</div>
                <div className="text-2xl font-bold text-blue-600">
                  {cumulativeStats.averageWeightIncrease >= 0 ? '+' : ''}{cumulativeStats.averageWeightIncrease} kg
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Best Performance</div>
                <div className="text-2xl font-bold text-purple-600">{cumulativeStats.bestPerformance}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Tracking and Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* Sessions Tracked on the left */}
            <div className="flex items-center gap-3">
              <UpwardTrend />
              <span className="text-gray-700 font-medium">
                {sessionCount} {sessionCount === 1 ? 'Session' : 'Sessions'} Tracked
              </span>
            </div>
            
            {/* Filter buttons on the right */}
            <div className="flex flex-col items-end gap-3">
              {viewMode === 'exercises' && (
                <ProgressModeSwitcher
                  mode={progressMode}
                  onModeChange={setProgressMode}
                />
              )}
              <div className='flex items-center gap-3'>

              {/* Trainee Selector Dropdown (Trainer/Admin only) */}
              {isTrainerOrAdmin && trainees.length > 0 && (
                <div className="relative trainee-dropdown">
                  <button
                    onClick={() => setIsTraineeDropdownOpen(!isTraineeDropdownOpen)}
                    className="w-[180px] bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-left flex items-center justify-between hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-gray-900 truncate">
                      {selectedTraineeId === 'all' ? 'All Trainees' : selectedTrainee?.name || 'Select trainee'}
                    </span>
                    <ChevronDown 
                      className={`h-5 w-5 text-gray-500 transition-transform flex-shrink-0 ${
                        isTraineeDropdownOpen ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isTraineeDropdownOpen && (
                    <div className="absolute z-10 mt-2 right-0 w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedTraineeId('all');
                          setIsTraineeDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                          selectedTraineeId === 'all'
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-900'
                        }`}
                      >
                        <div className="font-medium">All Trainees</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {trainees.length} {trainees.length === 1 ? 'trainee' : 'trainees'}
                        </div>
                      </button>
                      {trainees.map((trainee) => (
                        <button
                          key={trainee.id}
                          onClick={() => {
                            setSelectedTraineeId(trainee.id);
                            setIsTraineeDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                            selectedTraineeId === trainee.id
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-900'
                          }`}
                        >
                          <div className="font-medium truncate">{trainee.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {trainee.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Program Selector Dropdown */}
              <div className="relative program-dropdown">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-[180px] bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-left flex items-center justify-between hover:border-gray-400 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-gray-900 truncate">
                    {selectedProgramId === 'all' ? 'All Programs' : selectedProgram?.name || 'Select a program'}
                  </span>
                  <ChevronDown 
                    className={`h-5 w-5 text-gray-500 transition-transform flex-shrink-0 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 mt-2 right-0 w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedProgramId('all');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedProgramId === 'all'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-900'
                      }`}
                    >
                      <div className="font-medium">All Programs</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {programs.length} {programs.length === 1 ? 'program' : 'programs'}
                      </div>
                    </button>
                    {programs.map((program) => (
                      <button
                        key={program.id}
                        onClick={() => {
                          setSelectedProgramId(program.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                          selectedProgramId === program.id
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-900'
                        }`}
                      >
                        <div className="font-medium truncate">{program.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {program.training_days?.length || 0} training days
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              </div>

            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setViewMode('exercises')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              viewMode === 'exercises'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Per Exercise
          </button>
          <button
            onClick={() => setViewMode('programs')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              viewMode === 'programs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Per Program
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              viewMode === 'cumulative'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cumulative Progress
          </button>
        </div>

        {/* Progress Charts */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading progress data...</p>
          </div>
        ) : viewMode === 'exercises' ? (
          exerciseCharts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No training session data available yet.</p>
                <p className="text-sm text-gray-400 mt-2">Complete some training sessions to see progress tracking.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {exerciseCharts.map((exercise) => (
                <Card key={exercise.name}>
                  <CardContent className="p-6">
                    {exercise.series.length > 1 ? (
                      <MultiSeriesProgressChart
                        exerciseName={exercise.name}
                        series={exercise.series}
                        mode={progressMode}
                      />
                    ) : (
                      <ExerciseProgressChart
                        exerciseName={exercise.name}
                        dataPoints={exercise.series[0]?.dataPoints || []}
                        mode={progressMode}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : viewMode === 'programs' ? (
          programProgressData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No program progress data available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {programProgressData.map((program) => (
                <Card key={program.programId}>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{program.programName}</CardTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <div className="text-gray-600">Total Sessions</div>
                        <div className="text-lg font-bold text-gray-900">{program.totalSessions}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Exercises</div>
                        <div className="text-lg font-bold text-gray-900">{program.totalExercises}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Total Volume</div>
                        <div className="text-lg font-bold text-blue-600">{program.totalVolume.toLocaleString()} kg</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Avg Weight</div>
                        <div className="text-lg font-bold text-green-600">{program.averageWeight} kg</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 mt-4">
                      {program.exercises.map((exercise) => (
                        <div key={exercise.muscleName} className="border-t pt-4">
                          {exercise.series.length > 1 ? (
                            <MultiSeriesProgressChart
                              exerciseName={exercise.muscleName}
                              series={exercise.series}
                              mode={progressMode}
                            />
                          ) : (
                            <ExerciseProgressChart
                              exerciseName={exercise.muscleName}
                              dataPoints={exercise.series[0]?.dataPoints || []}
                              mode={progressMode}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : viewMode === 'cumulative' ? (
          cumulativeProgressData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No cumulative progress data available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCumulativeMode('volume')}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      cumulativeMode === 'volume'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Volume
                  </button>
                  <button
                    onClick={() => setCumulativeMode('weight')}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      cumulativeMode === 'weight'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Weight
                  </button>
                  <button
                    onClick={() => setCumulativeMode('exercises')}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      cumulativeMode === 'exercises'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Exercises
                  </button>
                  <button
                    onClick={() => setCumulativeMode('programs')}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      cumulativeMode === 'programs'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Programs
                  </button>
                </div>
              </div>
              <Card>
                <CardContent className="p-6">
                  <CumulativeProgressChart
                    dataPoints={cumulativeProgressData}
                    mode={cumulativeMode}
                  />
                </CardContent>
              </Card>
            </div>
          )
        ) : null}
      </div>
    </Layout>
  );
}

