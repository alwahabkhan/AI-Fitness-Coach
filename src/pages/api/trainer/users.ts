/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import { createUser, updateUser } from '@/lib/auth';

const deleteBodySchema = z.object({
  userId: z.string().uuid('Valid user ID is required')
});

const postBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const putBodySchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional()
});

async function deleteHandler(
  body: z.infer<typeof deleteBodySchema>,
  currentUserId: string
) {
  const { userId } = body;
  const supabase = createServerSupabase();

  // Verify the trainee belongs to this trainer
  const { data: targetUser, error: fetchError } = await supabase
    .from('user')
    .select('assigned_trainer_id, role')
    .eq('id', userId)
    .single();

  if (fetchError || !targetUser) {
    throw new Error('User not found');
  }

  if (
    targetUser.assigned_trainer_id !== currentUserId ||
    targetUser.role !== 'trainee'
  ) {
    throw new Error('Insufficient permissions to delete this user');
  }

  const { data: user, error } = await supabase
    .from('user')
    .delete()
    .eq('id', userId)
    .select('id')
    .single();

  if (error) {
    throw new Error('Failed to delete user');
  }

  return { user };
}

async function postHandler(
  body: z.infer<typeof postBodySchema>,
  currentUserId: string
) {
  const { name, email, password } = body;
  const supabase = createServerSupabase();

  const { data: existingUser } = await supabase
    .from('user')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Force role to trainee and assign to current trainer
  const user = await createUser({
    name,
    email,
    password,
    role: 'trainee',
    assigned_trainer_id: currentUserId,
    allowed_sessions: null
  });

  return { user };
}

async function putHandler(
  body: z.infer<typeof putBodySchema>,
  currentUserId: string
) {
  const { userId, name, email, password } = body;
  const supabase = createServerSupabase();

  // Verify ownership
  const { data: targetUser } = await supabase
    .from('user')
    .select('assigned_trainer_id')
    .eq('id', userId)
    .single();

  if (!targetUser || targetUser.assigned_trainer_id !== currentUserId) {
    throw new Error('Insufficient permissions to update this user');
  }

  const user = await updateUser(userId, {
    name,
    email,
    password,
    role: 'trainee',
    assigned_trainer_id: currentUserId, // Ensure it stays assigned to trainer
    allowed_sessions: null
  });

  if (!user) {
    throw new Error('Failed to update user');
  }

  return { user };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = getSessionFromRequest(req);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (session.user.role !== 'trainer') {
    return res
      .status(403)
      .json({ error: 'Forbidden - Trainer access required' });
  }

  try {
    if (req.method === 'POST') {
      const { success, data, error } = postBodySchema.safeParse(req.body);
      if (!success) throw new Error('Invalid request body');
      const result = await postHandler(data, session.user.id);
      return res.status(201).json(result);
    } else if (req.method === 'DELETE') {
      const { success, data, error } = deleteBodySchema.safeParse(req.body);
      if (!success) throw new Error('Invalid request body');
      const result = await deleteHandler(data, session.user.id);
      return res.status(200).json(result);
    } else if (req.method === 'PUT') {
      const { success, data, error } = putBodySchema.safeParse(req.body);
      if (!success) throw new Error('Invalid request body');
      const result = await putHandler(data, session.user.id);
      return res.status(200).json(result);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Trainer users API Error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return res.status(400).json({ error: message });
  }
}
