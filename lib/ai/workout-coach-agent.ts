/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';
import { AgentInputItem, run, tool } from '@openai/agents';
import { RealtimeAgent } from '@openai/agents/realtime';
import { WorkoutState, ExerciseGroup } from '@/types/workout';

export type WorkoutAgentContext = {
  userId: string;
  prompt: {
    custom?: string;
    user_info?: string;
    userPersonalizedPrompt?: string;
  };
  workoutState: WorkoutState;
  workoutData: ExerciseGroup[];
  agentContext: string;
  workoutPanelAction: (command: AssistantEvents['name'], params?: any) => void;
  sessionStartTime?: string; // ISO string of session start time
  sessionElapsedSeconds?: number; // Current elapsed seconds (accounting for paused time)
};

export type HistoryInput = AgentInputItem[];

export function summarizeWorkoutData(workoutData?: ExerciseGroup[]): string {
  if (!workoutData || workoutData.length === 0)
    return 'No workout data provided.';

  return workoutData
    .map((group) => {
      // Group exercises by their base name to understand the structure
      const exercisesByName = new Map<
        string,
        {
          reps: number;
          weight: number;
          setNumbers: number[];
          ids: string[];
          trainingExerciseId?: string;
          agentContext: string;
        }
      >();

      group.exercises.forEach((ex) => {
        if (!exercisesByName.has(ex.name)) {
          exercisesByName.set(ex.name, {
            reps: ex.reps,
            weight: ex.weight,
            setNumbers: [],
            ids: [],
            trainingExerciseId: (ex as any).trainingExerciseId,
            agentContext: ex.agentContext
          });
        }
        const exerciseData = exercisesByName.get(ex.name)!;
        exerciseData.setNumbers.push(ex.setNumber);
        exerciseData.ids.push(ex.id);
      });

      const hasMultipleExercises = exercisesByName.size > 1;

      if (hasMultipleExercises) {
        // Superset group
        const exerciseSequence = Array.from(exercisesByName.entries())
          .map(([name, data], index) => {
            const referenceId = data.trainingExerciseId || data.ids[0];
            return `    ${index + 1}. ${name} (${data.reps} reps, weight: ${data.weight}, id: ${referenceId}, execution instructions: ${data.agentContext})`;
          })
          .join('\n');

        return `  Group ${group.group} (id: ${group.id}) - SUPERSET (${group.sets} rounds):
${exerciseSequence}
    → Exercise instances are interleaved: Round 1 (ex1 set1, ex2 set1, ex3 set1...), Round 2 (ex1 set2, ex2 set2, ex3 set2...), etc.
    → Complete ${group.sets} rounds total with all exercises in each round
    → When modifying exercises, use the exercise id shown above, which will apply to ALL sets of that exercise`;
      } else {
        // Single exercise group
        const [exerciseName, exerciseData] = Array.from(
          exercisesByName.entries()
        )[0];
        const referenceId =
          exerciseData.trainingExerciseId || exerciseData.ids[0];
        return `  Group ${group.group} (id: ${group.id}) - SINGLE EXERCISE:
    - ${exerciseName} (${group.sets} sets x ${exerciseData.reps} reps, weight: ${exerciseData.weight}, id: ${referenceId}, execution instructions: ${exerciseData.agentContext})
    → Exercise instances are sequential: Set 1, Set 2, Set 3... up to ${group.sets} sets
    → When modifying this exercise, use id: ${referenceId}, which will apply to ALL ${group.sets} sets`;
      }
    })
    .join('\n\n');
}
const system_prompt = (
  prompt?: string,
  user_info?: string,
  agentContext?: string,
  workoutData?: ExerciseGroup[],
  userPersonalizedPrompt?: string
) => {
  const default_prompt =
    prompt ??
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

  const sessionDurationSchema = `
  Session Duration Information:
  - The current session duration is provided in system messages as "Current session duration: [duration] ([seconds] seconds)"
  - This duration already accounts for paused time - it only counts active workout time
  - CRITICAL: ALWAYS use the duration from the most recent system message when answering duration questions
  - DO NOT calculate duration from sessionStartTime - this will give incorrect results because it doesn't account for paused time
  - The system messages contain the EXACT elapsed seconds value - use this number directly
  - Format duration responses in a user-friendly way (e.g., "56 seconds", "5 minutes and 30 seconds", "about 10 minutes")
  - IMPORTANT: Provide the duration ONCE in a natural, conversational way. DO NOT repeat the same information (e.g., avoid saying "1 minute and 54 seconds, or about 1 minute and 54 seconds" - just say "about 2 minutes" or "1 minute and 54 seconds")
  - When users ask "How long has this session been going?", "How much time has passed?", or similar questions, extract the seconds value from the system message and provide a single, clear response
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
  ${sessionDurationSchema} \n\n
  Workout explanation:\n${workoutExplanation}\n`;

  return `
  ${effective_prompt}
  ${tools_description}
  ${context_instructions}

  **IMPORTANT GUIDELINES**
  - The metrics are in pounds (lbs).
  - When users ask about session duration, time elapsed, or questions like "How long has this session been going?", "How much time has passed?", or "What's the current session time?", provide the current session duration ONCE in a natural, conversational way. DO NOT repeat the same information in different formats (e.g., avoid saying both "1 minute and 54 seconds" and "about 1 minute and 54 seconds" - choose one format and use it).
  - When modifying exercises, use the exercise ID provided in the workout data summary above. This ID will apply changes to ALL sets of that exercise.
  - For single exercises, the ID shown applies to all sets (e.g., Set 1, Set 2, Set 3 all share the same base ID).
  - For supersets, each exercise has its own ID that applies to all its rounds.
  - When the user wants to do a certain action, you should execute it immediately. You should not ask for confirmation.
  - When the user says they are ready with the current exercise, you should execute the next_set tool.
  - When the workout has not started yet and the user says they are ready, you should execute the start_workout tool.
  - If the user says they are ready when resting, you should execute the skip_rest tool.
  - When the user is resting, you should not start talking about the next exercise. You should wait for the rest to finish.
  - When the workout is paused, you should stop talking about the exercises and wait for the workout to be resumed.
  - At the beginning of the workout, you should try to get more information about the conditions of the user, so if anything is wrong, you should adapt the workout.
  - If the user asks to reduce certain exercise's reps, YOU SHOULD ONLY CHANGE THE REPS OF THE EXERCISE, when calling the adapt_workout tool. This matters for all metrics. For example:
  - If the user asks to reduce certain exercise's reps, YOU SHOULD ONLY CHANGE THE REPS OF THE EXERCISE, when calling the adapt_workout tool. This matters for all metrics. For example:
  \`\`\`
  adapt_workout: {
    exercises: [
      {
        id: "exerciseId", // Use the ID from the workout data summary
        reps: 8 // ONLY specify the field you want to change
        // Do NOT specify weight, sets, or restSeconds unless explicitly requested
      }
    ]
  }
  \`\`\`
  - IMPORTANT: When using adapt_workout, ONLY specify the fields you want to change. Do NOT include fields that should remain unchanged (like restSeconds when only changing reps).
  - If user asks to change multiple properties, specify only those properties.
  - If user asks to remove an exercise, set reps: 0 (this will mark it as skipped).
  - CRITICAL: After successfully calling adapt_workout tool, YOU MUST acknowledge the change to the user positively and confirm what was updated. For example: "Got it! I've updated the reps for [exercise name] to [new value]. Ready when you are!"
  - NEVER say you couldn't update something if the adapt_workout tool executed successfully. The tool execution means the update was successful.
  \`\`\`
  adapt_workout: {
    exercises: [
      {
        id: "exerciseId", // Use the ID from the workout data summary
        reps: 8 // ONLY specify the field you want to change
        // Do NOT specify weight, sets, or restSeconds unless explicitly requested
      }
    ]
  }
  \`\`\`
  - IMPORTANT: When using adapt_workout, ONLY specify the fields you want to change. Do NOT include fields that should remain unchanged (like restSeconds when only changing reps).
  - If user asks to change multiple properties, specify only those properties.
  - If user asks to remove an exercise, set reps: 0 (this will mark it as skipped).
  `;
};

