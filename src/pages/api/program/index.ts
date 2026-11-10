import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  CreateProgramRequest,
  Program,
  ProgramWithDetails
} from '@/database/program-builder.types';

async function createProgram(
  trainerId: string,
  data: CreateProgramRequest
): Promise<Program> {
  const supabase = createServerSupabase();
  const payload = {
    trainer_id: trainerId,
    trainee_id: data.trainee_id,
    name: data.name,
    description: data.description,
    max_sessions: data.max_sessions ?? null,
    session_duration_days: data.session_duration_days ?? null
  };
  const { data: program, error } = await supabase
    .from('program')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return program;
}

async function getPrograms(
  userId: string,
  role: string
): Promise<ProgramWithDetails[]> {
  const supabase = createServerSupabase();
  let query = supabase.from('program').select(`
    *,
    trainee:user!trainee_id(id, name, email, allowed_sessions),
    trainer:user!trainer_id(id, name, email),
    training_days:training_day(
      *,
      training_exercises:training_exercise(
        *,
        exercise:exercise_id(*)
      )
    )
  `);

  //
  if (role === 'trainer') {
    query = query.eq('trainer_id', userId);
  } else if (role === 'trainee') {
    query = query.eq('trainee_id', userId);
  }
  // Admin can see all programs (no filter)

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'POST') {
      if (session.user.role === 'trainee') {
        return res
          .status(403)
          .json({ error: 'Trainees cannot create programs' });
      }

      const program = await createProgram(session.user.id, req.body);
      return res.status(201).json(program);
    }

    if (req.method === 'GET') {
      const { traineeId } = req.query;

      // If traineeId is provided, fetch programs for that specific trainee
      if (traineeId && typeof traineeId === 'string') {
        // Verify trainer has access to this trainee (if user is a trainer)
        if (session.user.role === 'trainer') {
          // Verify the trainee is assigned to this trainer
          const supabase = createServerSupabase();
          const { data: trainee } = await supabase
            .from('user')
            .select('assigned_trainer_id')
            .eq('id', traineeId)
            .single();

          if (!trainee || trainee.assigned_trainer_id !== session.user.id) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }

        const programs = await getPrograms(traineeId, 'trainee');
        return res.status(200).json(programs);
      }

      const programs = await getPrograms(session.user.id, session.user.role);
      return res.status(200).json(programs);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Programs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
