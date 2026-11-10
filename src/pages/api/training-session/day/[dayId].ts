/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  calculateExerciseProgression,
  buildSessionResults
} from '@/lib/progression';
import { z } from 'zod';

const createSessionSchema = z.object({
  session_number: z.number().min(1).default(1),
  program_id: z.string().uuid(),
  auto_complete: z.boolean().default(false)
});

async function getSessionsForDay(dayId: string) {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('training_session')
    .select('*')
    .eq('training_day_id', dayId)
    .order('session_number');

  if (error) throw error;
  return data || [];
}

async function createSessionForDay(
  dayId: string,
  data: z.infer<typeof createSessionSchema>,
  userId: string
) {
  const supabase = createServerSupabase();

  // Verify the training day exists and belongs to a program the user can access
  const { data: trainingDay, error: dayError } = await supabase
    .from('training_day')
    .select(
      `
      id, 
      program_id,
      program:program_id(trainee_id, trainer_id)
    `
    )
    .eq('id', dayId)
    .single();

  if (dayError || !trainingDay) {
    throw new Error('Training day not found');
  }

  // Check if user has access (is trainee or trainer)
  // const program = trainingDay.program as any;
  // if (program.trainee_id !== userId && program.trainer_id !== userId) {
  //   throw new Error('Access denied');
  // }

  const startTime = new Date();

  const sessionData: any = {
    program_id: data.program_id,
    training_day_id: dayId,
    session_number: data.session_number,
    user_id: userId,
    start_time: startTime.toISOString(),
    status: data.auto_complete ? 'completed' : 'in_progress'
  };

  // If auto_complete, calculate progression and fill results
  if (data.auto_complete) {
    try {
      console.log(
        'Calculating progression for day:',
        dayId,
        'session:',
        data.session_number
      );

      const progressedExercises = await calculateExerciseProgression(
        dayId,
        data.session_number
      );

      console.log('Progressed exercises:', progressedExercises.length);

      if (progressedExercises.length > 0) {
        // Fetch training exercise details to get exercise names
        const trainingExerciseIds = progressedExercises.map((ex) => ex.id);

        const { data: trainingExercises, error: exerciseError } = await supabase
          .from('training_exercise')
          .select(
            `
            id,
            exercise_id,
            exercise:exercise_id(
              id,
              name,
              video_url,
              main_muscle
            )
          `
          )
          .in('id', trainingExerciseIds);

        if (!exerciseError && trainingExercises) {
          // Create a map for quick lookup
          const exerciseMap = trainingExercises.reduce(
            (acc, te) => {
              acc[te.id] = te.exercise;
              return acc;
            },
            {} as Record<string, any>
          );

          // Enrich progressed exercises with exercise details
          const enrichedExercises = progressedExercises.map((progressed) => ({
            ...progressed,
            exercise: exerciseMap[progressed.id] || { name: 'Unknown Exercise' }
          }));

          const results = buildSessionResults(enrichedExercises, startTime);
          sessionData.results = results;
          sessionData.end_time = new Date(
            startTime.getTime() +
              results.session_summary.total_duration_minutes * 60 * 1000
          ).toISOString();

          console.log(
            'Built session results:',
            JSON.stringify(results, null, 2)
          );
        }
      } else {
        console.warn('No exercises found for progression');
        sessionData.results = {
          exercises: [],
          session_summary: {
            total_duration_minutes: 0,
            exercises_completed: 0
          }
        };
      }
    } catch (error) {
      console.error('Error calculating progression:', error);
      sessionData.results = {
        exercises: [],
        session_summary: {
          total_duration_minutes: 0,
          exercises_completed: 0
        }
      };
    }
  } else {
    sessionData.results = {};
  }

  console.log(
    'Creating session with data:',
    JSON.stringify(sessionData, null, 2)
  );

  // Create the session
  const { data: session, error } = await supabase
    .from('training_session')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw error;
  }

  console.log('Session created successfully:', session.id);
  return session;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { dayId } = req.query;
  if (typeof dayId !== 'string') {
    return res.status(400).json({ error: 'Invalid day ID' });
  }

  try {
    if (req.method === 'GET') {
      const sessions = await getSessionsForDay(dayId);
      return res.status(200).json(sessions);
    }

    if (req.method === 'POST') {
      const { success, data, error } = createSessionSchema.safeParse(req.body);
      if (!success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten().fieldErrors
        });
      }

      const newSession = await createSessionForDay(
        dayId,
        data,
        session.user.id
      );
      return res.status(201).json(newSession);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Training session day API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
