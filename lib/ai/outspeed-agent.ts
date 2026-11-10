import { ExerciseGroup } from '@/types/workout';
import { summarizeWorkoutData } from './workout-coach-agent';

export const buildOutspeedAgentInstructions = (
  globalPrompt: string,
  userPersonalizedPrompt: string,
  agentContext: string,
  workoutData: ExerciseGroup[],
  user_info: string
) => {
  const default_prompt =
    globalPrompt ??
    `
    You are an AI Workout Coach providing real-time guidance during fitness training sessions. You are motivational, knowledgeable about exercise form and safety, and focused on helping trainees complete their workouts effectively.

    **Key responsibilities:**
    - Guide users through their workout plans step by step
    - Provide encouragement and motivation throughout the session
    - Monitor workout progress and collect performance data
    - Ensure proper form and safety during exercises
    - Adapt workouts when necessary based on user feedback
    - Keep detailed records of sets, reps, weights, and performance

    **Communication style:**
    - Be enthusiastic and motivational but not overwhelming
    - Keep messages concise during active workout periods
    - Ask for specific feedback after each set (reps completed, weight used)
    - Celebrate achievements and progress
    - Be supportive when users struggle or need modifications

    You have access to tools for controlling workout flow and recording session data.
    `;

  const effective_prompt = userPersonalizedPrompt || default_prompt;

  const tools_description = `
  You have the following tools at your disposal:
  - start_workout: Start the workout session
  - pause: Pause the workout
  - resume: Resume the workout
  - next_set: Move to the next set
  - previous_set: Go back to the previous set
  - go_to_exercise: Go to a specific exercise by id
  - go_to_group: Go to a specific group by id
  - skip_rest: Skip the rest time
  - show_exercise_video: Show the exercise video on mobile
  - hide_exercise_video: Hide the exercise video on mobile
  - adapt_workout: Adapt the workout to the user's preferences
  - finish_workout: Finish the workout session
  `;

  const workoutDataSchema = `
  The workoutData you receive is an array of ExerciseGroup objects. Here is the structure:
  
  ExerciseGroup: {
    group: number; // The group number in the workout (0-indexed)
    id: string; // Unique group id
    exercises: Exercise[]; // Array of exercise instances (pre-generated for all sets)
    sets: number; // Total number of sets in this group
  }
  
  Exercise: {
    id: string; // Unique exercise id (same for all sets of the same exercise)
    name: string; // Name of the exercise
    videoUrl: string; // Video demonstration URL
    reps: number; // Number of reps for this set
    setNumber: number; // Which set number this is (1, 2, 3, etc.)
    weight: number; // Weight to use for this set
    restSeconds: number; // Rest time after this set (seconds)
    completedSet: CompletedSet | null; // Completion status for this specific set
    agentContext: string; // Additional context for the agent
  }
  
  CompletedSet: {
    weight: number; // Actual weight used
    reps: number; // Actual reps completed
    completedAt: Date; // When this set was completed
  }
  
  IMPORTANT: The exercises array contains pre-generated exercise instances for all sets. 
  For a group with 2 exercises and 3 sets each, the exercises array will contain 6 items:
  [ex1_set1, ex2_set1, ex1_set2, ex2_set2, ex1_set3, ex2_set3] (interleaved order)
  `;

  const workoutStateSchema = `
  The workoutState you receive after each action is an object with the following properties:
  - currentGroup: number; // The current group index (0-indexed)
  - currentExerciseIndex: number; // The current exercise instance index within the group
  - status: string; // The current status of the workout ('not-started', 'in-progress', 'paused', 'completed')
  - restTimeRemaining: number; // The remaining rest time in seconds
  - isResting: boolean; // Whether the user is currently resting
  `;

  const workoutExplanation = `
  IMPORTANT: The workout structure has been redesigned with pre-generated exercise instances:
  
  1. **Single Exercise Groups**: Contains multiple instances of the same exercise, one for each set.
     Example: Bench Press with 3 sets = [BenchPress_Set1, BenchPress_Set2, BenchPress_Set3]
  
  2. **Multi-Exercise Groups (Supersets)**: Contains exercise instances in interleaved order.
     Example: Push-ups + Squats with 3 sets each = [PushUps_Set1, Squats_Set1, PushUps_Set2, Squats_Set2, PushUps_Set3, Squats_Set3]
  
  3. **Progress Tracking**: Each exercise instance has a single completedSet field (not an array).
     When an exercise set is completed, that specific instance gets marked with completion data.
  
  4. **Navigation**: The system tracks currentGroup and currentExerciseIndex to know exactly which 
     exercise set is currently active. Moving to the "next set" advances through the pre-generated sequence.
  `;

  const context_instructions = `${agentContext ? `Workout guideline: ${agentContext}` : 'No personalized workout guideline is available.'}
  ${workoutDataSchema} \n\n
  ${workoutStateSchema} \n\n
  Current loaded workout plan:\n${summarizeWorkoutData(workoutData)}\n
  Workout explanation:\n${workoutExplanation}\n`;

  return `
  ${effective_prompt}
  ${user_info ? `\n**User Information/Context:**\n${user_info}\n` : ''}
  ${tools_description}
  ${context_instructions}

  **IMPORTANT GUIDELINES**
  - If the user asks for a specific exercise or a group, you should output the \`id\` of the exercise or the group, not the name. Look for the name and return the id.
  - When the user wants to do a certain action, you should execute it immediately. You should not ask for confirmation.
  - When the user says they are ready with the current exercise, you should execute the next_set tool.
  - When the workout has not started yet and the user says they are ready, you should execute the start_workout tool.
  - If the user says they are ready when resting, you should execute the skip_rest tool.
  - When the user is resting, you should not start talking about the next exercise. You should wait for the rest to finish.
  - When the workout is paused, you should stop talking about the exercises and wait for the workout to be resumed.
  - At the beginning of the workout, you should try to get more information about the conditions of the user, so if anything is wrong, you should adapt the workout.
  - If the user asks to reduce certain exercise's reps, YOU SHOULD ONLY CHANGE THE REPS OF THE EXERCISE, when calling the adapt_workout tool. This matters for all metrics. For example:
  \`\`\`
  adapt_workout: {
    exercises: [
      {
        id: "exerciseId",
        reps: 8 // ONLY specify the field you want to change
        // Do NOT specify weight, sets, or restSeconds unless explicitly requested
      }
    ]
  }
  \`\`\`
  - IMPORTANT: When using adapt_workout, ONLY specify the fields you want to change. Do NOT include fields that should remain unchanged (like restSeconds when only changing reps).
  - If user asks to change multiple properties, specify only those properties.
  - If user asks to remove an exercise, set reps: 0, sets: 0, weight: 0 (but still don't specify restSeconds unless requested).
  `;
};

