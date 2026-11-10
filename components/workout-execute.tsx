import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { X, MessageCircle, Video, VideoOff, RefreshCcw, Play } from 'lucide-react';
import { RealtimeMessageItem } from '@openai/agents-realtime';

import ExerciseList from '@/components/exercise-list';
import VideoPlayer from '@/components/video-player';
import { ControlPanel } from '@/components/control-panel';
import { WorkoutMachineContext } from '@/state-machine/workout';
import { ChatInterface } from './chat-interface';
import { useRealtimeChat } from '@/hooks/use-realtime-chat-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GlobalRestTimer } from './global-rest-timer';
import { Message, Exercise } from '@/types/workout';
import { SessionDurationTimer } from './session-duration-timer';
import { useSessionDuration } from './session-duration-context';

export default function WorkoutExecute({ trainingDayId }: { trainingDayId: string }) {
  const router = useRouter();

  const currentGroup = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState.currentGroup
  );
  const currentExerciseIndex = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState.currentExerciseIndex
  );

  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutData
  );
  const isLoadingWorkout = WorkoutMachineContext.useSelector(
    (state) => state.context.isLoadingWorkout
  );
  const isExerciseVideoShownOnMobile = WorkoutMachineContext.useSelector(
    (state) => state.context.isExerciseVideoShownOnMobile
  );
  const isFinished = WorkoutMachineContext.useSelector((state) =>
    state.matches('finished')
  );

  // Check if we need to prompt for resume
  const isPromptingResume = WorkoutMachineContext.useSelector((state) =>
    state.matches('prompting_resume')
  );

  const sessionId = WorkoutMachineContext.useSelector(
    (state) => state.context.sessionId
  );

  const workoutStatus = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState.status
  );

  const workoutMachineActor = WorkoutMachineContext.useActorRef();

  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const listener = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    listener();
    window.addEventListener('resize', listener);
    return () => {
      window.removeEventListener('resize', listener);
    };
  }, []);

  const {
    initializeConnection,
    stopConnection,
    messages,
    addMessage,
    sendEvent
  } = useRealtimeChat();

  useEffect(() => {
    if (
      !hasInitializedRef.current &&
      !isLoadingWorkout &&
      workoutData.length > 0 &&
      !isPromptingResume // Don't init chat while waiting for resume decision
    ) {
      console.log(
        '📱 Page-client: Calling initializeConnection (delayed until workout loaded)'
      );
      hasInitializedRef.current = true;
      initializeConnection();
    }
  }, [initializeConnection, isLoadingWorkout, workoutData, isPromptingResume]);

  useEffect(() => {
    return () => {
      // Cleanup: stop connection when component unmounts
      stopConnection();
      console.log('📱 Page-client: Calling stopConnection');
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
  useEffect(() => {
    const markSessionCompleted = async () => {
      if (isFinished && sessionId) {
        try {
          console.log('🏁 Workout finished, marking session as completed:', sessionId);

          // Update session status to 'completed' with end_time
          const response = await fetch(`/api/training-session/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'completed',
              end_time: new Date().toISOString()
            })
          });

          if (!response.ok) {
            console.error('❌ Failed to mark session as completed:', await response.text());
          } else {
            console.log('✅ Session marked as completed successfully');
          }
        } catch (error) {
          console.error('❌ Error marking session as completed:', error);
        } finally {
          // Navigate to finish page regardless of update success
          router.push(`/trainee/training-day/${trainingDayId}/finish`);
        }
      } else if (isFinished && !sessionId) {
        // No session ID available, just navigate
        console.warn('⚠️ Workout finished but no sessionId available');
        router.push(`/trainee/training-day/${trainingDayId}/finish`);
      }
    };

    markSessionCompleted();
  }, [isFinished, trainingDayId, router, sessionId]);

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
        return currentGroup.exercises[workoutState.currentExerciseIndex];
      }
    }
    return null;
  }, [workoutMachineActor]);

  const notifyRest = useCallback((nextExerciseName?: string) => {
    const message = nextExerciseName
      ? `Rest is almost over! Get ready for ${nextExerciseName}.`
      : 'Rest is almost over! Get ready for your next set.';
    sendEvent({
      role: 'user',
      type: 'message',
      content: [
        {
          text: message,
          type: 'input_text'
        }
      ]
    });
  }, [sendEvent]);

  const notifyRestStart = useCallback((nextExerciseInfo?: string) => {
    const message = nextExerciseInfo
      ? `Your rest starts now! Next up: ${nextExerciseInfo}. Relax and prepare!`
      : 'Your rest starts now! Relax and prepare for the next exercise!';
    sendEvent({
      role: 'user',
      type: 'message',
      content: [
        {
          text: message,
          type: 'input_text'
        }
      ]
    });
  }, [sendEvent]);

  // Dispatch event when workout finishes to trigger notification refresh
  useEffect(() => {
    if (isFinished) {
      window.dispatchEvent(new Event('workout-completed'));
    }
  }, [isFinished]);

  const handleSendMessage = (content: string) => {
    sendEvent({
      role: 'user',
      type: 'message',
      content: [{ text: content, type: 'input_text' }]
    });
    addMessage('user', content, Date.now());
  };

  if (isLoadingWorkout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (workoutData.length === 0) {
    return <div>No workout data</div>;
  }

  return (
    <SessionDurationTimer
      sessionId={sessionId}
      workoutStatus={workoutStatus}
      hideDisplay={true}
    >
      <main className="min-h-screen bg-white font-sans relative">
        <UpdateAgentContext />

        {/* Resume Modal Overlay */}
        {isPromptingResume && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Resume Workout?</h2>
                <p className="text-gray-600 mb-6">
                  We found an unfinished session for this workout. Would you like to continue where you left off or start fresh?
                </p>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => workoutMachineActor.send({ type: 'event.resume_workout' })}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    Resume Session
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => workoutMachineActor.send({ type: 'event.start_fresh' })}
                    className="w-full flex items-center justify-center gap-2 border-2 hover:bg-gray-50 py-6 text-gray-700"
                  >
                    <RefreshCcw className="w-5 h-5" />
                    Start Fresh
                  </Button>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500 text-center border-t">
                Resuming will restore your completed sets and chat history.
              </div>
            </div>
          </div>
        )}

        {/* Global Rest Timer - runs independently of UI components */}
        <GlobalRestTimer
          notifyRest={notifyRest}
          notifyRestStart={notifyRestStart}
          getNextExercise={getNextExercise}
        >
          {/* Desktop Layout */}
          <div className="hidden md:grid md:grid-cols-12 md:gap-6 md:p-6 md:h-screen">
            {/* Exercise List */}
            <div className="col-span-3 overflow-y-auto p-1">
              <ExerciseList workoutData={workoutData} />
            </div>

            {/* Main Content */}
            <div className="col-span-6 flex flex-col gap-6">
              <VideoPlayer
                videoUrl={
                  workoutData[currentGroup]?.exercises[currentExerciseIndex]
                    ?.videoUrl || ''
                }
                className="flex-1"
              />

              {!isMobileScreen && <ControlPanel />}
            </div>

            {/* Chat Interface */}
            <div className="col-span-3 flex flex-col gap-2">
              <ChatInterface
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
          />
        </GlobalRestTimer>
      </main>
    </SessionDurationTimer>
  );
}

const MobileTabs = memo(function MobileTabs({
  messages,
  handleSendMessage,
  mobileTab,
  handleMobileTabChange,
  isExerciseVideoShownOnMobile
}: {
  messages: Message[];
  handleSendMessage: (content: string) => void;
  mobileTab: 'main' | 'exercises';
  handleMobileTabChange: (v: string) => void;
  isExerciseVideoShownOnMobile: boolean;
}) {
  const [showChat, setShowChat] = useState(false);
  const workoutMachineActor = WorkoutMachineContext.useActorRef();

  const currentGroup = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState.currentGroup
  );
  const currentExerciseIndex = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState.currentExerciseIndex
  );
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutData
  );
  const isMobileScreen = useMemo(() => window.innerWidth < 768, []);

  const handleToggleVideo = useCallback(() => {
    console.log('handleToggleVideo', isExerciseVideoShownOnMobile);
    if (isExerciseVideoShownOnMobile) {
      workoutMachineActor.send({ type: 'event.hide_exercise_video' });
    } else {
      workoutMachineActor.send({ type: 'event.show_exercise_video' });
    }
  }, [isExerciseVideoShownOnMobile, workoutMachineActor]);

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
            {/* Video Toggle Button */}
            <Button
              onClick={handleToggleVideo}
              className="flex items-center gap-2"
              aria-label={
                isExerciseVideoShownOnMobile
                  ? 'Hide exercise video'
                  : 'Show exercise video'
              }
            >
              {isExerciseVideoShownOnMobile ? (
                <>
                  <VideoOff className="w-4 h-4" />
                  Hide Video
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Show Video
                </>
              )}
            </Button>

            {isExerciseVideoShownOnMobile && (
              <VideoPlayer
                videoUrl={
                  workoutData[currentGroup]?.exercises[currentExerciseIndex]
                    ?.videoUrl || ''
                }
              />
            )}
            {isMobileScreen && <ControlPanel />}
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
              <ChatInterface
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
  const { updateHistory, connectionState } = useRealtimeChat();
  const workoutState = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState
  );
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutData
  );
  const sessionId = WorkoutMachineContext.useSelector(
    (state) => state.context.sessionId
  );

  // Use SessionDurationTimer as the single source of truth
  const { elapsedSeconds, isInitialized } = useSessionDuration();

  // Format duration text
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  };

  // Track previous meaningful state to only send on significant changes
  const prevStateRef = useRef<{
    isResting: boolean;
    currentGroup: number;
    currentExerciseIndex: number;
    elapsedQuarterMinutes: number; // Track 15-second intervals for accuracy
  } | null>(null);

  // Only send updates on meaningful state changes (not every timer tick)
  useEffect(() => {
    if (connectionState !== 'connected' || !sessionId || !isInitialized || !workoutState) {
      return;
    }

    const currentState = {
      isResting: Boolean(workoutState.isResting),
      currentGroup: workoutState.currentGroup ?? 0,
      currentExerciseIndex: workoutState.currentExerciseIndex ?? 0,
      elapsedQuarterMinutes: Math.floor(elapsedSeconds / 15) // Track 15-second intervals
    };

    // Initialize on first run
    if (prevStateRef.current === null) {
      prevStateRef.current = currentState;
      return;
    }

    const prevState = prevStateRef.current;
    let shouldUpdate = false;
    let updateReason = '';

    // Check for meaningful changes
    if (currentState.isResting !== prevState.isResting) {
      shouldUpdate = true;
      updateReason = currentState.isResting
        ? `Rest started (${workoutState.restTimeRemaining ?? 0}s remaining)`
        : 'Rest completed';
    } else if (currentState.currentGroup !== prevState.currentGroup) {
      shouldUpdate = true;
      // Get current group exercises information
      const currentGroupData = workoutData?.[currentState.currentGroup];
      const currentExercise = currentGroupData?.exercises?.[currentState.currentExerciseIndex];

      // Use group number from database (1-based) if available, otherwise use index + 1
      const groupNumber = currentGroupData?.group ?? (currentState.currentGroup + 1);
      let groupInfo = `Moved to group ${groupNumber}`;

      if (currentGroupData) {
        // Get unique exercise names in this group
        const uniqueExercises = new Set(currentGroupData.exercises.map((ex) => ex.name));
        const exerciseNames = Array.from(uniqueExercises).join(', ');
        groupInfo += ` (${exerciseNames})`;

        if (currentExercise) {
          groupInfo += `\nCurrent exercise: ${currentExercise.name} - Set ${currentExercise.setNumber} (${currentExercise.reps} reps, ${currentExercise.weight}lbs)`;
        }
      }
      updateReason = groupInfo;
    } else if (currentState.currentExerciseIndex !== prevState.currentExerciseIndex) {
      shouldUpdate = true;
      updateReason = `Moved to exercise ${currentState.currentExerciseIndex + 1}`;
    } else if (currentState.elapsedQuarterMinutes !== prevState.elapsedQuarterMinutes && currentState.elapsedQuarterMinutes > 0) {
      // Only send duration updates every 15 seconds for accuracy, not every second
      shouldUpdate = true;
      updateReason = `Session duration: ${formatDuration(elapsedSeconds)}`;
    }

    if (shouldUpdate) {
      // Log for testing/debugging
      // console.log('[Agent Update]', updateReason, {
      //   isResting: currentState.isResting,
      //   currentGroup: currentState.currentGroup,
      //   currentExerciseIndex: currentState.currentExerciseIndex,
      //   elapsedQuarterMinutes: currentState.elapsedQuarterMinutes,
      //   elapsedSeconds: elapsedSeconds
      // });

      const generateUniqueId = () =>
        `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Only include essential state, not the full JSON
      // Use group number from database (1-based) if available, otherwise use index + 1
      const currentGroupData = workoutData?.[workoutState.currentGroup ?? 0];
      const groupNumber = currentGroupData?.group ?? ((workoutState.currentGroup ?? 0) + 1);

      const essentialState = {
        isResting: workoutState.isResting,
        currentGroup: groupNumber, // Use 1-based group number from DB
        currentGroupIndex: workoutState.currentGroup, // Keep 0-based index for reference
        currentExerciseIndex: workoutState.currentExerciseIndex,
        sessionDuration: formatDuration(elapsedSeconds)
      };

      const newItem: RealtimeMessageItem = {
        itemId: generateUniqueId(),
        type: 'message',
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: `${updateReason}\nCurrent workout state: ${JSON.stringify(essentialState)}`
          }
        ]
      };
      updateHistory(newItem);
      prevStateRef.current = currentState;
    }
  }, [
    workoutState,
    workoutState?.isResting,
    workoutState?.currentGroup,
    workoutState?.currentExerciseIndex,
    workoutState?.restTimeRemaining,
    workoutData,
    elapsedSeconds,
    updateHistory,
    connectionState,
    sessionId,
    isInitialized,
    formatDuration
  ]);

  return null;
}