import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import { createUser, getAllUsers, updateUser } from '@/lib/auth';

const deleteBodySchema = z.object({
  userId: z.string().uuid('Valid user ID is required')
});

const postBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['trainer', 'trainee', 'admin'], {
    errorMap: () => ({ message: 'Role must be trainer, trainee, or admin' })
  }),
  assigned_trainer_id: z.string().uuid().optional().nullable(),
  allowed_sessions: z.number().int().min(0).optional().nullable()
});

const putBodySchema = z.object({
  userId: z.string().uuid('Valid user ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional(),
  role: z.enum(['trainer', 'trainee', 'admin'], {
    errorMap: () => ({ message: 'Role must be trainer, trainee, or admin' })
  }),
  assigned_trainer_id: z.string().uuid().optional().nullable(),
  allowed_sessions: z.number().int().min(0).optional().nullable()
});

async function deleteHandler(
  body: z.infer<typeof deleteBodySchema>,
  currentUser: { id: string; role: string; is_super_admin?: boolean }
) {
  const { userId } = body;
  const supabase = createServerSupabase();

  // Prevent self-deletion
  if (userId === currentUser.id) {
    throw new Error('Cannot delete your own account');
  }

  // Get the target user to check their role
  const { data: targetUser, error: fetchError } = await supabase
    .from('user')
    .select('role, is_super_admin')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch target user:', fetchError);
    throw new Error('User not found');
  }

  // Authorization checks:
  // - Superadmin can delete anyone
  // - Admin can delete trainers and trainees, but NOT other admins
  const canDelete =
    currentUser.is_super_admin ||
    (currentUser.role === 'admin' && targetUser.role !== 'admin');

  if (!canDelete) {
    throw new Error('Insufficient permissions to delete this user');
  }

  const { data: user, error } = await supabase
    .from('user')
    .delete()
    .eq('id', userId)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to delete user:', error);
    throw new Error('Failed to delete user');
  }

  return { user };
}

async function getHandler() {
  const users = await getAllUsers();
  return { users };
}

async function postHandler(body: z.infer<typeof postBodySchema>) {
  const { name, email, password, role, assigned_trainer_id, allowed_sessions } =
    body;
  const supabase = createServerSupabase();

  const { data: existingUser } = await supabase
    .from('user')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const user = await createUser({
    name,
    email,
    password,
    role,
    assigned_trainer_id,
    allowed_sessions
  });

  return { user };
}

async function putHandler(body: z.infer<typeof putBodySchema>) {
  const {
    userId,
    name,
    email,
    password,
    role,
    assigned_trainer_id,
    allowed_sessions
  } = body;

  const user = await updateUser(userId, {
    name,
    email,
    password,
    role,
    assigned_trainer_id,
    allowed_sessions
  });

  if (!user) {
    throw new Error('Failed to update user');
  }

  return { user };
}

function createUsersHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = getSessionFromRequest(req);

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (session.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Forbidden - Admin access required' });
    }

    try {
      if (req.method === 'GET') {
        const result = await getHandler();
        return res.status(200).json(result);
      } else if (req.method === 'POST') {
        const { success, data, error } = postBodySchema.safeParse(req.body);

        if (!success) {
          return res.status(400).json({
            error: 'Invalid request body',
            details: error.flatten().fieldErrors
          });
        }

        const result = await postHandler(data);
        return res.status(201).json(result);
      } else if (req.method === 'DELETE') {
        const { success, data, error } = deleteBodySchema.safeParse(req.body);

        if (!success) {
          return res.status(400).json({
            error: 'Invalid request body',
            details: error.flatten().fieldErrors
          });
        }

        const result = await deleteHandler(data, session.user);
        return res.status(200).json(result);
      } else if (req.method === 'PUT') {
        const { success, data, error } = putBodySchema.safeParse(req.body);
        if (!success) {
          return res.status(400).json({
            error: 'Invalid request body',
            details: error.flatten().fieldErrors
          });
        }

        const result = await putHandler(data);
        return res.status(200).json(result);
      } else {
        return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User with this email already exists') {
          return res.status(400).json({ error: error.message });
        }
        if (error.message === 'Cannot delete your own account') {
          return res.status(400).json({ error: error.message });
        }
        if (error.message === 'Insufficient permissions to delete this user') {
          return res.status(403).json({ error: error.message });
        }
        if (error.message === 'User not found') {
          return res.status(404).json({ error: error.message });
        }
        if (
          error.message === 'Failed to fetch users' ||
          error.message === 'Failed to create user' ||
          error.message === 'Failed to delete user'
        ) {
          console.error('Database error:', error);
          return res.status(500).json({ error: 'Database operation failed' });
        }
      }
      console.error('Error in users API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createUsersHandler();
