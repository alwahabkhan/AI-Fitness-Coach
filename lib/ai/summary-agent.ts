import OpenAI from 'openai';
import { getOpenAIConfig } from '../env';

export interface WorkoutSummaryData {
  exercises: {
    exercise_id: string;
    sets_completed: {
      weight: number;
      reps: number;
      completed_at: string;
    }[];
    notes?: string;
    perceived_exertion?: number;
  }[];
  sessionSummary: {
    total_duration_minutes: number;
    exercises_completed: number;
    total_volume: number;
  };
  startTime: string;
}

export class WorkoutSummaryAgent {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const config = getOpenAIConfig();
    this.openai = new OpenAI({
      apiKey: config.apiKey
    });
    this.model = config.model;
  }

  async generateSummary(workoutData: WorkoutSummaryData): Promise<string> {
    try {
      const prompt = this.buildPrompt(workoutData);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a fitness coach that generates concise, motivational workout summaries. 
            Create a brief, encouraging summary (2-3 sentences max) highlighting the key achievements 
            of the workout session. Focus on positive reinforcement and specific accomplishments.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      return (
        response.choices[0]?.message?.content?.trim() ||
        'Great workout! You pushed through and completed your session.'
      );
    } catch (error) {
      console.error('Error generating workout summary:', error);
      return 'Awesome workout completed! Keep up the great work.';
    }
  }

  private buildPrompt(workoutData: WorkoutSummaryData): string {
    const { exercises, sessionSummary } = workoutData;

    // Calculate additional metrics
    const totalSets = exercises.reduce(
      (total, ex) => total + ex.sets_completed.length,
      0
    );
    const avgExertion = this.calculateAverageExertion(exercises);

    // Get exercise details
    const exerciseDetails = exercises.map((ex) => {
      const totalReps = ex.sets_completed.reduce(
        (total, set) => total + set.reps,
        0
      );
      const maxWeight = Math.max(...ex.sets_completed.map((set) => set.weight));
      return {
        id: ex.exercise_id,
        totalReps,
        maxWeight,
        sets: ex.sets_completed.length,
        notes: ex.notes,
        exertion: ex.perceived_exertion
      };
    });

    return `Generate a motivational workout summary based on this data:

Duration: ${sessionSummary.total_duration_minutes} minutes
Exercises completed: ${sessionSummary.exercises_completed}
Total volume: ${sessionSummary.total_volume} lbs
Total sets: ${totalSets}
${avgExertion ? `Average perceived exertion: ${avgExertion}/10` : ''}

Exercise breakdown:
${exerciseDetails
  .map(
    (ex, i) =>
      `${i + 1}. Exercise ${ex.id}: ${ex.sets} sets, ${ex.totalReps} total reps, max weight ${ex.maxWeight} lbs${ex.exertion ? `, exertion: ${ex.exertion}/10` : ''}${ex.notes ? `, notes: ${ex.notes}` : ''}`
  )
  .join('\n')}

Create a brief, encouraging summary highlighting the achievements and effort put in during this workout.`;
  }

  private calculateAverageExertion(
    exercises: WorkoutSummaryData['exercises']
  ): number | null {
    const exertionScores = exercises
      .map((ex) => ex.perceived_exertion)
      .filter((score): score is number => score !== undefined);

    if (exertionScores.length === 0) return null;

    const avg =
      exertionScores.reduce((sum, score) => sum + score, 0) /
      exertionScores.length;
    return Math.round(avg * 10) / 10; // Round to 1 decimal place
  }
}

export const workoutSummaryAgent = new WorkoutSummaryAgent();
