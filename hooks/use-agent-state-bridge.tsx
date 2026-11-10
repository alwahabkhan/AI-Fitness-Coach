/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import { WorkoutEvent } from '@/state-machine/workout';
import { AssistantEvents } from '@/lib/ai/workout-coach-agent';

/**
 * Bridges function call events from the agent/session to the state machine.
 * @param send The state machine's send function
 */
export function useAgentStateBridge<EventType = WorkoutEvent>(
  send: (event: EventType) => void
) {
  const handleWorkoutPanelAction = useCallback(
    (name: AssistantEvents['name'], params?: any) => {
      if (typeof params === 'string') {
        params = JSON.parse(params);
      }
      let mapped: WorkoutEvent | null = null;
      switch (name) {
        case 'next_set':
          mapped = { type: 'event.next_set' };
          break;
        case 'previous_set':
          mapped = { type: 'event.previous_set' };
          break;
        case 'go_to_exercise':
          mapped = {
            type: 'event.go_to_exercise',
            exerciseId: params.exerciseId
          };
          break;
        case 'go_to_group':
          mapped = { type: 'event.go_to_group', groupId: params.groupId };
          break;
        case 'pause':
          mapped = { type: 'event.pause' };
          break;
        case 'resume':
          mapped = { type: 'event.resume' };
          break;
        case 'start_workout':
          mapped = { type: 'event.start' };
          break;
        case 'skip_rest':
          mapped = { type: 'event.skip_rest' };
          break;
        case 'show_exercise_video':
          mapped = { type: 'event.show_exercise_video' };
          break;
        case 'hide_exercise_video':
          mapped = { type: 'event.hide_exercise_video' };
          break;
        case 'adapt_workout':
          mapped = { type: 'event.adapt_workout', exercises: params.exercises };
          break;
        case 'finish_workout':
          mapped = { type: 'event.finish_workout' };
          break;
        default:
          mapped = null;
      }
      if (mapped) {
        send(mapped as EventType);
      }
    },
    [send]
  );

  return { handleWorkoutPanelAction };
}
