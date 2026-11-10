-- AI Fitness Coach Database Schema
-- Supabase PostgreSQL Database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE user_role AS ENUM ('trainer', 'trainee', 'admin');
CREATE TYPE message_thread_type AS ENUM ('nutrition_coach', 'db_agent', 'workout_coach');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE prompt_type AS ENUM ('nutrition_coach_global', 'workout_coach_global', 'nutrition_coach_user', 'workout_coach_user');

-- ================================================
-- TABLES
-- ================================================

-- Users table
CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role user_role NOT NULL,
  agent_context TEXT,
  token_meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts table
CREATE TABLE workout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises table
CREATE TABLE exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  execution_meta JSONB NOT NULL DEFAULT '{}',
  "group" INTEGER NOT NULL,
  "order" INTEGER NOT NULL,
  video_url TEXT,
  agent_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message threads table
CREATE TABLE message_thread (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type message_thread_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout sessions table
CREATE TABLE workout_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  message_thread_id UUID REFERENCES message_thread(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  operational_cost DECIMAL(10,4) DEFAULT 0,
  agent_prompt TEXT,
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_session_times CHECK (end_time IS NULL OR end_time >= start_time)
);

-- Messages table
CREATE TABLE message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_thread_id UUID NOT NULL REFERENCES message_thread(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  role message_role NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts table
CREATE TABLE prompt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type prompt_type NOT NULL,
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_prompt UNIQUE (type, user_id),
  CONSTRAINT global_prompt_no_user CHECK (
    (user_id IS NULL AND type IN ('nutrition_coach_global', 'workout_coach_global')) OR
    (user_id IS NOT NULL AND type IN ('nutrition_coach_user', 'workout_coach_user'))
  )
);

-- ================================================
-- INDEXES
-- ================================================

-- User lookups
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_role ON "user"(role);

-- Workout and exercise queries
CREATE INDEX idx_workout_user_id ON workout(user_id);
CREATE INDEX idx_exercise_workout_id ON exercise(workout_id);
CREATE INDEX idx_exercise_group_order ON exercise(workout_id, "group", "order");

-- Session tracking and analytics
CREATE INDEX idx_workout_session_workout_id ON workout_session(workout_id);
CREATE INDEX idx_workout_session_start_time ON workout_session(start_time);

-- Message threading
CREATE INDEX idx_message_thread_owner ON message_thread(owner_user_id, type);
CREATE INDEX idx_message_thread_id_created ON message(message_thread_id, created_at);

-- Prompt management
CREATE INDEX idx_prompt_type_user ON prompt(type, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_prompt_type_global ON prompt(type) WHERE user_id IS NULL;

-- ================================================
-- TRIGGERS
-- ================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_user_updated_at 
  BEFORE UPDATE ON "user" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_updated_at 
  BEFORE UPDATE ON workout 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercise_updated_at 
  BEFORE UPDATE ON exercise 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_thread_updated_at 
  BEFORE UPDATE ON message_thread 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_session_updated_at 
  BEFORE UPDATE ON workout_session 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_updated_at 
  BEFORE UPDATE ON message 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_updated_at 
  BEFORE UPDATE ON prompt 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view their own data" ON "user"
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON "user"
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Trainers can view all users" ON "user"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE id::text = auth.uid()::text AND role = 'trainer'
    )
  );

CREATE POLICY "Trainers can create users" ON "user"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE id::text = auth.uid()::text AND role = 'trainer'
    )
  );

-- Workout policies
CREATE POLICY "Users can view their workouts" ON workout
  FOR SELECT USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE id::text = auth.uid()::text AND role = 'trainer'
    )
  );

CREATE POLICY "Trainers can manage workouts" ON workout
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE id::text = auth.uid()::text AND role = 'trainer'
    )
  );

-- Exercise policies (inherit from workout)
CREATE POLICY "Users can view exercises" ON exercise
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout w 
      WHERE w.id = exercise.workout_id AND (
        w.user_id::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM "user" 
          WHERE id::text = auth.uid()::text AND role = 'trainer'
        )
      )
    )
  );

CREATE POLICY "Trainers can manage exercises" ON exercise
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE id::text = auth.uid()::text AND role = 'trainer'
    )
  );

-- Message thread policies
CREATE POLICY "Users can view their threads" ON message_thread
  FOR SELECT USING (owner_user_id::text = auth.uid()::text);

CREATE POLICY "Users can create their threads" ON message_thread
  FOR INSERT WITH CHECK (owner_user_id::text = auth.uid()::text);

CREATE POLICY "Trainers can view all threads" ON message_thread
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE id::text = auth.uid()::text AND role = 'trainer'
    )
  );

-- Message policies
CREATE POLICY "Users can view messages in their threads" ON message
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM message_thread mt 
      WHERE mt.id = message.message_thread_id AND 
      mt.owner_user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create messages in their threads" ON message
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM message_thread mt 
      WHERE mt.id = message.message_thread_id AND 
      mt.owner_user_id::text = auth.uid()::text
    )
  );

