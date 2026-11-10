import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import {
  getTraineeTotalDuration,
  getProgramTotalDuration,
  getSessionDuration
} from '@/lib/duration-aggregation';
import {
  canAccessTrainee,
  canAccessProgram,
  canAccessSession
} from '@/lib/access-control';

type DurationType = 'trainee' | 'program' | 'session';

function isValidType(type: string): type is DurationType {
  return type === 'trainee' || type === 'program' || type === 'session';
}

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

  const { type, id } = req.query;

  // Validate query parameters
  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'Type parameter is required' });
  }

  if (!isValidType(type)) {
    return res.status(400).json({
      error: 'Invalid type. Must be trainee, program, or session'
    });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID parameter is required' });
  }

  try {
    // Verify access permissions
    let hasAccess = false;
    switch (type) {
      case 'trainee':
        hasAccess = await canAccessTrainee(session.user, id);
        break;
      case 'program':
        hasAccess = await canAccessProgram(session.user, id);
        break;
      case 'session':
        hasAccess = await canAccessSession(session.user, id);
        break;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch duration based on type
    let durationResult;
    switch (type) {
      case 'trainee':
        durationResult = await getTraineeTotalDuration(id);
        break;
      case 'program':
        durationResult = await getProgramTotalDuration(id);
        break;
      case 'session':
        durationResult = await getSessionDuration(id);
        break;
    }

    return res.status(200).json({
      type,
      id,
      ...durationResult
    });
  } catch (err) {
    console.error('Error fetching aggregated duration:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

