import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

async function getCentralizedExercises(search?: string) {
  const supabase = createServerSupabase();
  let query = supabase.from('centralized_exercise').select('*').order('name');

  if (search) {
    query = query.or(`name.ilike.%${search}%,short_name.ilike.%${search}%`);
  }

  const { data, error } = await query;
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
    if (req.method === 'GET') {
      const { search } = req.query;
      const exercises = await getCentralizedExercises(search as string);
      return res.status(200).json(exercises);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Centralized exercises API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
