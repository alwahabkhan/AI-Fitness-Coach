'use client';

import { WorkoutMachineContext } from '@/state-machine/workout';
import WorkoutExecute from './workout-execute';
import { RealtimeChatProvider } from '@/hooks/use-realtime-chat-provider';
import { useEphemeralSession } from '@/hooks/use-ephemeral-session';
import { UserWithoutPassword } from '@/lib/auth';

export default function WorkoutExecuteWrapper({
  trainingDayId,
  user
}: {
  trainingDayId: string;
  user: UserWithoutPassword;
}) {
  const { ephemeralKey, loading, error, refetch } = useEphemeralSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (error || !ephemeralKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Connection Error</div>
          <p className="text-gray-600 mb-4">
            {error || 'Failed to initialize session'}
          </p>
          <button
            onClick={refetch}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <WorkoutMachineContext.Provider>
      <RealtimeChatProvider
        ephemeralKey={ephemeralKey}
        userId={user.id}
        agentContext={''}
      >
        <WorkoutExecute trainingDayId={trainingDayId} />
      </RealtimeChatProvider>
    </WorkoutMachineContext.Provider>
  );
}