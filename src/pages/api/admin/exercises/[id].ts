import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabase } from '@/lib/supabase';
import { createCentralizedExerciseService } from '@/lib/centralized_exercise';
import { getSessionFromRequest } from '@/lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  const { id } = req.query;

  try {
    const supabase = createServerSupabase();
    const exerciseService = createCentralizedExerciseService(supabase);

    if (req.method === 'PUT') {
      const result = await exerciseService.update(id as string, req.body);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json(result.data);
    }

    if (req.method === 'DELETE') {
      const result = await exerciseService.delete(id as string);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(204).end();
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('Exercise API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
