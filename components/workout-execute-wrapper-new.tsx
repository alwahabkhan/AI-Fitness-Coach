'use client';

import { WorkoutMachineContext } from '@/state-machine/workout';
import { RealtimeChatProvider } from '@/hooks/use-realtime-chat-provider';
import { useEffect, useState } from 'react';
import TopBar from './new-workout-player/components/TopBar';
import WorkoutLayout from './new-workout-player/components/WorkoutLayout';

export default function WorkoutExecuteWrapperNew({
  trainingDayId
}: {
  trainingDayId: string;
}) {
  const [ephemeralKey, setEphemeralKey] = useState<{
    client_secret: { value: string };
  } | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Get ephemeral session key from server
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await fetch('/api/ephemeral-session', {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error('Failed to get ephemeral session');
        }
        
        const data = await response.json();
        setEphemeralKey(data);
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    initSession();
  }, []);

  if (isLoadingSession || !ephemeralKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <WorkoutMachineContext.Provider>
      <RealtimeChatProvider 
        ephemeralKey={ephemeralKey} 
        userId="current-user" 
        agentContext="fitness-workout"
      >
        <div className="container mx-auto p-6">
          <TopBar trainingDayId={trainingDayId} />
          <WorkoutLayout trainingDayId={trainingDayId} />
        </div>
      </RealtimeChatProvider>
    </WorkoutMachineContext.Provider>
  );
}