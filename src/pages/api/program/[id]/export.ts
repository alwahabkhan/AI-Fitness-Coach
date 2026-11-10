/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/api/program/[id]/export.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

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

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid program ID' });
  }

  try {
    const supabase = createServerSupabase();

    // Get program with training days and exercises
    const { data: program, error: programError } = await supabase
      .from('program')
      .select(
        `
        *,
        training_days:training_day(
          *,
          training_exercises:training_exercise(
            *,
            exercise:exercise_id(*)
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (programError || !program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Get trainee and trainer data separately
    const { data: trainee } = await supabase
      .from('user')
      .select('id, name, email')
      .eq('id', program.trainee_id)
      .single();

    const { data: trainer } = await supabase
      .from('user')
      .select('id, name, email')
      .eq('id', program.trainer_id)
      .single();

    // Check permissions
    if (
      session.user.role === 'trainee' &&
      program.trainee_id !== session.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (
      session.user.role === 'trainer' &&
      program.trainer_id !== session.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Transform data for export
    const exportData = {
      name: program.name,
      description: program.description,
      trainee_id: program.trainee_id,
      is_active: program.is_active,
      training_days:
        program.training_days
          ?.sort((a: any, b: any) => a.day_order - b.day_order)
          .map((day: any) => ({
            name: day.name,
            day_order: day.day_order,
            description: day.description,
            exercises:
              day.training_exercises
                ?.sort(
                  (a: any, b: any) =>
                    (a.exercise_order || 0) - (b.exercise_order || 0)
                )
                .map((ex: any) => ({
                  exercise_name: ex.exercise?.name || 'Unknown Exercise',
                  exercise_id: ex.exercise_id,
                  sets: ex.sets || 0,
                  reps: ex.reps || [], // Export as array
                  weights: ex.weights || [], // Export as array (plural)
                  rest_seconds: ex.rest_seconds || 0,
                  group_number: ex.group_number || 1,
                  exercise_order: ex.exercise_order || 0,
                  notes: ex.notes || '',
                  reps_progression: ex.reps_progression || 0,
                  weight_progression: ex.weight_progression || 0,
                  r_plus_option: ex.r_plus_option || 0
                })) || []
          })) || [],
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: session.user.name,
        trainee_name: trainee?.name,
        trainer_name: trainer?.name,
        version: '1.0'
      }
    };

    // Set headers for file download
    const filename = `${program.name.replace(/[^a-zA-Z0-9]/g, '_')}_program.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).json(exportData);
  } catch (error) {
    console.error('Program export error:', error);
    return res.status(500).json({
      error: 'Failed to export program',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
