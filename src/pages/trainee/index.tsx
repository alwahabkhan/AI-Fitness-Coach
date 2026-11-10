import { GetServerSideProps } from 'next';
import { Layout } from '@/components/layout/layout';
import { useState } from 'react';

// importing icons
import { Flame } from "lucide-react";
import { Clock, Dumbbell } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Play,
  MessageSquare,
  Calendar,
  Trophy,
  Target,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword, getUserById } from '@/lib/auth';
import {
  getTraineeDashboardStats,
  getTraineeRecentActivity,
  type TraineeDashboardStats,
  type TraineeRecentActivity
} from '@/lib/dashboard-stats';
import { formatTime } from '@/lib/utils';
import { ProgramWithDetails, TrainingDayWithExercises } from '@/database/program-builder.types';
import SessionLimitModal from '@/components/trainee/session-limit-modal';

interface TraineeSession {
  id: string;
  program_id: string;
  training_day_id: string;
  session_number: number;
  user_id: string;
  start_time: string;
  end_time: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any;
}

interface TraineeDashboardProps {
  user: UserWithoutPassword;
  stats: TraineeDashboardStats;
  recentActivity: TraineeRecentActivity[];
  programs: ProgramWithDetails[];
  trainingSessions: TraineeSession[];
}

/* ----------------------------- helpers ----------------------------- */

// Helper to get program status based on completion
const getProgramStatus = (program: ProgramWithDetails) => {
  if (!program.is_active) return { status: 'Inactive', color: 'gray', bgColor: 'bg-gray-600' };
  if (program.is_completed) return { status: 'Completed', color: 'green', bgColor: 'bg-green-600' };

  // Check if any days have been started (would need completion tracking)
  // For now, treat all active non-completed programs as "Active"
  return { status: 'Active', color: 'purple', bgColor: 'bg-purple-600' };
};

// Helper to get day status - tracks completion of training days
const getDayStatus = (day: TrainingDayWithExercises, isCompleted: boolean) => {
  if (isCompleted) {
    return { status: 'Completed', color: 'green', bgColor: 'bg-green-600', cardBg: 'bg-green-200' };
  }
  return { status: 'Not Started', color: 'gray', bgColor: 'bg-gray-600', cardBg: 'bg-gray-200' };
};

// Helper to get exercise names from training day
const getExerciseNames = (day: TrainingDayWithExercises): string[] => {
  if (!day.training_exercises || day.training_exercises.length === 0) return [];
  return day.training_exercises.map(te => te.exercise.name);
};