const startWorkoutSchema = {
  name: 'start_workout',
  type: 'function',
  description: 'Start the workout',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const pauseWorkoutSchema = {
  name: 'pause',
  type: 'function',
  description: 'Pause the workout',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const resumeWorkoutSchema = {
  name: 'resume',
  type: 'function',
  description: 'Resume the workout',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const nextSetSchema = {
  name: 'next_set',
  type: 'function',
  description: 'Move to the next set',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const previousSetSchema = {
  name: 'previous_set',
  type: 'function',
  description: 'Go back to the previous set',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const skipRestSchema = {
  name: 'skip_rest',
  type: 'function',
  description: 'Skip the rest time',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const goToExerciseSchema = {
  name: 'go_to_exercise',
  type: 'function',
  description: 'Go to a specific exercise by id',
  parameters: {
    type: 'object',
    properties: {
      exerciseId: {
        type: 'string',
        description: 'The id of the exercise to go to'
      }
    },
    required: []
  }
};
const goToGroupSchema = {
  name: 'go_to_group',
  type: 'function',
  description: 'Go to a specific group by id',
  parameters: {
    type: 'object',
    properties: {
      groupId: {
        type: 'string',
        description: 'The id of the group to go to'
      }
    },
    required: []
  }
};
const adaptWorkoutSchema = {
  name: 'adapt_workout',
  type: 'function',
  description: "Adapt the workout to the user's preferences",
  parameters: {
    type: 'object',
    properties: {
      exercises: {
        type: 'array',
        description: 'The exercises to adapt',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The id of the exercise to adapt'
            },
            reps: {
              type: 'number',
              description: 'The reps to adapt'
            },
            weight: {
              type: 'number',
              description: 'The weight to adapt'
            },
            sets: {
              type: 'number',
              description: 'The sets to adapt'
            }
          }
        },
        required: []
      }
    },
    required: []
  }
};
const showExerciseVideoSchema = {
  name: 'show_exercise_video',
  type: 'function',
  description: 'Show the exercise video',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const hideExerciseVideoSchema = {
  name: 'hide_exercise_video',
  type: 'function',
  description: 'Hide the exercise video',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};
const setTimerSchema = {
  name: 'set_timer',
  type: 'function',
  description: 'Set a timer for a given amount of time',
  parameters: {
    type: 'object',
    properties: {
      time: {
        type: 'number',
        description: 'The amount of time to set the timer for in seconds',
      },
      prompt: {
        type: 'string',
        description:
          'The prompt sent to the bot when the timer finishes, telling it what to remind the user about.',
      },
    },
    required: ['time', 'prompt'],
  }
};
const finishWorkoutSchema = {
  name: 'finish_workout',
  type: 'function',
  description: 'Finish the workout',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const outspeedAgentTools = [
  startWorkoutSchema,
  pauseWorkoutSchema,
  resumeWorkoutSchema,
  nextSetSchema,
  previousSetSchema,
  skipRestSchema,
  goToExerciseSchema,
  goToGroupSchema,
  adaptWorkoutSchema,
  showExerciseVideoSchema,
  hideExerciseVideoSchema,
  setTimerSchema,
  finishWorkoutSchema
];
