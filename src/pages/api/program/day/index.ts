import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import {
  CreateTrainingDayRequest,
  TrainingDay
} from '@/database/program-builder.types';

async function createTrainingDay(
  data: CreateTrainingDayRequest
): Promise<TrainingDay> {
  const supabase = createServerSupabase();
  const { data: trainingDay, error } = await supabase
    .from('training_day')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return trainingDay;
}

async function getTrainingDays(programId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
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
    .eq('program_id', programId)
    .order('day_order');

  if (error) throw error;
  return data || [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🚀 Training Day API called:', req.method, req.url);

  const session = getSessionFromRequest(req);
  if (!session) {
    console.log('❌ No session found');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('✅ Session found for user:', session.user.id, session.user.role);

  try {
    if (req.method === 'POST') {
      if (session.user.role === 'trainee') {
        console.log('❌ Trainee attempted to create training day');
        return res
          .status(403)
          .json({ error: 'Trainees cannot create training days' });
      }

      console.log('📝 Creating training day with data:', req.body);
      const trainingDay = await createTrainingDay(req.body);
      console.log('✅ Training day created:', trainingDay.id);
      return res.status(201).json(trainingDay);
    }

    if (req.method === 'GET') {
      const { program_id } = req.query;
      if (typeof program_id !== 'string') {
        console.log('❌ Missing or invalid program_id');
        return res
          .status(400)
          .json({ error: 'program_id query parameter required' });
      }

      console.log('📖 Fetching training days for program:', program_id);
      const trainingDays = await getTrainingDays(program_id);
      console.log('✅ Found training days:', trainingDays.length);
      return res.status(200).json(trainingDays);
    }

    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('💥 Training days API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
