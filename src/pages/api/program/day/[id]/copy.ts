/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/api/program/day/[id]/copy.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (session.user.role === 'trainee') {
    return res
      .status(403)
      .json({ error: 'Trainees cannot copy training days' });
  }

  const { id } = req.query;
  const { target_program_id } = req.body;

  if (typeof id !== 'string' || typeof target_program_id !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const supabase = createServerSupabase();

    // Fetch the source training day with all exercises
    const { data: sourceDay, error: sourceDayError } = await supabase
      .from('training_day')
      .select(
        `
        *,
        training_exercises:training_exercise(*)
      `
      )
      .eq('id', id)
      .single();

    if (sourceDayError || !sourceDay) {
      return res.status(404).json({ error: 'Source training day not found' });
    }

    // Get the target program to determine next day order
    const { data: targetProgram, error: programError } = await supabase
      .from('program')
      .select('id, training_days:training_day(day_order)')
      .eq('id', target_program_id)
      .single();

    if (programError || !targetProgram) {
      return res.status(404).json({ error: 'Target program not found' });
    }

    // Calculate next day order
    const maxOrder = Math.max(
      ...(targetProgram.training_days?.map((d: any) => d.day_order) || [0]),
      0
    );
    const nextOrder = maxOrder + 1;

    // Create new training day with proper name
    const { data: newDay, error: newDayError } = await supabase
      .from('training_day')
      .insert({
        program_id: target_program_id,
        name: `Day ${nextOrder}`,
        day_order: nextOrder,
        description: sourceDay.description
      })
      .select()
      .single();

    if (newDayError || !newDay) {
      return res.status(500).json({ error: 'Failed to create training day' });
    }

    // Copy all exercises
    if (
      sourceDay.training_exercises &&
      sourceDay.training_exercises.length > 0
    ) {
      const exercisesToInsert = sourceDay.training_exercises.map((ex: any) => ({
        training_day_id: newDay.id,
        exercise_id: ex.exercise_id,
        exercise_order: ex.exercise_order,
        group_number: ex.group_number,
        sets: ex.sets,
        reps: ex.reps,
        weights: ex.weights,
        rest_seconds: ex.rest_seconds,
        reps_progression: ex.reps_progression,
        weight_progression: ex.weight_progression,
        notes: ex.notes
      }));

      const { error: exercisesError } = await supabase
        .from('training_exercise')
        .insert(exercisesToInsert);

      if (exercisesError) {
        // If exercises fail to copy, delete the day and return error
        await supabase.from('training_day').delete().eq('id', newDay.id);
        return res.status(500).json({ error: 'Failed to copy exercises' });
      }
    }

    // Fetch and return the complete new day
    const { data: completeDay, error: fetchError } = await supabase
      .from('training_day')
      .select(
        `
        *,
        training_exercises:training_exercise(
          *,
          exercise:exercise_id(*)
        )
      `
      )
      .eq('id', newDay.id)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch created day' });
    }

    return res.status(201).json(completeDay);
  } catch (error) {
    console.error('Copy training day error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
