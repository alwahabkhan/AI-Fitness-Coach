SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user" ("id", "name", "email", "password", "role", "agent_context", "token_meta", "created_at", "updated_at") VALUES
	('550e8400-e29b-41d4-a716-446655440001', 'Demo Trainer', 'trainer@example.com', '$2a$06$G3iE/ozGatAoU3X5VllvyuD623cMm3dsPmGk.tIjuo6HGIo6DrIL2', 'trainer', 'Experienced fitness trainer specializing in strength training and weight loss.', '{}', '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440002', 'Demo Trainee', 'trainee@example.com', '$2a$06$yTVw1UWAd06SAQz5gqHOxuUSzVUzkSBLj4/S1oagC2QDok45rNJfK', 'trainee', 'Beginner looking to build strength and improve overall fitness.', '{}', '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00');


--
-- Data for Name: workout; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."workout" ("id", "user_id", "name", "agent_context", "created_at", "updated_at") VALUES
	('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Full Body Strength', 'Focus on compound movements with progressive overload.', '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'Upper Body Focus', 'Target chest, back, and shoulders with isolation exercises.', '2025-07-10 13:29:43.015294+00', '2025-07-10 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'Lower Body Power', 'Build leg strength with squats, deadlifts, and lunges.', '2025-07-05 13:29:43.015294+00', '2025-07-05 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Cardio Conditioning', 'High-intensity interval training for cardiovascular fitness.', '2025-06-28 13:29:43.015294+00', '2025-06-28 13:29:43.015294+00');


--
-- Data for Name: exercise; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."exercise" ("id", "workout_id", "name", "execution_meta", "group", "order", "video_url", "agent_context", "created_at", "updated_at") VALUES
	('38d48d6b-087a-47db-9ef8-735becce8b08', '550e8400-e29b-41d4-a716-446655440003', 'Deadlift', '{"reps": 8, "sets": 3, "weight": 135, "rest_seconds": 120}', 1, 1, 'https://www.youtube.com/watch?v=ytGaGIn3SjE', 'Focus on proper hip hinge and neutral spine.', '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00'),
	('03272955-ebb4-4e3b-bcae-6ec7f6992501', '550e8400-e29b-41d4-a716-446655440003', 'Pull-ups', '{"reps": 5, "sets": 3, "weight": 0, "rest_seconds": 120}', 1, 2, 'https://www.youtube.com/watch?v=eGo4IYlbE5g', 'Full range of motion, control the descent.', '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00'),
	('8c1c2a06-e4bd-4e05-a72c-c909e73295d5', '550e8400-e29b-41d4-a716-446655440003', 'Push-ups', '{"reps": 10, "sets": 3, "weight": 0, "rest_seconds": 120}', 1, 3, 'https://www.youtube.com/watch?v=IODxDxX7oi4', 'Maintain straight body line, full range of motion.', '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00'),
	
	-- Upper Body Focus workout exercises
	('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440004', 'Bench Press', '{"reps": 6, "sets": 4, "weight": 95, "rest_seconds": 180}', 1, 1, 'https://www.youtube.com/watch?v=rT7DgCr-3pg', 'Keep feet flat on ground, retract shoulder blades.', '2025-07-10 13:29:43.015294+00', '2025-07-10 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440004', 'Bent-Over Rows', '{"reps": 8, "sets": 3, "weight": 65, "rest_seconds": 120}', 1, 2, 'https://www.youtube.com/watch?v=9efgcAjQe7E', 'Maintain neutral spine, pull elbows back.', '2025-07-10 13:29:43.015294+00', '2025-07-10 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440004', 'Overhead Press', '{"reps": 6, "sets": 3, "weight": 45, "rest_seconds": 120}', 1, 3, 'https://www.youtube.com/watch?v=2yjwXTZQDDg', 'Press directly overhead, engage core.', '2025-07-10 13:29:43.015294+00', '2025-07-10 13:29:43.015294+00'),
	
	-- Lower Body Power workout exercises
	('550e8400-e29b-41d4-a716-446655440050', '550e8400-e29b-41d4-a716-446655440005', 'Squats', '{"reps": 8, "sets": 4, "weight": 115, "rest_seconds": 180}', 1, 1, 'https://www.youtube.com/watch?v=aclHkVaku9U', 'Keep chest up, knees in line with toes.', '2025-07-05 13:29:43.015294+00', '2025-07-05 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440005', 'Romanian Deadlift', '{"reps": 8, "sets": 3, "weight": 95, "rest_seconds": 150}', 1, 2, 'https://www.youtube.com/watch?v=JCXUYuzwNrM', 'Focus on hamstring stretch, keep bar close.', '2025-07-05 13:29:43.015294+00', '2025-07-05 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440005', 'Walking Lunges', '{"reps": 12, "sets": 3, "weight": 25, "rest_seconds": 120}', 1, 3, 'https://www.youtube.com/watch?v=3XDriUn0udo', 'Step forward with control, maintain balance.', '2025-07-05 13:29:43.015294+00', '2025-07-05 13:29:43.015294+00'),
	
	-- Cardio Conditioning workout exercises
	('550e8400-e29b-41d4-a716-446655440060', '550e8400-e29b-41d4-a716-446655440006', 'Burpees', '{"reps": 10, "sets": 5, "weight": 0, "rest_seconds": 60}', 1, 1, 'https://www.youtube.com/watch?v=auBLPXO8Fww', 'Full body movement, maintain pace.', '2025-06-28 13:29:43.015294+00', '2025-06-28 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440061', '550e8400-e29b-41d4-a716-446655440006', 'Mountain Climbers', '{"reps": 20, "sets": 4, "weight": 0, "rest_seconds": 45}', 1, 2, 'https://www.youtube.com/watch?v=nmwgirgXLYM', 'Keep core engaged, alternate legs quickly.', '2025-06-28 13:29:43.015294+00', '2025-06-28 13:29:43.015294+00'),
	('550e8400-e29b-41d4-a716-446655440062', '550e8400-e29b-41d4-a716-446655440006', 'Jump Rope', '{"reps": 50, "sets": 3, "weight": 0, "rest_seconds": 30}', 1, 3, 'https://www.youtube.com/watch?v=1BZM2Vre5oc', 'Light on feet, maintain rhythm.', '2025-06-28 13:29:43.015294+00', '2025-06-28 13:29:43.015294+00');


