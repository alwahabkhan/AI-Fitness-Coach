import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { WorkoutCoachService } from '@/lib/workout-coach';
import { promptInspectorService } from '@/lib/prompt-inspector';

const workoutCoachService = new WorkoutCoachService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = session.user;

  // Get optional programId or workoutId from query
  const programId = req.query.programId as string | undefined;
  const workoutId = req.query.workoutId as string | undefined;
  const workoutOrProgramId = programId || workoutId;

  try {
    const [globalPrompt, userPrompt, userContextPrompt] = await Promise.all([
      workoutCoachService.getGlobalPrompt(),
      workoutCoachService.getUserPersonalizedPrompt(user.id),
      workoutCoachService.getUserContextPrompt(user.id)
    ]);

    // If workout/program ID is provided, get the full prompt breakdown including workout/program context and exercise contexts
    let workoutContext = undefined;
    let exerciseContexts = undefined;

    if (workoutOrProgramId) {
      try {
        const breakdown = await promptInspectorService.getWorkoutPromptBreakdown(
          user.id,
          workoutOrProgramId
        );
        workoutContext = breakdown.workoutContext;
        
        // Combine all exercise contexts
        if (breakdown.exercises && breakdown.exercises.length > 0) {
          exerciseContexts = breakdown.exercises
            .map((ex) => ex.agent_context)
            .filter(Boolean)
            .join('\n\n');
        }
      } catch (error) {
        console.error('Error fetching workout/program prompt breakdown:', error);
        // Continue without workout/exercise contexts if there's an error
      }
    }

    return res.status(200).json({
      globalPrompt,
      userPrompt,
      userContextPrompt,
      workoutContext: workoutContext || null,
      exerciseContexts: exerciseContexts || null
    });
  } catch (error) {
    console.error('Error fetching workout coach prompts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
