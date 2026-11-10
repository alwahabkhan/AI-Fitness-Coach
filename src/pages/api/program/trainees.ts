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

  // Allow trainees to access this endpoint (they'll get an empty array)
  if (
    session.user.role !== 'trainer' &&
    session.user.role !== 'admin' &&
    session.user.role !== 'trainee'
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const trainees = await getAllUsers();
    // session.user, 'trainee'
    const filteredTrainees = trainees.filter((trainee) => {
      // Only select trainee
      if (trainee.role !== 'trainee') return false;
      // Trainee can't view any (return empty array)
      if (session.user.role === 'trainee') return false;
      // Admin views all
      if (session.user.role === 'admin') return true;
      // Only trainer will get here
      // So return true if assigned
      if (trainee.assigned_trainer_id === session.user.id) return true;
      return false;
    });
    return res.status(200).json(filteredTrainees);
  } catch (error) {
    console.error('Error fetching trainees:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
