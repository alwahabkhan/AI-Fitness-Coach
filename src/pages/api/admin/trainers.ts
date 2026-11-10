import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { getAllUsers } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    const allUsers = await getAllUsers();
    const trainers = allUsers.filter((user) => user.role === 'trainer');
    return res.status(200).json({ trainers });
  } catch (error) {
    console.error('Error fetching trainers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
