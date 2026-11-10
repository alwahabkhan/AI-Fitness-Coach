import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-realtime-mini',
        voice: 'verse'
      })
    });

    if (!r.ok) {
      throw new Error(`OpenAI API error: ${r.status} ${r.statusText}`);
    }

    const data = await r.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error creating ephemeral session:', error);
    return res
      .status(500)
      .json({ error: 'Failed to create ephemeral session' });
  }
}
