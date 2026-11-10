import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  UpdateProgramRequest,
  ProgramWithDetails
} from '@/database/program-builder.types';

async function getProgram(id: string): Promise<ProgramWithDetails> {
  const supabase = createServerSupabase();

  // Get program data
  const { data: program, error: programError } = await supabase
    .from('program')
    .select('*')
    .eq('id', id)
    .single();

  if (programError) throw programError;

  // Get trainee and trainer data
  const { data: trainee, error: traineeError } = await supabase
    .from('user')
    .select('id, name, email, allowed_sessions')
    .eq('id', program.trainee_id)
    .single();

  const { data: trainer, error: trainerError } = await supabase
    .from('user')
    .select('id, name, email')
    .eq('id', program.trainer_id)
    .single();

  if (traineeError || trainerError) {
    throw new Error('Failed to fetch user data');
  }

  // Get training days with exercises
  const { data: training_days, error: daysError } = await supabase
    .from('training_day')
    .select(
      `
      *,
      training_exercises:training_exercise(
        *,
        exercise:exercise_id(*)
      )
    `
    )
    .eq('program_id', id)
    .order('day_order');

  if (daysError) throw daysError;

  return {
    ...program,
    trainee,
    trainer,
    training_days: training_days || []
  };
}

async function updateProgram(id: string, data: UpdateProgramRequest) {
  const supabase = createServerSupabase();
  const { data: program, error } = await supabase
    .from('program')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return program;
}

async function deleteProgram(id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from('program').delete().eq('id', id);

  if (error) throw error;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid program ID' });
  }

  try {
    if (req.method === 'GET') {
      const program = await getProgram(id);
      return res.status(200).json(program);
    }

    if (req.method === 'PUT') {
      // Trainees can now edit programs assigned to them
      if (session.user.role === 'trainee') {
        // Verify the program is assigned to this trainee
        const existingProgram = await getProgram(id);
        if (existingProgram.trainee_id !== session.user.id) {
          return res
            .status(403)
            .json({ error: 'You can only edit programs assigned to you' });
        }
      }
      const program = await updateProgram(id, req.body);
      return res.status(200).json(program);
    }

    if (req.method === 'DELETE') {
      if (session.user.role === 'trainee') {
        return res
          .status(403)
          .json({ error: 'Trainees cannot delete programs' });
      }
      await deleteProgram(id);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Program API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
