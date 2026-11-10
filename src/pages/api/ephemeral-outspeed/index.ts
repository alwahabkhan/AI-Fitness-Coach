import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const r = await fetch('https://api.outspeed.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OUTSPEED_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!r.ok) {
      const error = await r.text();
      console.error('failed to generate ephemeral key:', error);
      res.status(r.status).json({ error: 'Failed to generate token' });
      return;
    }

    const data = await r.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error creating ephemeral session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
