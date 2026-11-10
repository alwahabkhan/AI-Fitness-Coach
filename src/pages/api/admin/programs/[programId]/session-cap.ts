import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import { getProgramSessionCapUsage } from '@/lib/program-session-cap';

const updateSchema = z
  .object({
    maxSessions: z.number().int().positive().max(500).nullable(),
    sessionWindowDays: z.number().int().positive().max(365).nullable()
  })
  .refine(
    (val) => val.maxSessions === null || val.sessionWindowDays !== null,
    {
      message: 'sessionWindowDays is required when maxSessions is provided',
      path: ['sessionWindowDays']
    }
  )
  .refine(
    (val) => val.maxSessions !== null || val.sessionWindowDays === null,
    {
      message: 'maxSessions is required when sessionWindowDays is provided',
      path: ['maxSessions']
    }
  );

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);
  if (!session?.user || session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { programId } = req.query;
  if (typeof programId !== 'string') {
    return res.status(400).json({ error: 'Invalid program id' });
  }

  try {
    const supabase = createServerSupabase();

    if (req.method === 'GET') {
      const usage = await getProgramSessionCapUsage(supabase, programId);
      return res.status(200).json(usage);
    }

    if (req.method === 'PUT') {
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors
        });
      }

      const { maxSessions, sessionWindowDays } = parseResult.data;

      const { data: updatedProgram, error: updateError } = await supabase
        .from('program')
        .update({
          max_sessions: maxSessions,
          session_duration_days: sessionWindowDays
        })
        .eq('id', programId)
        .select('id')
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Program not found' });
        }
        throw updateError;
      }

      if (!updatedProgram) {
        return res.status(404).json({ error: 'Program not found' });
      }

      const usage = await getProgramSessionCapUsage(supabase, programId);

      return res.status(200).json(usage);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin session cap API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

