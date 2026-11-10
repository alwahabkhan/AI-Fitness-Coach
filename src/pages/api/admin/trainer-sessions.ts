/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

const requestSchema = z.object({
  trainerIds: z.array(z.string().uuid())
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session || session.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { trainerIds } = requestSchema.parse(req.body);

    if (trainerIds.length === 0) {
      return res.status(200).json({ sessionCounts: {} });
    }

    const supabase = createServerSupabase();

    // First, get all program IDs for these trainers
    const { data: programs, error: programError } = await supabase
      .from('program')
      .select('id')
      .in('trainer_id', trainerIds);

    if (programError) {
      console.error('Error fetching programs:', programError);
      return res.status(500).json({ error: 'Failed to fetch session counts' });
    }

    const programIds = programs?.map((p) => p.id) || [];

    if (programIds.length === 0) {
      return res
        .status(200)
        .json({
          sessionCounts: trainerIds.reduce(
            (acc, id) => ({ ...acc, [id]: 0 }),
            {}
          )
        });
    }

    // Get all completed training sessions for programs created by these trainers
    const { data: sessions, error } = await supabase
      .from('training_session')
      .select('id, program:program_id(trainer_id)')
      .eq('status', 'completed')
      .in('program_id', programIds);

    if (error) {
      console.error('Error fetching trainer sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch session counts' });
    }

    // Count sessions per trainer
    const sessionCounts: Record<string, number> = {};
    trainerIds.forEach((id) => {
      sessionCounts[id] = 0;
    });

    sessions?.forEach((session: any) => {
      if (session.program?.trainer_id) {
        sessionCounts[session.program.trainer_id] =
          (sessionCounts[session.program.trainer_id] || 0) + 1;
      }
    });

    return res.status(200).json({ sessionCounts });
  } catch (error) {
    console.error('Error in trainer sessions API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
