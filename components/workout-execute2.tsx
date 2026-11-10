'use client';

import ExerciseList from '@/components/exercise-list';
import VideoPlayer from '@/components/video-player';
import { WorkoutMachineContext } from '@/state-machine/workout';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X, MessageCircle } from 'lucide-react';
import { useOutspeed } from '@/hooks/use-outspeed';
import { ControlPanelOutspeed } from './control-panel2';
import { ChatInterfaceOutspeed } from './chat-interface2';
import { GlobalRestTimer } from './global-rest-timer';
import { Message } from '@/types/workout';
import { SessionDurationTimer } from './session-duration-timer';

export default function WorkoutExecuteOutspeed({
  trainingDayId
}: {
  trainingDayId: string;
}) {
  const router = useRouter();

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
  const isExerciseVideoShownOnMobile = WorkoutMachineContext.useSelector(
    (state) => state?.context?.isExerciseVideoShownOnMobile ?? false
  );
  const isFinished = WorkoutMachineContext.useSelector((state) =>
    state?.matches ? state.matches('finished') : false
  );
  const workoutMachineActor = WorkoutMachineContext.useActorRef();

  const sessionId = WorkoutMachineContext.useSelector(
    (state) => state?.context?.sessionId
  );

  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const listener = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    listener();
    window.addEventListener('resize', listener);
  }, []);

  const { startSession, endSession, addMessage, messages, sendChatMessage } =
    useOutspeed();

  useEffect(() => {
    if (
      !hasInitializedRef.current &&
      !isLoadingWorkout &&
      workoutData.length > 0
    ) {
      startSession();
      hasInitializedRef.current = true;
    }
  }, [startSession, isLoadingWorkout, workoutData]);

  useEffect(() => {
    return () => {
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasInitializedRef = useRef(false);

  // Mobile state for toggling views
  const [mobileTab, setMobileTab] = useState<'main' | 'exercises'>('main');

  const handleMobileTabChange = useCallback((v: string) => {
    setMobileTab(v as 'main' | 'exercises');
  }, []);

  // Navigate to finish page when workout is completed
  // Update the finish route redirect:
  useEffect(() => {
    if (isFinished) {
      router.push(`/trainee/training-day/${trainingDayId}/finish`);
    }
  }, [isFinished, router, trainingDayId]);

  useEffect(() => {
    workoutMachineActor.send({ type: 'event.load_training_day', trainingDayId });
  }, [trainingDayId, workoutMachineActor]);

  const getNextExercise = useCallback(() => {
    const currentState = workoutMachineActor.getSnapshot();
    const workoutState = currentState.context.workoutState;
    const workoutData = currentState.context.workoutData;
    
    if (workoutData && workoutData[workoutState.currentGroup]) {
      const currentGroup = workoutData[workoutState.currentGroup];
      if (currentGroup.exercises[workoutState.currentExerciseIndex]) {
        const exercise = currentGroup.exercises[workoutState.currentExerciseIndex];
        return {
          name: exercise.name,
          reps: exercise.reps,
          weight: exercise.weight
        };
      }
    }
    return null;
  }, [workoutMachineActor]);

  const notifyRest = useCallback((nextExerciseName?: string) => {
    const message = nextExerciseName
      ? `Rest is almost over! Get ready for ${nextExerciseName}.`
      : 'Rest is almost over! Get ready for your next set.';
    sendChatMessage(message);
  }, [sendChatMessage]);

  const notifyRestStart = useCallback((nextExerciseInfo?: string) => {
    const message = nextExerciseInfo
      ? `Your rest starts now! Next up: ${nextExerciseInfo}. Relax and prepare!`
      : 'Your rest starts now! Relax and prepare for the next exercise!';
    sendChatMessage(message, { cancelOngoing: true });
  }, [sendChatMessage]);

  const onRestComplete = useCallback(() => {
    const currentState = workoutMachineActor.getSnapshot();
    const workoutState = currentState.context.workoutState;
    const workoutData = currentState.context.workoutData;

    if (workoutData && workoutData[workoutState.currentGroup]) {
      const currentGroup = workoutData[workoutState.currentGroup];
      if (currentGroup.exercises[workoutState.currentExerciseIndex]) {
        const nextExercise =
          currentGroup.exercises[workoutState.currentExerciseIndex];
        sendChatMessage(
          `Rest complete! Starting ${nextExercise.name} - ${nextExercise.reps} reps @ ${nextExercise.weight}lb`
        );
      } else {
        sendChatMessage('Rest complete! Starting next exercise.');
      }
    } else {
      sendChatMessage('Rest complete! Starting next exercise.');
    }
  }, [workoutMachineActor, sendChatMessage]);

  const handleSendMessage = useCallback(
    (content: string) => {
      sendChatMessage(content);
      addMessage('user', content, Date.now());
    },
    [sendChatMessage, addMessage]
  );

  if (isLoadingWorkout) {
    return <div>Loading workout...</div>;
  }

  if (workoutData.length === 0) {
    return <div>No workout data</div>;
  }

  return (
    <main className="min-h-screen bg-white font-sans">
      <UpdateAgentContext />
      {/* Global Rest Timer - runs independently of UI components */}
      <GlobalRestTimer 
        notifyRest={notifyRest} 
        onRestComplete={onRestComplete} 
        notifyRestStart={notifyRestStart}
        getNextExercise={getNextExercise}
      >
        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-6 md:p-6 md:h-screen">
          {/* Exercise List */}
          <div className="col-span-3 overflow-y-auto p-1">
            <h4 className="text-lg font-bold mb-2 text-blue-500">Outspeed</h4>
            <ExerciseList workoutData={workoutData} />
          </div>

          {/* Main Content */}
          <div className="col-span-6 flex flex-col gap-6">
            <VideoPlayer
              videoUrl={
                workoutData[currentGroup].exercises[currentExerciseIndex]
                  .videoUrl
              }
              className="flex-1"
            />

            {!isMobileScreen && <ControlPanelOutspeed />}
          </div>

          {/* Chat Interface */}
          <div className="col-span-3 flex flex-col gap-2">
            <ChatInterfaceOutspeed
              messages={messages}
              onSendMessage={handleSendMessage}
              className="h-full"
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <MobileTabs
          messages={messages}
          handleSendMessage={handleSendMessage}
          mobileTab={mobileTab}
          handleMobileTabChange={handleMobileTabChange}
          isExerciseVideoShownOnMobile={isExerciseVideoShownOnMobile}
          sessionId={sessionId}
        />
      </GlobalRestTimer>
    </main>
  );
}

const MobileTabs = memo(function MobileTabs({
  messages,
  handleSendMessage,
  mobileTab,
  handleMobileTabChange,
  isExerciseVideoShownOnMobile,
  sessionId
}: {
  messages: Message[];
  handleSendMessage: (content: string) => void;
  mobileTab: 'main' | 'exercises';
  handleMobileTabChange: (v: string) => void;
  isExerciseVideoShownOnMobile: boolean;
  sessionId?: string;
}) {
  const [showChat, setShowChat] = useState(false);

  const currentGroup = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutState?.currentGroup ?? 0
  );
  const currentExerciseIndex = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutState?.currentExerciseIndex ?? 0
  );
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state?.context?.workoutData ?? []
  );
  const isMobileScreen = useMemo(() => window.innerWidth < 768, []);
  return (
    <div className="md:hidden relative min-h-screen pb-20">
      {/* Tabs for toggling between main and exercises */}
      <Tabs value={mobileTab} onValueChange={handleMobileTabChange}>
        <TabsList className="w-full flex justify-between sticky top-0 z-10 bg-gray-50">
          <TabsTrigger value="main" className="flex-1">
            Workout
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex-1">
            Exercises
          </TabsTrigger>
        </TabsList>
        <TabsContent value="main">
          <div className="flex flex-col gap-4 p-4">
            {isExerciseVideoShownOnMobile && (
              <VideoPlayer
                videoUrl={
                  workoutData[currentGroup].exercises[currentExerciseIndex]
                    .videoUrl
                }
              />
            )}
            {isMobileScreen && <ControlPanelOutspeed />}
          </div>
        </TabsContent>
        <TabsContent value="exercises">
          <div className="p-4">
            <ExerciseList workoutData={workoutData} />
          </div>
        </TabsContent>
      </Tabs>
      {/* Floating Chat Bubble */}
      {!showChat && (
        <button
          className="fixed bottom-6 right-6 z-30 bg-blue-600 text-white rounded-full shadow-lg p-4 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => setShowChat(true)}
          aria-label="Open chat"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}
      {/* Chat Modal/Drawer */}
      {showChat && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-transparent">
          <div className="w-full h-[70vh] bg-transparent p-2 flex flex-col max-w-md mx-auto animate-slide-up relative">
            <button
              className="absolute top-4 right-4 z-50 text-gray-500 hover:text-gray-900"
              onClick={() => setShowChat(false)}
              aria-label="Close chat"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex-1 flex flex-col min-h-0">
              <ChatInterfaceOutspeed
                messages={messages}
                onSendMessage={handleSendMessage}
                className="flex-1 flex flex-col min-h-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function UpdateAgentContext() {
  const { addToContext, connectionState } = useOutspeed();
  const workoutState = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState
  );

  // useEffect(() => {
  //   if (connectionState === 'connected') {
  //     addToContext(
  //       `Current workout state:
  //       ${JSON.stringify(workoutState)}`,
  //       'system'
  //     );
  //   }
  // }, [workoutState, connectionState, addToContext]);

  const prevIsRestingRef = useRef<boolean | null>(null)

  // Send to OutSpeed only on rest start/end edges (not every tick)
  useEffect(() => {
    const isResting = Boolean(workoutState?.isResting)
    if (prevIsRestingRef.current === null) {
      prevIsRestingRef.current = isResting
      return
    }
    if (connectionState === 'connected' && isResting !== prevIsRestingRef.current) {
      if (isResting) {
        addToContext(` Rest started (${workoutState?.restTimeRemaining ?? 0}s)`, 'system')
      } else {
        addToContext(`Current workout state:
         ${JSON.stringify(workoutState)}`, 'system')
      }
    }
    prevIsRestingRef.current = isResting
  }, [
    workoutState?.isResting,
    workoutState?.restTimeRemaining,
    connectionState,
    addToContext,
  ])


  return null;
}