--
-- Data for Name: message_thread; Type: TABLE DATA; Schema: public; Owner: postgres
--

-- Sample message threads for nutrition coaching sessions
INSERT INTO "public"."message_thread" ("id", "owner_user_id", "type", "title", "meta", "created_at", "updated_at") VALUES
	('550e8400-e29b-41d4-a716-446655440040', '550e8400-e29b-41d4-a716-446655440002', 'nutrition_coach', 'Nutrition Planning Session', '{"goal": "weight_loss", "dietary_restrictions": ["vegetarian"]}', '2025-07-28 14:00:00+00', '2025-07-28 14:00:00+00'),
	('550e8400-e29b-41d4-a716-446655440041', '550e8400-e29b-41d4-a716-446655440002', 'nutrition_coach', 'Meal Prep Consultation', '{"goal": "muscle_gain", "preferences": ["high_protein"]}', '2025-07-25 10:30:00+00', '2025-07-25 10:30:00+00'),
	('550e8400-e29b-41d4-a716-446655440042', '550e8400-e29b-41d4-a716-446655440002', 'nutrition_coach', 'Supplement Advice', '{"goal": "recovery", "focus": ["post_workout"]}', '2025-07-22 16:15:00+00', '2025-07-22 16:15:00+00');

--
-- Data for Name: message; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: prompt; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."prompt" ("id", "type", "user_id", "content", "is_active", "created_at", "updated_at") VALUES
	('82adee98-4853-49ab-aaee-962be9521f24', 'nutrition_coach_global', NULL, 'You are a professional AI Nutrition Coach assisting trainees with their dietary and health goals. You are supportive, knowledgeable, and focused on helping users achieve sustainable healthy eating habits.

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

You have access to tools for retrieving user data and nutritional information when needed.', true, '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00'),
	('593b9e46-e783-4361-ac66-e54753894139', 'workout_coach_global', NULL, 'You are an AI Workout Coach providing real-time guidance during fitness training sessions. You are motivational, knowledgeable about exercise form and safety, and focused on helping trainees complete their workouts effectively.

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

You have access to tools for controlling workout flow and recording session data.', true, '2025-07-14 13:29:43.015294+00', '2025-07-14 13:29:43.015294+00');


--
-- Data for Name: workout_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

-- Sample workout sessions for the demo trainee to populate dashboard stats
INSERT INTO "public"."workout_session" ("id", "workout_id", "start_time", "end_time", "agent_prompt", "message_thread_id", "operational_cost", "results", "created_at", "updated_at") VALUES
	-- Recent sessions (this week)
	('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440003', '2025-07-29 10:00:00+00', '2025-07-29 10:45:00+00', 'Full body strength workout with focus on form', NULL, 0.15, '{"total_duration_minutes": 45, "exercises_completed": 3, "total_volume": 3240}', '2025-07-29 10:00:00+00', '2025-07-29 10:45:00+00'),
	('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003', '2025-07-27 14:30:00+00', '2025-07-27 15:15:00+00', 'Progressive overload focus on deadlifts', NULL, 0.12, '{"total_duration_minutes": 45, "exercises_completed": 3, "total_volume": 3150}', '2025-07-27 14:30:00+00', '2025-07-27 15:15:00+00'),
	('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440003', '2025-07-25 09:00:00+00', '2025-07-25 09:40:00+00', 'Morning strength session', NULL, 0.10, '{"total_duration_minutes": 40, "exercises_completed": 3, "total_volume": 2980}', '2025-07-25 09:00:00+00', '2025-07-25 09:40:00+00'),
	('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440003', '2025-07-23 16:00:00+00', '2025-07-23 16:45:00+00', 'Afternoon strength training', NULL, 0.13, '{"total_duration_minutes": 45, "exercises_completed": 3, "total_volume": 3100}', '2025-07-23 16:00:00+00', '2025-07-23 16:45:00+00'),
	
	-- Older sessions (last month) to build streak and total stats
	('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440003', '2025-07-21 11:00:00+00', '2025-07-21 11:40:00+00', 'Strength building session', NULL, 0.11, '{"total_duration_minutes": 40, "exercises_completed": 3, "total_volume": 2950}', '2025-07-21 11:00:00+00', '2025-07-21 11:40:00+00'),
	('550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440003', '2025-07-19 15:30:00+00', '2025-07-19 16:10:00+00', 'Progressive overload training', NULL, 0.12, '{"total_duration_minutes": 40, "exercises_completed": 3, "total_volume": 3000}', '2025-07-19 15:30:00+00', '2025-07-19 16:10:00+00'),
	('550e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440003', '2025-07-17 10:00:00+00', '2025-07-17 10:35:00+00', 'Morning strength routine', NULL, 0.09, '{"total_duration_minutes": 35, "exercises_completed": 3, "total_volume": 2850}', '2025-07-17 10:00:00+00', '2025-07-17 10:35:00+00'),
	('550e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440003', '2025-07-15 14:00:00+00', '2025-07-15 14:40:00+00', 'Strength and conditioning', NULL, 0.11, '{"total_duration_minutes": 40, "exercises_completed": 3, "total_volume": 2900}', '2025-07-15 14:00:00+00', '2025-07-15 14:40:00+00'),
	('550e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440003', '2025-07-13 09:30:00+00', '2025-07-13 10:10:00+00', 'Full body workout', NULL, 0.10, '{"total_duration_minutes": 40, "exercises_completed": 3, "total_volume": 2800}', '2025-07-13 09:30:00+00', '2025-07-13 10:10:00+00'),
	('550e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440003', '2025-07-11 16:30:00+00', '2025-07-11 17:05:00+00', 'Strength training session', NULL, 0.11, '{"total_duration_minutes": 35, "exercises_completed": 3, "total_volume": 2750}', '2025-07-11 16:30:00+00', '2025-07-11 17:05:00+00'),
	('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440003', '2025-07-09 11:00:00+00', '2025-07-09 11:35:00+00', 'Morning strength routine', NULL, 0.09, '{"total_duration_minutes": 35, "exercises_completed": 3, "total_volume": 2700}', '2025-07-09 11:00:00+00', '2025-07-09 11:35:00+00'),
	('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440003', '2025-07-07 15:00:00+00', '2025-07-07 15:40:00+00', 'Strength building workout', NULL, 0.12, '{"total_duration_minutes": 40, "exercises_completed": 3, "total_volume": 2650}', '2025-07-07 15:00:00+00', '2025-07-07 15:40:00+00'),
	('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440003', '2025-07-05 10:30:00+00', '2025-07-05 11:05:00+00', 'Full body strength training', NULL, 0.10, '{"total_duration_minutes": 35, "exercises_completed": 3, "total_volume": 2600}', '2025-07-05 10:30:00+00', '2025-07-05 11:05:00+00'),
	('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440003', '2025-07-03 14:00:00+00', '2025-07-03 14:35:00+00', 'Strength and conditioning', NULL, 0.11, '{"total_duration_minutes": 35, "exercises_completed": 3, "total_volume": 2550}', '2025-07-03 14:00:00+00', '2025-07-03 14:35:00+00'),
	('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440003', '2025-07-01 09:00:00+00', '2025-07-01 09:30:00+00', 'Morning workout routine', NULL, 0.08, '{"total_duration_minutes": 30, "exercises_completed": 3, "total_volume": 2500}', '2025-07-01 09:00:00+00', '2025-07-01 09:30:00+00'),
	
	-- Additional sessions for Upper Body Focus workout
	('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440004', '2025-07-08 14:00:00+00', '2025-07-08 14:50:00+00', 'Upper body strength focus', NULL, 0.14, '{"total_duration_minutes": 50, "exercises_completed": 3, "total_volume": 1680}', '2025-07-08 14:00:00+00', '2025-07-08 14:50:00+00'),
	('550e8400-e29b-41d4-a716-446655440026', '550e8400-e29b-41d4-a716-446655440004', '2025-07-12 10:30:00+00', '2025-07-12 11:15:00+00', 'Chest and back development', NULL, 0.13, '{"total_duration_minutes": 45, "exercises_completed": 3, "total_volume": 1620}', '2025-07-12 10:30:00+00', '2025-07-12 11:15:00+00'),
	('550e8400-e29b-41d4-a716-446655440027', '550e8400-e29b-41d4-a716-446655440004', '2025-07-16 16:00:00+00', '2025-07-16 16:45:00+00', 'Shoulder and arm strength', NULL, 0.12, '{"total_duration_minutes": 45, "exercises_completed": 3, "total_volume": 1580}', '2025-07-16 16:00:00+00', '2025-07-16 16:45:00+00'),
	
	-- Additional sessions for Lower Body Power workout
	('550e8400-e29b-41d4-a716-446655440028', '550e8400-e29b-41d4-a716-446655440005', '2025-07-06 09:00:00+00', '2025-07-06 09:45:00+00', 'Leg strength building', NULL, 0.15, '{"total_duration_minutes": 45, "exercises_completed": 3, "total_volume": 2400}', '2025-07-06 09:00:00+00', '2025-07-06 09:45:00+00'),
	('550e8400-e29b-41d4-a716-446655440029', '550e8400-e29b-41d4-a716-446655440005', '2025-07-10 15:30:00+00', '2025-07-10 16:15:00+00', 'Lower body power training', NULL, 0.14, '{"total_duration_minutes": 45, "exercises_completed": 3, "total_volume": 2350}', '2025-07-10 15:30:00+00', '2025-07-10 16:15:00+00'),
	('550e8400-e29b-41d4-a716-446655440030', '550e8400-e29b-41d4-a716-446655440005', '2025-07-14 11:00:00+00', '2025-07-14 11:40:00+00', 'Squat and deadlift focus', NULL, 0.13, '{"total_duration_minutes": 40, "exercises_completed": 3, "total_volume": 2300}', '2025-07-14 11:00:00+00', '2025-07-14 11:40:00+00'),
	
	-- Additional sessions for Cardio Conditioning workout
	('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440006', '2025-06-30 08:00:00+00', '2025-06-30 08:30:00+00', 'Morning cardio blast', NULL, 0.10, '{"total_duration_minutes": 30, "exercises_completed": 3, "total_volume": 0}', '2025-06-30 08:00:00+00', '2025-06-30 08:30:00+00'),
	('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440006', '2025-07-02 17:00:00+00', '2025-07-02 17:35:00+00', 'HIIT cardio session', NULL, 0.11, '{"total_duration_minutes": 35, "exercises_completed": 3, "total_volume": 0}', '2025-07-02 17:00:00+00', '2025-07-02 17:35:00+00'),
	('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440006', '2025-07-04 07:30:00+00', '2025-07-04 08:05:00+00', 'Early morning conditioning', NULL, 0.09, '{"total_duration_minutes": 35, "exercises_completed": 3, "total_volume": 0}', '2025-07-04 07:30:00+00', '2025-07-04 08:05:00+00');

--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
