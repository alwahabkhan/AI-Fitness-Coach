/**
 * lib/auth.ts
 *
 * - Handles user(s) authentication and fetching operations.
 */
import bcrypt from 'bcryptjs';
import { createAdminSupabase } from './supabase';
import { User, UserRole } from '@/database/derived.types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'trainer' | 'trainee' | 'admin';
  agent_context?: string;
  assigned_trainer_id?: string | null;
  allowed_sessions?: number | null;
}

export interface UpdateUserData {
  name: string;
  email: string;
  password?: string;
  role: 'trainer' | 'trainee' | 'admin';
  assigned_trainer_id?: string | null;
  allowed_sessions?: number | null;
}

export type UserWithoutPassword = Omit<User, 'password' | 'token_meta'>;

// Authentication functions
export async function authenticateUser(
  credentials: LoginCredentials
): Promise<UserWithoutPassword | null> {
  const supabase = createAdminSupabase();

  try {
    const { data: user, error } = await supabase
      .from('user')
      .select(
        'id, name, email, password, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions'
      )
      .eq('email', credentials.email)
      .single();

    if (error || !user) {
      return null;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.password
    );
    if (!isValidPassword) {
      return null;
    }

    // Separating password from user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function createUser(
  userData: CreateUserData
): Promise<UserWithoutPassword | null> {
  const supabase = createAdminSupabase();

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const { data: user, error } = await supabase
      .from('user')
      .insert({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        agent_context: userData.agent_context,
        assigned_trainer_id: userData.assigned_trainer_id,
        allowed_sessions: userData.allowed_sessions
      })
      .select(
        'id, name, email, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions'
      )
      .single();

    if (error || !user) {
      console.error('User creation error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('User creation error:', error);
    return null;
  }
}

export async function updateUser(
  userId: string,
  userData: UpdateUserData
): Promise<UserWithoutPassword | null> {
  const supabase = createAdminSupabase();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      assigned_trainer_id: userData.assigned_trainer_id,
      allowed_sessions: userData.allowed_sessions
    };

    // Hash password if provided
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      updateData.password = hashedPassword;
    }

    const { data: user, error } = await supabase
      .from('user')
      .update(updateData)
      .eq('id', userId)
      .select(
        'id, name, email, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions'
      )
      .single();

    if (error || !user) {
      console.error('User update error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('User update error:', error);
    return null;
  }
}

export async function getUserById(
  userId: string
): Promise<UserWithoutPassword | null> {
  const supabase = createAdminSupabase();

  try {
    const { data: user, error } = await supabase
      .from('user')
      .select(
        'id, name, email, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions'
      )
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Get users based on current user (and role)
export async function getUsersForCurrentUser(
  currentUser: UserWithoutPassword,
  role?: UserRole
): Promise<UserWithoutPassword[]> {
  const supabase = createAdminSupabase();

  try {
    let query = supabase
      .from('user')
      .select(
        'id, name, email, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions'
      )
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Get users error:', error);
      return [];
    }

    if (!users) return [];

    switch (currentUser.role) {
      case 'admin':
        return users;
      case 'trainer':
        return users.filter(
          (user) =>
            // Trainers can see themselves
            user.id === currentUser.id ||
            // Or trainees assigned to them
            user.assigned_trainer_id === currentUser.id
        );
      default: // Basically, trainees; they can only see themselves
        return users.filter((user) => user.id == currentUser.id);
    }
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
}

/**
 * Returns all users
 */
export async function getAllUsers(
  role?: UserRole
): Promise<UserWithoutPassword[]> {
  const supabase = createAdminSupabase();

  try {
    const query = supabase
      .from('user')
      .select(
        'id, name, email, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions'
      )
      .order('created_at', { ascending: false });

    if (role) {
      query.eq('role', role);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Get users error:', error);
      return [];
    }

    return users || [];
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
}

/**
 * Get trainees assigned to a specific trainer
 */
export async function getTraineesForTrainer(
  trainerId: string
): Promise<UserWithoutPassword[]> {
  const supabase = createAdminSupabase();

  try {
    const { data: trainees, error } = await supabase
      .from('user')
      .select(
        'id, name, email, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions'
      )
      .eq('role', 'trainee')
      .eq('assigned_trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get trainees error:', error);
      return [];
    }

    return trainees || [];
  } catch (error) {
    console.error('Get trainees error:', error);
    return [];
  }
}

/**
 * Get users with their assigned trainer information
 */
export async function getUsersWithTrainerInfo(): Promise<
  Array<
    UserWithoutPassword & {
      assigned_trainer: { name: string; email: string } | null;
    }
  >
> {
  const supabase = createAdminSupabase();

  try {
    const { data: users, error } = await supabase
      .from('user')
      .select(
        `
        id, name, email, role, is_super_admin, agent_context, created_at, updated_at, assigned_trainer_id, allowed_sessions,
        assigned_trainer:assigned_trainer_id (
          name,
          email
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get users with trainer info error:', error);
      return [];
    }

    // Transform the data to match our expected type (Supabase returns null, which is what we want)
    return users || [];
  } catch (error) {
    console.error('Get users with trainer info error:', error);
    return [];
  }
}
