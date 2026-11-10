import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { createServerSupabase } from '@/lib/supabase';
import { z } from 'zod';

const exerciseSchema = z.object({
  exercise_name: z.string(),
  exercise_id: z.string().uuid().optional(),
  sets: z.number().min(0),
  reps: z.array(z.number().min(0)).default([]), // Array
  weights: z.array(z.number().min(0)).default([]), // Array (plural)
  rest_seconds: z.number().min(0).default(0),
  group_number: z.number().min(1).default(1),
  exercise_order: z.number().min(0).optional(),
  notes: z.string().optional().default(''),
  reps_progression: z.number().min(0).optional().default(0),
  weight_progression: z.number().min(0).optional().default(0),
  r_plus_option: z.number().min(0).optional().default(0)
});

const trainingDaySchema = z.object({
  name: z.string().min(1),
  day_order: z.number().min(1),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema)
});

const programSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trainee_id: z.string().uuid(),
  is_active: z.boolean().optional(),
  training_days: z.array(trainingDaySchema)
});

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
    return res.status(403).json({ error: 'Trainees cannot import programs' });
  }

  try {
    const { success, data, error } = programSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        error: 'Invalid program data',
        details: error.flatten().fieldErrors
      });
    }

    const supabase = createServerSupabase();

    // Start transaction-like operation
    const { data: program, error: programError } = await supabase
      .from('program')
      .insert({
        trainer_id: session.user.id,
        trainee_id: data.trainee_id,
        name: data.name,
        description: data.description,
        is_active: data.is_active ?? true
      })
      .select()
      .single();

    if (programError) throw programError;

    // Create training days and exercises
    for (const dayData of data.training_days) {
      const { data: trainingDay, error: dayError } = await supabase
        .from('training_day')
        .insert({
          program_id: program.id,
          name: dayData.name,
          day_order: dayData.day_order,
          description: dayData.description
        })
        .select()
        .single();

      if (dayError) throw dayError;

      // Find or create exercises in centralized_exercise table
      for (let i = 0; i < dayData.exercises.length; i++) {
        const exerciseData = dayData.exercises[i];

        // Try to find existing exercise by name
        let { data: existingExercise } = await supabase
          .from('centralized_exercise')
          .select('id')
          .ilike('name', exerciseData.exercise_name)
          .single();

        // If not found, create new centralized exercise
        if (!existingExercise) {
          const { data: newExercise, error: exerciseError } = await supabase
            .from('centralized_exercise')
            .insert({
              name: exerciseData.exercise_name
            })
            .select('id')
            .single();

          if (exerciseError) throw exerciseError;
          existingExercise = newExercise;
        }

        // Create training exercise
        const { error: trainingExerciseError } = await supabase
          .from('training_exercise')
          .insert({
            training_day_id: trainingDay.id,
            exercise_id: existingExercise.id,
            exercise_order: exerciseData.exercise_order ?? i + 1,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            weights: exerciseData.weights,
            rest_seconds: exerciseData.rest_seconds,
            group_number: exerciseData.group_number,
            notes: exerciseData.notes,
            reps_progression: exerciseData.reps_progression,
            weight_progression: exerciseData.weight_progression,
            r_plus_option: exerciseData.r_plus_option
          });

        if (trainingExerciseError) throw trainingExerciseError;
      }
    }

    return res.status(201).json({
      message: 'Program imported successfully',
      program_id: program.id
    });
  } catch (error) {
    console.error('Program import error:', error);
    return res.status(500).json({
      error: 'Failed to import program',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
