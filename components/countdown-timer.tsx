'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SkipForward, Pause, Play } from 'lucide-react';
import type { WorkoutState } from '@/types/workout';
import { formatWorkoutTime } from '@/lib/utils';
import { useGlobalTimer } from './global-rest-timer';

interface CountdownTimerProps {
  workoutState: WorkoutState;
  onSkipRest: () => void;
  className?: string;
}

export function CountdownTimer({
  workoutState,
  onSkipRest,
  className
}: CountdownTimerProps) {
  const { isPaused, pauseTimer, resumeTimer } = useGlobalTimer();

  // Check if we should show the small rest notification
  const shouldShowSmallRestNotification =
    workoutState.restTimeRemaining <= 15 && workoutState.restTimeRemaining > 0;

  if (!workoutState.isResting) {
    return null;
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rest Time</h3>

        <div className="mb-6">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {formatWorkoutTime(workoutState.restTimeRemaining)}
          </div>
          <div className="text-sm text-gray-500">
            Take a break and prepare for your next set
          </div>
          {shouldShowSmallRestNotification && (
            <div className="mt-2 text-sm text-orange-600 font-medium">
              ⚠️ Rest is almost over!
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {!isPaused ? (
            <Button onClick={pauseTimer} variant="outline" size="sm">
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button onClick={resumeTimer} variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
          <Button onClick={onSkipRest} variant="outline" size="sm">
            <SkipForward className="w-4 h-4 mr-2" />
            Skip Rest
          </Button>
        </div>
      </div>
    </Card>
  );
}
