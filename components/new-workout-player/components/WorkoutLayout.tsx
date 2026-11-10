/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo } from "react";
import Sidebar from './Sidebar'
import Main from './Main'
import ChatPanel from './ChatPanel'
import { WorkoutMachineContext } from '@/state-machine/workout';
import { useRealtimeChat } from '@/hooks/use-realtime-chat-provider';
import { SessionDurationTimer } from '@/components/session-duration-timer';

type Exercise = {
  id: string;
  title: string;
  sets: number;
  reps: number;
  weight?: string;
  videoUrl?: string;
};

type Group = {
  id: string;
  title: string;
  exercises: Exercise[];
};

interface WorkoutLayoutProps {
  trainingDayId: string;
}

export default function WorkoutLayout({ trainingDayId }: WorkoutLayoutProps) {
  const workoutMachineRef = WorkoutMachineContext.useActorRef();
  
  const currentGroup = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutState?.currentGroup ?? 0
  );
  const currentExerciseIndex = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutState?.currentExerciseIndex ?? 0
  );
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutData ?? []
  );
  const isLoadingWorkout = WorkoutMachineContext.useSelector(
    (state) => state?.context?.isLoadingWorkout ?? true
  );
  const workoutState = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutState
  );

  const sessionId = WorkoutMachineContext.useSelector(
    (state) => state?.context?.sessionId
  );

  // Check if we are prompting for resume
  const isPromptingResume = WorkoutMachineContext.useSelector(
    (state) => state.matches('prompting_resume')
  );

  const { 
    messages, 
    messageInput, 
    setMessageInput, 
    addMessage,
    initializeConnection,
    connectionState
  } = useRealtimeChat();

  // Load the training day data
  useEffect(() => {
    workoutMachineRef.send({ type: 'event.load_training_day', trainingDayId });
  }, [trainingDayId, workoutMachineRef]);

  // Initialize OpenAI realtime session
  useEffect(() => {
    if (connectionState === 'disconnected' && !isLoadingWorkout && workoutData.length > 0 && !isPromptingResume) {
      initializeConnection();
    }
  }, [connectionState, isLoadingWorkout, workoutData, initializeConnection, isPromptingResume]);

  // Transform workoutData to groups format for sidebar
  const groups: Group[] = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return [];
    
    return workoutData.map((group: any, groupIndex: number) => ({
      id: `g${groupIndex}`,
      title: `GROUP ${groupIndex + 1}`,
      exercises: group.exercises.map((ex: any) => ({
        id: ex.id,
        title: ex.name || 'Unknown Exercise',
        sets: ex.sets || 3,
        reps: ex.reps || 10,
        weight: ex.weight ? `${ex.weight}lbs` : undefined,
        videoUrl: ex.videoUrl
      }))
    }));
  }, [workoutData]);

  // Calculate which groups are open based on current position
  const openGroups = useMemo(() => {
    const open: Record<string, boolean> = {};
    open[`g${currentGroup}`] = true;
    return open;
  }, [currentGroup]);

  // Get selected exercise from current workout state
  const selectedExercise: Exercise | null = useMemo(() => {
    if (!workoutData || workoutData.length === 0) return null;
    
    const group = workoutData[currentGroup];
    if (!group || !group.exercises || group.exercises.length === 0) return null;
    
    const exercise = group.exercises[currentExerciseIndex];
    if (!exercise) return null;
    
    return {
      id: exercise.id,
      title: exercise.name || 'Unknown Exercise',
      sets: exercise.sets || 3,
      reps: exercise.reps || 10,
      weight: exercise.weight ? `${exercise.weight}lbs` : undefined,
      videoUrl: exercise.videoUrl
    };
  }, [workoutData, currentGroup, currentExerciseIndex]);

  // Calculate current set
  const currentSet = useMemo(() => {
    if (!workoutState) return 1;
    const exercise = workoutData[currentGroup]?.exercises[currentExerciseIndex];
    if (!exercise) return 1;
    
    const completedSet = exercise.completedSet;
    if (completedSet === null || completedSet === undefined) return 1;
    if (typeof completedSet === 'number') return completedSet + 1;
    return 1;
  }, [workoutState, workoutData, currentGroup, currentExerciseIndex]);

  // Note: Session duration is now handled by SessionDurationTimer component
  // Keeping formattedSession for backward compatibility with Main component
  const formattedSession = "0:00";

  function sendMessage() {
    if (!messageInput.trim()) return;
    addMessage('user', messageInput.trim(), Date.now());
    setMessageInput("");
  }

  const chatMessages = useMemo(() => {
    return messages.map(msg => ({
      id: msg.id.toString(),
      from: msg.type === 'user' ? 'user' as const : 'bot' as const,
      text: msg.content
    }));
  }, [messages]);

  if (isLoadingWorkout) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      {isPromptingResume && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl transform scale-100 transition-all">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Resume Workout?</h2>
              <p className="text-gray-500">We found a previous session that was not completed. Would you like to resume from where you left off?</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => workoutMachineRef.send({ type: 'event.start_fresh' })}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Start Fresh
              </button>
              <button
                onClick={() => workoutMachineRef.send({ type: 'event.resume_workout' })}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition-colors"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[2000px] mx-auto bg-white rounded-2xl shadow-md overflow-hidden grid grid-cols-12 gap-6">
        <Sidebar
          groups={groups}
          openGroups={openGroups}
          selectedExercise={selectedExercise}
          toggleGroup={() => {}}
          setSelectedExercise={() => {}}
        />

        <Main
          selectedExercise={selectedExercise}
          formattedSession={formattedSession}
          currentSet={currentSet}
        />

        <ChatPanel 
          messages={chatMessages}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          sendMessage={sendMessage} 
        />
      </div>
    </div>
  );
}