// Helper to calculate estimated duration from exercises
const calculateDuration = (day: TrainingDayWithExercises): string => {
  if (!day.training_exercises || day.training_exercises.length === 0) return 'N/A';
  // Rough estimate: 3-4 minutes per set
  const totalSets = day.training_exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  const minutes = totalSets * 3.5;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

// Helper to count total exercises in a program
const getTotalExercises = (program: ProgramWithDetails): number => {
  if (!program.training_days) return 0;
  return program.training_days.reduce((sum, day) =>
    sum + (day.training_exercises?.length || 0), 0);
};

/* --------------------------- page component -------------------------- */

export default function TraineeDashboard({
  user,
  stats,
  recentActivity,
  programs,
  trainingSessions
}: TraineeDashboardProps) {
  const statsData = [
    {
      label: 'Workouts Completed',
      value: stats.workoutsCompleted.toString(),
      icon: Trophy
    },
    {
      label: 'This Week',
      value: stats.sessionsThisWeek.toString(),
      icon: Calendar
    },
    {
      label: 'Streak',
      value: `${stats.currentStreak} days`,
      icon: Target
    },
    {
      label: 'Total Workouts',
      value: stats.totalWorkouts.toString(),
      icon: TrendingUp
    }
  ];

  const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
  const [isSessionLimitModalOpen, setIsSessionLimitModalOpen] = useState(false);

  // Get active programs (those that are active and not completed)
  const activePrograms = programs.filter(p => p.is_active && !p.is_completed);

  // Get scheduled programs (inactive programs that haven't been started)
  const scheduledPrograms = programs.filter(p => !p.is_active && !p.is_completed);

  // Get completed programs
  const completedPrograms = programs.filter(p => p.is_completed);

  // Calculate total sessions logged for progress
  const totalSessionsLogged = trainingSessions.length;
  const totalTrainingDays = programs.reduce((sum, p) => sum + (p.training_days?.length || 0), 0);

  // Logic for progress bar
  const allowedSessions = user.allowed_sessions;
  const hasSessionLimit = allowedSessions !== null && allowedSessions !== undefined;

  let progressPercentage = 0;
  let denominatorText = '';

  if (hasSessionLimit) {
    progressPercentage = allowedSessions > 0 ? (totalSessionsLogged / allowedSessions) * 100 : 0;
    denominatorText = `of ${allowedSessions}`;
  } else {
    progressPercentage = totalTrainingDays > 0 ? (totalSessionsLogged / totalTrainingDays) * 100 : 0;
    denominatorText = `of ${totalTrainingDays}`;
  }

  const hasSessionsRemaining = !hasSessionLimit || totalSessionsLogged < allowedSessions;

  // Cap percentage at 100
  progressPercentage = Math.min(progressPercentage, 100);

  // Selected program data
  const allPrograms = [...activePrograms, ...scheduledPrograms, ...completedPrograms];
  const selectedProgram = allPrograms[selectedProgramIndex] || null;
  const selectedProgramDays = selectedProgram?.training_days || [];

  // Get first training day for quick workout link
  const firstTrainingDay = activePrograms[0]?.training_days?.[0];

  return (
    <Layout user={user}>
      <div className="px-4 sm:px-0 container">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-2">
            Ready to crush your fitness goals today?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          {statsData.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3 md:p-4">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="h-6 w-6 md:h-8 md:w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <stat.icon className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-white text-lg md:text-xl">Nutrition Coach</CardTitle>
              <CardDescription className="text-blue-100 text-sm">
                Get personalized nutrition advice and meal planning
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/trainee/nutrition-coach/welcome">
                <Button className="w-full bg-blue-400 text-white hover:bg-blue-500 text-sm md:text-base">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Coaching Session
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-white text-lg md:text-xl">Quick Workout</CardTitle>
              <CardDescription className="text-green-100 text-sm">
                Jump into your most recent workout routine
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {firstTrainingDay ? (
                hasSessionsRemaining ? (
                  <Link href={`/trainee/training-day/${firstTrainingDay.id}/execute`}>
                    <Button className="w-full bg-green-400 hover:bg-green-500 text-white text-sm md:text-base">
                      <Play className="h-4 w-4 mr-2" />
                      Start Workout
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full bg-green-400 text-white opacity-75 hover:bg-green-400 cursor-pointer text-sm md:text-base"
                    onClick={() => setIsSessionLimitModalOpen(true)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Workout
                  </Button>
                )
              ) : (
                <Button className="w-full bg-green-400 text-white text-sm md:text-base" disabled>
                  <Play className="h-4 w-4 mr-2" />
                  No Workouts Available
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Programs list */}
        {programs.length > 0 ? (
          <div className="flex flex-col lg:flex-row bg-white p-3 md:p-4 border-2 border-gray-200 rounded-md min-h-[50vh] lg:min-h-[70vh] lg:min-w-[70vw]">
            {/* Sidebar */}
            <div className="w-full lg:w-1/3 lg:border-r border-gray-200 lg:pr-4 mb-4 lg:mb-0">
              <div className="flex flex-col sm:flex-row lg:flex-wrap justify-evenly items-center bg-white p-3 md:p-4 rounded-xl shadow-sm gap-3 sm:gap-4">
                {/* Left side */}
                <div className="text-center sm:text-left">
                  <h2 className="text-base md:text-lg text-gray-900 mb-1">Your Programs</h2>
                  <h2 className="text-xs md:text-sm text-gray-900 mb-2 md:mb-4 opacity-60">
                    {programs.length} program{programs.length !== 1 ? 's' : ''}
                  </h2>
                </div>

                {/* Right side - circular progress bar */}
                <div className="flex flex-col items-center">
                  <div className="relative w-14 h-14 md:w-16 md:h-16">
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
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs md:text-sm font-semibold text-gray-900">{totalSessionsLogged}</span>
                      <span className="text-xs text-gray-400">{denominatorText}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs md:text-sm text-gray-700 mt-1 flex flex-row items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-blue-500"
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
                  <div>Sessions Count</div>
                </div>
              </div>

              <div className='max-h-[40vh] lg:max-h-[70vh] overflow-y-auto p-2'>
                {/* Active Programs */}
                {activePrograms.length > 0 && (
                  <>
                    <h2 className="text-base md:text-lg text-gray-900 mb-1 mt-4">Active Programs</h2>
                    <div className="space-y-2 md:space-y-3">
                      {activePrograms.map((program) => {
                        const programStatus = getProgramStatus(program);
                        const sessionsLogged = trainingSessions.filter(s => s.program_id === program.id).length;
                        const globalIndex = allPrograms.findIndex(p => p.id === program.id);
                        const isSelected = selectedProgramIndex === globalIndex;

                        return (
                          <div
                            key={program.id}
                            onClick={() => setSelectedProgramIndex(globalIndex)}
                            className={`p-2 md:p-3 border-2 rounded-lg cursor-pointer transition ${isSelected
                              ? 'border-blue-400 bg-blue-100'
                              : 'border-gray-200 hover:bg-gray-100'
                              }`}
                          >
                            <div className="flex flex-wrap justify-between items-center mb-1 gap-2">
                              <div className='flex items-center justify-center'>
                                <Flame size={20} className="md:w-6 md:h-6" />
                                <div className="font-medium text-gray-800 text-sm md:text-md pl-2">{program.name}</div>
                              </div>
                              <div>
                                <span className={`text-xs text-white ${programStatus.bgColor} p-1 px-2 rounded-md`}>
                                  {programStatus.status}
                                </span>
                              </div>
                              <div className='font-medium text-gray-800 text-xs md:text-md pl-2 md:pl-4 opacity-60 w-full sm:w-auto'>
                                Session Logged: {sessionsLogged}
                              </div>
                              <div className="text-xs text-gray-500 rounded-md text-center p-1 md:p-2">
                                {program.training_days?.length || 0} plan{(program.training_days?.length || 0) !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Scheduled Programs (Not Started) */}
                {scheduledPrograms.length > 0 && (
                  <>
                    <h2 className="text-base md:text-lg text-gray-900 mb-1 mt-4">Scheduled Programs</h2>
                    <div className="space-y-2 md:space-y-3">
                      {scheduledPrograms.map((program) => {
                        const globalIndex = allPrograms.findIndex(p => p.id === program.id);
                        const isSelected = selectedProgramIndex === globalIndex;

                        return (
                          <div
                            key={program.id}
                            onClick={() => setSelectedProgramIndex(globalIndex)}
                            className={`p-2 md:p-3 border-2 rounded-lg cursor-pointer transition ${isSelected
                              ? 'border-blue-400 bg-blue-100'
                              : 'border-gray-200 hover:bg-gray-100'
                              }`}
                          >
                            <div className="flex flex-wrap justify-between items-center mb-1">
                              <div className='flex items-center justify-center'>
                                <Flame size={20} className="md:w-6 md:h-6" />
                                <div className="font-medium text-gray-800 text-sm md:text-md pl-2">{program.name}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 rounded-md text-left p-1 md:p-2">
                              {program.training_days?.length || 0} plan{(program.training_days?.length || 0) !== 1 ? 's' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Completed Programs */}
                {completedPrograms.length > 0 && (
                  <>
                    <h2 className="text-base md:text-lg text-gray-900 mb-1 mt-4">Completed Programs</h2>
                    <div className="space-y-2 md:space-y-3">
                      {completedPrograms.map((program) => {
                        const programStatus = getProgramStatus(program);
                        const sessionsLogged = trainingSessions.filter(s => s.program_id === program.id).length;
                        const globalIndex = allPrograms.findIndex(p => p.id === program.id);
                        const isSelected = selectedProgramIndex === globalIndex;

                        return (
                          <div
                            key={program.id}
                            onClick={() => setSelectedProgramIndex(globalIndex)}
                            className={`p-2 md:p-3 border-2 rounded-lg cursor-pointer transition ${isSelected
                              ? 'border-blue-400 bg-blue-100'
                              : 'border-gray-200 hover:bg-gray-100'
                              }`}
                          >
                            <div className="flex flex-wrap justify-between items-center mb-1 gap-2">
                              <div className='flex items-center justify-center opacity-60'>
                                <Flame size={20} className="md:w-6 md:h-6" />
                                <div className="font-medium text-gray-800 text-sm md:text-md pl-2">{program.name}</div>
                              </div>
                              <div>
                                <span className={`text-xs text-white ${programStatus.bgColor} p-1 px-2 rounded-md`}>
                                  {programStatus.status}
                                </span>
                              </div>
                              <div className='font-medium text-gray-800 text-xs md:text-md pl-2 md:pl-4 opacity-60 w-full sm:w-auto'>
                                Session Logged: {sessionsLogged}
                              </div>
                              <div className="text-xs text-gray-500 rounded-md text-center p-1 md:p-2">
                                {program.training_days?.length || 0} plan{(program.training_days?.length || 0) !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Details Panel */}
            <div className="flex-1 lg:pl-6">
              {selectedProgram && (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h2 className="text-lg md:text-xl text-gray-900 mb-2">
                        {selectedProgram.name}
                      </h2>
                      <span className="text-xs md:text-sm text-gray-600">
                        {selectedProgramDays.length > 0 ? calculateDuration(selectedProgramDays[0]) : 'N/A'} per plan &bull; {getTotalExercises(selectedProgram)} exercises total
                      </span>
                    </div>
                    <div className='bg-green-100 text-green-600 px-2 py-1 border-2 rounded-md border-green-600'>
                      <p className="text-xs md:text-sm">{selectedProgramDays.length} plan{selectedProgramDays.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {selectedProgram.description && (
                    <p className="text-sm md:text-base text-gray-600 mt-2 mb-4">{selectedProgram.description}</p>
                  )}

                  {selectedProgramDays.length > 0 && (
                    <>
                      <h6 className='mt-6 md:mt-8 text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4'>Select a Plan</h6>

                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 md:gap-4 mb-6">
                        {selectedProgramDays
                          .sort((a, b) => a.day_order - b.day_order)
                          .map((day) => {
                            const completedSessions = trainingSessions.filter(s => s.training_day_id === day.id && s.status === 'completed');
                            const inProgressSessions = trainingSessions.filter(s => s.training_day_id === day.id && s.status === 'in_progress');
                            const sessionsLogged = completedSessions.length;
                            const isCompleted = sessionsLogged > 0;
                            // Only show "Continue Session" if there's an actual in_progress session
                            const hasInProgress = inProgressSessions.length > 0;
                            const dayStatus = getDayStatus(day, isCompleted);
                            const exercises = getExerciseNames(day);
                            const duration = calculateDuration(day);

                            return (
                              <div key={day.id} className="bg-white border rounded-lg border-gray-200 shadow-sm p-1 w-full sm:w-[calc(50%-0.5rem)] lg:w-65 mt-2 flex flex-col">
                                {/* Top section */}
                                <div className={`${dayStatus.cardBg} rounded-md p-2 md:p-3 pb-0`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-900">
                                      {day.name || `Day ${day.day_order}`}
                                    </h3>
                                    <span className={`text-xs font-medium ${dayStatus.bgColor} text-white px-2 py-1 rounded-md`}>
                                      {dayStatus.status}
                                    </span>
                                  </div>

                                  {/* Duration and exercises */}
                                  <div className="flex items-center gap-3 md:gap-4 text-xs py-2 md:py-0 md:text-sm text-gray-700">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                                      <span>{duration}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Play className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                                      <span>{exercises.length} exercise{exercises.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Session logged */}
                                <p className="text-left text-xs text-gray-500 pt-2 md:pt-3 mb-2 px-3 md:px-4">
                                  Session Logged: {sessionsLogged}
                                </p>

                                {/* Exercises list and Description - Grows to fill space */}
                                <div className="px-3 md:px-4 pt-3 md:pt-4 pb-0 flex-grow">
                                  <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                                    {exercises.length > 0 ? (
                                      exercises.map((exercise, i) => (
                                        <span
                                          key={i}
                                          className="px-2 md:px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                                        >
                                          {exercise}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-xs text-gray-500">No exercises listed</span>
                                    )}
                                  </div>

                                  {day.description && (
                                    <p className="text-xs text-gray-600 mb-3 md:mb-4 p-2">
                                      {day.description}
                                    </p>
                                  )}
                                </div>

                                {/* Footer Section - Pushed to bottom */}
                                <div className="px-3 md:px-4 pb-3 md:pb-4 mt-auto">
                                  {/* Last completed */}
                                  <p className="text-xs text-gray-500 mb-3 md:mb-4 p-2">
                                    Last completed: <span className="font-medium">
                                      {(() => {
                                        const completedSessions = trainingSessions
                                          .filter(s => s.training_day_id === day.id && s.status === 'completed')
                                          .sort((a, b) => new Date(b.end_time || b.start_time).getTime() - new Date(a.end_time || a.start_time).getTime());

                                        if (completedSessions.length === 0) return 'Never';

                                        const lastSession = completedSessions[0];
                                        const lastDate = new Date(lastSession.end_time || lastSession.start_time);
                                        return lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                      })()}
                                    </span>
                                  </p>

                                  {/* Button */}
                                  {selectedProgram.is_active && !selectedProgram.is_completed ? (
                                    hasSessionsRemaining ? (
                                      <Link href={`/trainee/training-day/${day.id}/execute`}>
                                        <button className={`w-full ${hasInProgress
                                          ? 'bg-yellow-600 hover:bg-yellow-700'
                                          : 'bg-blue-600 hover:bg-blue-700'
                                          } cursor-pointer text-white text-xs md:text-sm font-medium py-2 rounded-md transition`}>
                                          {hasInProgress ? 'Continue Session' : 'Start Session'}
                                        </button>
                                      </Link>
                                    ) : (
                                      <button
                                        onClick={() => setIsSessionLimitModalOpen(true)}
                                        className={`w-full ${hasInProgress
                                          ? 'bg-yellow-600'
                                          : 'bg-blue-600'
                                          } cursor-pointer text-white text-xs md:text-sm font-medium py-2 rounded-md transition opacity-50`}
                                      >
                                        {hasInProgress ? 'Continue Session' : 'Start Session'}
                                      </button>
                                    )
                                  ) : selectedProgram.is_completed ? (
                                    <div className="text-xs text-gray-500 text-center py-2">
                                      Program Completed
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-8">
            <div className="text-center text-gray-500">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No programs available</p>
              <p className="text-sm">Contact your trainer to get started with a training program</p>
            </div>
          </Card>
        )}

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest workout sessions and nutrition coaching activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 text-sm">
                      <div
                        className={`h-2 w-2 rounded-full ${activity.type === 'workout_completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                      />
                      <span className="text-gray-600 flex-1">{activity.message}</span>
                      <span className="text-gray-400">{formatTime(activity.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No recent activity to display</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <SessionLimitModal
        isOpen={isSessionLimitModalOpen}
        onClose={() => setIsSessionLimitModalOpen(false)}
      />
    </Layout>
  );
}

/* ----------------------- getServerSideProps ----------------------- */

export const getServerSideProps: GetServerSideProps = async (context) => {
  const sessionUser = await getCurrentUserFromContext(context);

  if (!sessionUser || sessionUser.role !== 'trainee') {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  // Fetch fresh user data to get latest allowed_sessions
  const user = await getUserById(sessionUser.id);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const headers = {
      Cookie: context.req.headers.cookie || ''
    };

    const results = await Promise.allSettled([
      getTraineeDashboardStats(user.id),
      getTraineeRecentActivity(user.id),
      fetch(`${baseUrl}/api/program`, { headers }).then(res => res.ok ? res.json() : []),
      fetch(`${baseUrl}/api/training-session`, { headers }).then(res => res.ok ? res.json() : [])
    ]);

    const stats =
      results[0].status === 'fulfilled'
        ? results[0].value
        : {
          workoutsCompleted: 0,
          sessionsThisWeek: 0,
          currentStreak: 0,
          totalWorkouts: 0,
          totalDurationMinutes: 0
        };

    const recentActivity =
      results[1].status === 'fulfilled' ? results[1].value : [];

    const programs = results[2].status === 'fulfilled' ? results[2].value : [];

    const trainingSessions = results[3].status === 'fulfilled' ? results[3].value : [];

    if (results[0].status === 'rejected') {
      console.error(
        'Error fetching trainee dashboard stats:',
        results[0].reason
      );
    }
    if (results[1].status === 'rejected') {
      console.error(
        'Error fetching trainee recent activity:',
        results[1].reason
      );
    }
    if (results[2].status === 'rejected') {
      console.error('Error fetching programs:', results[2].reason);
    }
    if (results[3].status === 'rejected') {
      console.error('Error fetching training sessions:', results[3].reason);
    }

    return {
      props: {
        user,
        stats,
        recentActivity,
        programs,
        trainingSessions
      }
    };
  } catch (error) {
    console.error('Unexpected error in getServerSideProps:', error);
    return {
      props: {
        user: sessionUser, // Fallback to session user if error
        stats: {
          workoutsCompleted: 0,
          sessionsThisWeek: 0,
          currentStreak: 0,
          totalWorkouts: 0,
          totalDurationMinutes: 0
        },
        recentActivity: [],
        programs: [],
        trainingSessions: []
      }
    };
  }
};