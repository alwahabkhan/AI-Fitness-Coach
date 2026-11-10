'use client';

import { WorkoutMachineContext } from '@/state-machine/workout';
import WorkoutExecuteOutspeed from './workout-execute2';
import { OutspeedProvider, useOutspeed } from '@/hooks/use-outspeed';
import { useEffect } from 'react';

// Component that bridges workout context to Outspeed
function OutspeedWorkoutBridge() {
  const { setWorkoutDataRef, setMessageThreadIdRef, setWorkoutMachineRef } = useOutspeed();
  
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutData ?? []
  );
  
  const messageThreadId = WorkoutMachineContext.useSelector(
    (state) => state?.context?.messageThreadId ?? ''
  );
  
  const workoutMachineRef = WorkoutMachineContext.useActorRef();

  useEffect(() => {
    setWorkoutDataRef(workoutData);
  }, [workoutData, setWorkoutDataRef]);

  useEffect(() => {
    setMessageThreadIdRef(messageThreadId);
  }, [messageThreadId, setMessageThreadIdRef]);

  useEffect(() => {
    setWorkoutMachineRef(workoutMachineRef);
  }, [workoutMachineRef, setWorkoutMachineRef]);

  return null;
}

export default function WorkoutExecuteWrapperOutspeed({
  trainingDayId
}: {
  trainingDayId: string;
}) {
  return (
    <WorkoutMachineContext.Provider>
      <OutspeedProvider>
        <OutspeedWorkoutBridge />
        <WorkoutExecuteOutspeed trainingDayId={trainingDayId} />
      </OutspeedProvider>
    </WorkoutMachineContext.Provider>
  );
}