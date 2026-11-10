'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { WorkoutStatus } from '@/types/workout';
import { CountdownTimer } from '@/components/countdown-timer';
import { WorkoutMachineContext } from '@/state-machine/workout';
import { useCallback } from 'react';
import { getShouldFinishWorkout } from '@/util/workout';
import { useRealtimeChat } from '@/hooks/use-realtime-chat-provider';
import { RealtimeMessageItem } from '@openai/agents-realtime';
import { NotificationRecord } from '@/lib/notifications/types';
import { SessionDurationDisplay } from '@/components/session-duration-display';

interface ControlPanelProps {
  className?: string;
}

export function ControlPanel({ className }: ControlPanelProps) {
  const workoutState = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState
  );
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutData
  );
  const currentExercise =
    workoutData[workoutState.currentGroup].exercises[
      workoutState.currentExerciseIndex
    ];

  const canGoPrevious =
    workoutState.currentExerciseIndex > 0 ||
    workoutData[workoutState.currentGroup].exercises[
      workoutState.currentExerciseIndex
    ].completedSet !== null ||
    workoutState.currentGroup > 0;
  const shouldFinishWorkout = getShouldFinishWorkout(workoutData);
  const isCompleted = workoutState.status === WorkoutStatus.COMPLETED;

  const workoutMachineRef = WorkoutMachineContext.useActorRef();

  const sessionId = WorkoutMachineContext.useSelector(
    (state) => state.context.sessionId
  );

  const { updateHistory, sendEvent } = useRealtimeChat();

  const generateUniqueId = () =>
    `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const sendManualEventToHistory = useCallback(
    (text: string) => {
      const newItem: RealtimeMessageItem = {
        itemId: generateUniqueId(),
        type: 'message',
        role: 'system',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      };
      updateHistory(newItem);
    },
    [updateHistory]
  );

  const onStart = () => {
    workoutMachineRef.send({ type: 'event.start' });
    //sendManualEventToHistory('Workout started');
    sendEvent({
      role: 'user',
      type: 'message',
      content: [{ text: 'Workout started', type: 'input_text' }]
    });
  };
  const onPause = () => {
    workoutMachineRef.send({ type: 'event.pause' });
    sendManualEventToHistory('Workout paused');
  };
  const onResume = () => {
    workoutMachineRef.send({ type: 'event.resume' });
    sendManualEventToHistory('Workout resumed');
  };
  const onNextSet = () => {
    workoutMachineRef.send({ type: 'event.next_set' });
    sendManualEventToHistory('Moving on to next set');
  };
  const onPreviousSet = () => {
    workoutMachineRef.send({ type: 'event.previous_set' });
    sendManualEventToHistory('Moving on to previous set');
  };
  const onSkipRest = () => {
    workoutMachineRef.send({ type: 'event.skip_rest' });
    sendManualEventToHistory('Skipping rest');
  };

  const onFinishWorkout = async () => {
    workoutMachineRef.send({ type: 'event.finish_workout' });
    sendManualEventToHistory('Finishing workout...');
    
    // Check for session limit warning after workout finishes
    // Wait a moment for the session to be saved
    setTimeout(async () => {
      try {
        // Fetch user details to get allowed_sessions (user-level limit)
        const userResponse = await fetch('/api/user/me');
        if (!userResponse.ok) {
          console.error('[Session Warning] Failed to fetch user details');
          return;
        }
        
        const user = await userResponse.json();
        if (!user.allowed_sessions || user.allowed_sessions <= 0) {
          console.log('[Session Warning] User has no session limit');
          return;
        }
        
        // Fetch ALL completed sessions for the user (across all programs)
        const sessionsResponse = await fetch('/api/training-session?status=completed');
        if (!sessionsResponse.ok) {
          console.error('[Session Warning] Failed to fetch sessions');
          return;
        }
        
        const sessionsData = await sessionsResponse.json();
        const completedSessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData.sessions || []);
        const completedCount = completedSessions.length;
        const remaining = user.allowed_sessions - completedCount;
        
        console.log(`[Session Warning] User: ${completedCount}/${user.allowed_sessions} completed, ${remaining} remaining`);
        
        // If exactly 2 sessions remaining
        if (remaining === 2) {
          // Check if notification already exists
          const notificationResponse = await fetch('/api/notifications?alertType=reminder&limit=20');
          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();
            const existingNotifications = notificationData.notifications || [];
            
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const hasRecentNotification = existingNotifications.some(
              (n: NotificationRecord) => {
                try {
                  const notificationDate = new Date(n.createdAt);
                  return (
                    n.title === 'Session Limit Warning' &&
                    (n.message.includes('2 sessions remaining') || n.message.includes('2 sessions')) &&
                    notificationDate > sevenDaysAgo
                  );
                } catch (e) {
                  return false;
                }
              }
            );
            
            console.log("Has Recent Notification: ", hasRecentNotification);
            
            if (!hasRecentNotification) {
              console.log(`[Session Warning] Creating notification - ${completedCount}/${user.allowed_sessions} sessions`);
              // Create notification
              await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  alertType: 'reminder',
                  title: 'Session Limit Warning',
                  message: `You have only 2 sessions remaining in your program.`,
                  deliveryChannels: ['in_app', 'chat']
                })
              });
              
              // Trigger notification refresh
              window.dispatchEvent(new Event('notification-refresh'));
            } else {
              console.log(`[Session Warning] Recent notification already exists`);
            }
          }
        }
      } catch (error) {
        console.error('[Session Warning] Error checking session limit:', error);
      }
    }, 3000); // Wait 3 seconds for session to be saved
  };

  if (workoutState.isResting) {
    return (
      <CountdownTimer workoutState={workoutState} onSkipRest={onSkipRest} />
    );
  }

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      {currentExercise && !isCompleted && (
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
          <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {currentExercise.name}
          </h2>
          <div className="text-base sm:text-lg text-gray-600">
            Set{' '}
            {Math.min(
              currentExercise.setNumber,
              workoutData[workoutState.currentGroup].sets
            )}{' '}
            of {workoutData[workoutState.currentGroup].sets}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 mt-1">
            {currentExercise.reps} reps @ {currentExercise.weight}lb
          </div>
          </div>
          <div className="flex justify-start sm:justify-end mt-2 sm:mt-4">
            <SessionDurationDisplay />
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="mb-4 sm:mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-green-600 mb-2">
            Workout Complete!
          </h2>
          <p className="text-sm sm:text-base text-gray-600">Great job finishing your workout!</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4">
        {workoutState.status === WorkoutStatus.NOT_STARTED && (
          <Button onClick={onStart} size="lg" className="w-full">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Start Workout
          </Button>
        )}

        {workoutState.status === WorkoutStatus.IN_PROGRESS && (
          <>
            <div className="flex gap-2">
              <Button onClick={onPause} variant="outline" className="flex-1">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onPreviousSet}
                variant="outline"
                disabled={!canGoPrevious}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Prev
              </Button>
              {shouldFinishWorkout ? (
                <Button onClick={onFinishWorkout} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Finish Workout
                </Button>
              ) : (
                <Button onClick={onNextSet} className="flex-1">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Next
                </Button>
              )}
            </div>
          </>
        )}

        {workoutState.status === WorkoutStatus.PAUSED && (
          <>
            <Button onClick={onResume} size="lg" className="w-full">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Resume Workout
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={onPreviousSet}
                variant="outline"
                disabled={true}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Prev
              </Button>
              <Button
                onClick={onNextSet}
                variant="outline"
                disabled={true}
                className="flex-1"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}