-- Workout session policies
CREATE POLICY "Users can view their workout sessions" ON workout_session
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout w 
      WHERE w.id = workout_session.workout_id AND (
        w.user_id::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM "user" 
          WHERE id::text = auth.uid()::text AND role = 'trainer'
        )
      )
    )
  );

CREATE POLICY "Users can create their workout sessions" ON workout_session
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout w 
      WHERE w.id = workout_session.workout_id AND 
      w.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their workout sessions" ON workout_session
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout w 
      WHERE w.id = workout_session.workout_id AND 
      w.user_id::text = auth.uid()::text
    )
  );

-- Prompt policies
CREATE POLICY "Users can view global prompts" ON prompt
  FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Users can view their custom prompts" ON prompt
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Trainers can manage all prompts" ON prompt
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "user" 
      WHERE id::text = auth.uid()::text AND role = 'trainer'
    )
  );

-- ================================================
-- SEED DATA
-- ================================================

-- Default global prompts
INSERT INTO prompt (type, user_id, content, is_active) VALUES
('nutrition_coach_global', NULL, 
'You are a professional AI Nutrition Coach assisting trainees with their dietary and health goals. You are supportive, knowledgeable, and focused on helping users achieve sustainable healthy eating habits.

Key responsibilities:
- Provide personalized nutrition advice based on user goals and preferences
- Answer questions about diet, supplements, and healthy eating
- Help create meal plans and suggest healthy recipes
- Monitor progress and adjust recommendations as needed
- Be encouraging and motivational while maintaining professional boundaries

Always remember:
- Ask clarifying questions when needed
- Consider individual dietary restrictions and preferences
- Focus on sustainable, healthy approaches rather than extreme measures
- Encourage users to consult healthcare professionals for medical concerns
- Keep responses helpful, friendly, and actionable

You have access to tools for retrieving user data and nutritional information when needed.', true),

('workout_coach_global', NULL,
'You are an AI Workout Coach providing real-time guidance during fitness training sessions. You are motivational, knowledgeable about exercise form and safety, and focused on helping trainees complete their workouts effectively.

Key responsibilities:
- Guide users through their workout plans step by step
- Provide encouragement and motivation throughout the session
- Monitor workout progress and collect performance data
- Ensure proper form and safety during exercises
- Adapt workouts when necessary based on user feedback
- Keep detailed records of sets, reps, weights, and performance

Communication style:
- Be enthusiastic and motivational but not overwhelming
- Keep messages concise during active workout periods
- Ask for specific feedback after each set (reps completed, weight used)
- Celebrate achievements and progress
- Be supportive when users struggle or need modifications

You have access to tools for controlling workout flow and recording session data.', true);

-- Create default users (trainer and trainee examples)
INSERT INTO "user" (id, name, email, password, role, agent_context) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Demo Trainer', 'trainer@example.com', crypt('password123', gen_salt('bf')), 'trainer', 'Experienced fitness trainer specializing in strength training and weight loss.'),
('550e8400-e29b-41d4-a716-446655440002', 'Demo Trainee', 'trainee@example.com', crypt('password123', gen_salt('bf')), 'trainee', 'Beginner looking to build strength and improve overall fitness.');

-- Create example workout with supersets
INSERT INTO workout (id, user_id, name, agent_context) VALUES
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Full Body Strength', 'Focus on compound movements with progressive overload.');

-- Create example exercises (superset: Deadlift, Pullups, Pushups)
INSERT INTO exercise (workout_id, name, execution_meta, "group", "order", video_url, agent_context) VALUES
('550e8400-e29b-41d4-a716-446655440003', 'Deadlift', 
'{"sets": 3, "reps": 8, "weight": 135, "rest_seconds": 120}', 
1, 1, 'https://www.youtube.com/watch?v=ytGaGIn3SjE', 'Focus on proper hip hinge and neutral spine.'),

('550e8400-e29b-41d4-a716-446655440003', 'Pull-ups', 
'{"sets": 3, "reps": 5, "weight": 0, "rest_seconds": 120}', 
1, 2, 'https://www.youtube.com/watch?v=eGo4IYlbE5g', 'Full range of motion, control the descent.'),

('550e8400-e29b-41d4-a716-446655440003', 'Push-ups', 
'{"sets": 3, "reps": 10, "weight": 0, "rest_seconds": 120}', 
1, 3, 'https://www.youtube.com/watch?v=IODxDxX7oi4', 'Maintain straight body line, full range of motion.');

-- ================================================
-- FUNCTIONS
-- ================================================

-- Function to get user's workout history
CREATE OR REPLACE FUNCTION get_user_workout_history(user_uuid UUID)
RETURNS TABLE (
  workout_name TEXT,
  session_date TIMESTAMPTZ,
  duration_minutes INTEGER,
  exercises_completed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.name,
    ws.start_time,
    EXTRACT(EPOCH FROM (ws.end_time - ws.start_time))::INTEGER / 60,
    (ws.results->>'exercises_completed')::INTEGER
  FROM workout_session ws
  JOIN workout w ON w.id = ws.workout_id
  WHERE w.user_id = user_uuid AND ws.end_time IS NOT NULL
  ORDER BY ws.start_time DESC;
END;
$$ LANGUAGE plpgsql; 