// --- Tool definitions ---
const goToExerciseParams = z.object({
  exerciseId: z.string().describe('The id of the exercise to go to.')
});
const goToGroupParams = z.object({
  groupId: z.string().describe('The id of the group to go to.')
});
const adaptWorkoutParams = z.object({
  exercises: z.array(
    z.object({
      id: z.string(),
      reps: z
        .number()
        .optional()
        .nullable()
        .describe('The reps to set for the exercise.'),
      weight: z
        .number()
        .optional()
        .nullable()
        .describe('The weight to set for the exercise.'),
      sets: z
        .number()
        .optional()
        .nullable()
        .describe('The sets to set for the exercise.'),
      restSeconds: z
        .number()
        .optional()
        .nullable()
        .describe('The rest seconds to set for the exercise.')
    })
  )
});

const emptyParams = z.object({});

const start_workout = tool<
  typeof emptyParams,
  NonNullable<WorkoutAgentContext>
>({
  name: 'start_workout',
  description: 'Start guiding the user through their workout session.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('start_workout', {});
  }
});
const pause = tool<typeof emptyParams, NonNullable<WorkoutAgentContext>>({
  name: 'pause',
  description: 'Pause the current workout session.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('pause', {});
  }
});
const resume = tool<typeof emptyParams, NonNullable<WorkoutAgentContext>>({
  name: 'resume',
  description: 'Resume the workout from where we left off.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('resume', {});
  }
});
const next_set = tool<typeof emptyParams, NonNullable<WorkoutAgentContext>>({
  name: 'next_set',
  description: 'Move on to the next set of the current exercise.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('next_set', {});
  }
});
const previous_set = tool<typeof emptyParams, NonNullable<WorkoutAgentContext>>(
  {
    name: 'previous_set',
    description: 'Repeat the previous set.',
    parameters: emptyParams,
    async execute(_, runContext) {
      const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
      workoutPanelAction('previous_set', {});
    }
  }
);
const skip_rest = tool<typeof emptyParams, NonNullable<WorkoutAgentContext>>({
  name: 'skip_rest',
  description: 'Skip the rest time.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('skip_rest', {});
  }
});
const go_to_exercise = tool<
  typeof goToExerciseParams,
  NonNullable<WorkoutAgentContext>
