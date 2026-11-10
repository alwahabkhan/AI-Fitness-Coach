import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser } from '@/lib/auth';
import { createSessionForResponse } from '@/lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const user = await authenticateUser({ email, password });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create session
    createSessionForResponse(user, res);

    return res.status(200).json({
      message: 'Login successful',
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