>({
  name: 'go_to_exercise',
  description: 'Go to a specific exercise by id.',
  parameters: goToExerciseParams,
  async execute(params, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    const { exerciseId } = params;
    workoutPanelAction('go_to_exercise', { exerciseId });
  }
});
const go_to_group = tool<
  typeof goToGroupParams,
  NonNullable<WorkoutAgentContext>
>({
  name: 'go_to_group',
  description: 'Go to a specific group by id.',
  parameters: goToGroupParams,
  async execute(params, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    const { groupId } = params;
    workoutPanelAction('go_to_group', { groupId });
  }
});
const adapt_workout = tool<typeof adaptWorkoutParams, WorkoutAgentContext>({
  name: 'adapt_workout',
  description: "Adapt the workout to the user's preferences.",
  parameters: adaptWorkoutParams,
  async execute(params, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    const { exercises } = params;
    workoutPanelAction('adapt_workout', { exercises });

    // Return success confirmation
    return {
      success: true,
      message: 'Workout adapted successfully',
      exercisesUpdated: exercises.map((e) => e.id)
    };
  }
});
const show_exercise_video = tool<
  typeof emptyParams,
  NonNullable<WorkoutAgentContext>
>({
  name: 'show_exercise_video',
  description: 'Show the exercise video.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('show_exercise_video', {});
  }
});
const hide_exercise_video = tool<
  typeof emptyParams,
  NonNullable<WorkoutAgentContext>
>({
  name: 'hide_exercise_video',
  description: 'Hide the exercise video.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('hide_exercise_video', {});
  }
});
const finish_workout = tool<
  typeof emptyParams,
  NonNullable<WorkoutAgentContext>
>({
  name: 'finish_workout',
  description: 'Finish the workout session.',
  parameters: emptyParams,
  async execute(_, runContext) {
    const { workoutPanelAction } = runContext?.context as WorkoutAgentContext;
    workoutPanelAction('finish_workout', {});
  }
});

export const createRealtimeWorkoutCoachAgent = (globalPrompt: string) =>
  new RealtimeAgent<WorkoutAgentContext>({
    name: 'AI Fitness Buddy',
    instructions: ({ context }) => {
      const instructions = system_prompt(
        globalPrompt,
        context.prompt.user_info,
        context.agentContext,
        context.workoutData,
        context.prompt.userPersonalizedPrompt
      );
      
      // Add session info if available
      if (context.sessionStartTime) {
        return `${instructions}\n\n**Current Session Information:**\n- Session started at: ${new Date(context.sessionStartTime).toLocaleTimeString()}\n- Session status: ${context.workoutState.status}\n\n**CRITICAL - Session Duration Rules:**\n1. NEVER calculate duration from sessionStartTime - this will be WRONG because it doesn't account for paused time\n2. ALWAYS find the most recent system message that contains "Current session duration:"\n3. Extract the seconds value from that message (format: "([seconds] seconds)")\n4. Use that exact seconds value when answering duration questions\n5. The system messages are updated every few seconds with the accurate duration that accounts for all paused time\n6. Provide the duration ONCE in a natural format. Choose either exact time (e.g., "1 minute and 54 seconds") OR approximate time (e.g., "about 2 minutes"), but NOT both. Example: If system message says "Current session duration: 56 seconds (56 seconds)", respond with EITHER "56 seconds" OR "about 1 minute" - do NOT say both\n7. DO NOT repeat the same information in different formats - this creates redundancy\n8. If you cannot find a system message with duration, say "I don't have the current session duration information at the moment" rather than calculating from start time`;
      }
      
      return instructions;
    },
    tools: [
      start_workout,
      pause,
      resume,
      next_set,
      previous_set,
      go_to_exercise,
      go_to_group,
      skip_rest,
      show_exercise_video,
      hide_exercise_video,
      adapt_workout,
      finish_workout
    ],
    voice: 'alloy'
  });

export const runWorkoutCoachAgent = async (
  history: AgentInputItem[],
  agentContext: WorkoutAgentContext,
  globalPrompt: string
) => {
  console.log('Agent Context', agentContext);
  const agent = createRealtimeWorkoutCoachAgent(globalPrompt);
  const response = await run(agent, history, {
    context: agentContext
  });
  return response;
};

export type AssistantEvents =
  | { name: 'start_workout' }
  | { name: 'pause' }
  | { name: 'resume' }
  | { name: 'next_set' }
  | { name: 'previous_set' }
  | { name: 'skip_rest' }
  | { name: 'go_to_exercise'; exerciseId: string }
  | { name: 'go_to_group'; groupId: string }
  | {
      name: 'adapt_workout';
      exercises: {
        id: string;
        reps?: number;
        weight?: number;
        sets?: number;
        restSeconds?: number;
      }[];
    }
  | { name: 'show_exercise_video' }
  | { name: 'hide_exercise_video' }
  | { name: 'finish_workout' };
