# AI Fitness Coach: an AI-assisted fitness training & dieting experience

With this application fitness trainers and trainees will successfully collaborate together, into getting the trainees their health significantly improved and successfully getting the fitness results they are after, while optimising the time it takes a trainer to support a single trainee.

## How it works

The goal is to provide 2 different types of AI coaching to trainees, getting them the best results possible, while allowing trainers to scale their work with many more clients. The trainees will be provided with continuous nutritional and health coaching (a.k.a. Nutrition Coach AI Agent) outside of workouts, and realtime workout coaching (a.k.a. Workout Coach AI Agent).

### User Roles

The roles in the application are:

- Trainer
- Trainee

### Trainer User Flow

The trainers login into the application and can

0. create new trainer/trainee users
1. upload workouts for their trainees to work with
2. inspect the prompts of the Nutrition (need to select user) & Workout (need to select user + 1 of their workouts) Coach agents.
3. They also have a DB AI Agent that can answer questions about the database.

#### User Creation

It's a page where the Trainer can enter username (valid email), password and to choose a role between Trainer and Trainee + a button to submit this.

#### Workout import

Workouts get imported from a CSV file with the following structure:

- Exercise Group - A number for grouping exercises
- YouTube Link - Links to exercise demonstrations
- Day 1 Exercises - Exercise names
- Sets - Number of sets
- Rest - Rest time in seconds
- W+ progress in weights - Weight progression (automatically calculated)
- R+ progress in repetitions - Rep progression (automatically calculated)
- 1st time weights - Initial weight used
- 1st time reps - Initial reps performed
- 1st time date completed - Date of first session
- 2nd time weights - Weight for second session
- 2nd time reps - Reps for second session
- 2nd time date completed - Date of second session
- ...
- Nth time weights - Weight for Nth session
- Nth time reps - Reps for Nth session
- Nth time date completed - Date of Nth session

When importing we discard the W+, R+ and all "_ date completed" columns. Then we create a separate copy of the workout for each tuple ["_ time weights", "\* time reps"] because they represent the weights and reps on every repetition of the workout.

When a workout is imported, before it's created in the database - the view displays the imported workout in a table, so the Trainer can ensure nothing didn't get misinterpreted and the import was successful.

Here is a detailed description of the meaning of each column:

##### Column №1 (Exercise Group)

This number identifies the grouping of exercises, used to organize them into paired or circuit sets. Exercises with the same number and background color are performed together in а straight fashion. This means that the trainee is performing one exercise after another. An alternating set involves two exercises grouped together. You alternate between them — for example, perform one set of Exercise A, then one set of Exercise B, and repeat this sequence until all sets are complete for both exercises. A circuit set consists of three or more exercises performed consecutively in a loop. You go through each exercise once before repeating the whole circuit for the next round, usually with minimal or no rest in between.

##### Column №2 (YouTube Link)

Contains direct YouTube links that demonstrate how to properly perform each exercise. These are especially useful for reviewing form or learning new movements.

##### Column №3 (Day 1 Exercises)

This column contains the names on each exercise.

##### Column №4 (Sets)

Indicates how many sets should be performed for each exercise. It's a key metric for tracking workout volume.

##### Column №5 (Rest)

This column shows the rest time in seconds between sets or exercises. Longer rest periods (above 90 sec) are typically used for hypertrophy and strength training, while shorter rests (below 60 sec) are intended to build muscular endurance. If the rest value is 0, it means there is no rest at all between exercises — they are performed back to back. All rest values are measured in seconds.

##### Column №6 (W+ progress in weights) This will be automatically calculated by us and we don’t need it.

Indicates the planned progression increment—how much additional load you should add in the next session beyond your current weights, guiding your strength progression.

##### Column №7 (R+ progress in repetitions) This will be automatically calculated by us and we don’t need it.

Column 7 shows the progression in repetitions – it indicates how many reps you add to the exercise in each subsequent workout. This helps you track your progress and ensures you're gradually increasing the volume, which is essential for building muscles.

##### Column №8 (1st time weights)

Shows the weight used during the first time (in workout #1) the exercise was performed. It serves as a baseline reference for future progress.

##### Column №9 (1st time reps)

Indicates how many reps should be performed during the first training session. Combined with the weight, it serves as a baseline for tracking progress over time.

##### Column №10 (1st time date completed) (In the excel it’s called 1st time date done, but let’s rename it to “1st time date completed’’)

Reserved for entering the date of the first training session for each exercise. This can help with consistency and progress tracking.

##### Column №11 (2nd time weights)

Displays the weight used during the second session, allowing you to compare it to the first. It’s essential for measuring improvement and adjusting difficulty.

##### Column №12 (2nd time reps)

Indicates how many reps were completed during the second training session. This allows you to compare with the first session and track your progression.

##### Column №13 (2nd time date completed)

Marks the date on which the second workout for that exercise was completed. Useful for monitoring consistency and planning future sessions.
This could be repeated as many times s as trainee wants. Let’s not make this as a constraint how many times every workout is done.

#### Prompt Inspector

Trainers can finetune the AI experience, providing system prompts for the Nutrition and Workout agents (there is a Global prompt for each seeded in the db by default; there is the option of having a per-user replacement for each of the Global prompts), and providing context for the 2 agents on multiple levels (user, workout, exercise, etc.). The editing of prompts is happening in Supabase - so no need for UX for that. But Trainers do have a way to see the built final prompt for both the Nutrition coach of any user + the prompt for the Workout coach for any user + any one of their workouts.

##### Nutrition Coach prompt

Here is pseudocode for its building:

```
prompt = globalPrompt
if (userSystemPrompt) prompt = userSystemPrompt
if (user.agent_context) prompt += user.agent_context
```

##### Workout Coach prompt

Here is pseudocode for its building:

```
prompt = globalPrompt
if (userSystemPrompt) prompt = userSystemPrompt
if (user.agent_context) prompt += user.agent_context
if (workout.agent_context) prompt += workout.agent_context
for (ex in exercises)
  if (ex.agent_context) prompt += ex.agent_context
```

#### DB Assistant

The Trainer may want to know who has completed the most workouts, or who's workout results are the best (later I will share the DB schema - there are workout_session records keeping how did workouts went in the past for everyone).

This is why the DB Assistant can work great for them. Instead of answering those questions by running queries on the db manually - they will have a chat where a DB Assistant translates their questions into SQL queries -> executes those queries -> interprets the results -> and generates a response answering the Trainer's question.

The interface has a chat with thread (conversation) history.

### Trainee User Flow

The Trainees login into the app and they see the workouts available to them, as well as a link to their ongoing conversation with their Nutrition Coach.

When they open up a workout they get into a realtime experience where a realtime audio AI Agent guides the workout and the trainee can instruct it on progressing forward and going back, results from executed exercise sets and so on.

If the trainee opens up the Nutrition Coach page - they see a list of threads (conversations) with their Nutrition Coach and can start a new one or continue an old one.

#### Nutrition Coach

On the Nutrition Coach page, the user has a chat interface (text-only) to converse with their AI Nutrition Coach.
There is a sidebar on the left side with all prior conversations + the ability to create a new one.

#### Workout Coach

When the Trainee clicks on a workout - they get into the workout experience, where they can execute the whole plan of exercise with the help of a realtime-audio+text AI Workout Coach agent.

The user interface features:

- an updating list of all exercises where the user monitors their progress
  - Every row on this list is an exercise group, with it's name as a title + dots that change color (states are: not_started, started, completed) under that name representing each step (sets + rests) in the exercise group
  - If multiple exercises share a group - they are visualised by a single entry in the list (it's a "super set"), and each dot will be a different set.
  - If each exercise has a separate group - each row is a different exercise
- A video player (YT-only is fine) running on repeat & muted a video demonstrating the current exercise.
  - if the group currently running is a super set - this video should be updated on every change of exercise
- Text chat interface with all messages from the realtime audio conversation, where the user can also mute the realtime chat and they can just type.
- A WorkoutPlayer to control the workout progress (play, pause, step-back, step-forth)

On Desktop:

- exercise list is on the left side
- the exercise video example takes most of the middle of the screen
- Chat is on the right side of the video
- under all of those on a new row, centered is the player

On Mobile:

- make it so all exercise groups are visible (whole plan), and video is shown on demand by the user
- text chat is not visible by default, but available on demand by tapping on a button
- player controls are also visible at all times

As the WorkoutPlayer progresses, it raises events that are being silently passed over to the Workout Coach agent, so it stays in the loop.

The agent should be asking for info on the details about every completed set and this info will get saved into the workout_session:

- How many reps were completed?
- [if applicable] What weight?

The agent should be cheering and motivating the Trainee while keeping the messages short.

## Application architecture

### AI

#### Nutrition Coach

The agent behind the scenes has the following tools:

- Planning Tool - it plans how the agent will answer the query by the user and what sequence of use of the rest of the tools will it use. It does so by running a sub-agent (prompt) generating a plan.
- SQL Retrieve Tool - this tool executes a subagent (prompt) to generate an SQL query to the database, with appropriate guardrails to the Trainee's appropriate access rights (read-only, just looking at their own data in the db) -> then it uses the generated SQL query and executes it -> then it returns an explanation (in natural language) on what it just did + it returns the query it executed + it returns the result(s)
- Knowledgebase Search Tool - the nutriotion coach has knowldge sources available through a remote agent in Amazon Q for Business. The Q agent can execute RAG based on the input to the tool and retrieve information from the knowledgebases it has indexed.

#### Workout Coach

Everything starts with pulling a WorkoutPlan from the database.

##### WorkoutPlan Creation

Using the db data, we collect all exercises for certain workout (more info in the DB Schema).

Out of this list of exercise we need to create Exercise Groups. An Exercise Group represents a list of steps that can be one of 2 things:

- Super Set, when the group contains more than 1 exercise - all of the sets of those exercises, all of the rests after each set - are all grouped in a single group (1 row in the WorkoutPlayer display of the WorkoutPlan)
- Single Exercise - the sets of this exercise and the rests after each set are the only members of the group

Here is a couple different scenarios:

###### Exercise Group: Super Set

```
Group: 1 | Deadlift         | 3 sets | 0 rest
Group: 1 | Weighted Pullups | 3 sets | 0 rest
Group: 1 | BW Low Lunges    | 3 sets | 0 rest
Group: 1 | Pullups PG       | 3 sets | 0 rest
Group: 1 | Kn Wheel Rollout | 3 sets | 120 rest
```

Results in the following workout plan (not a perfect representation, because important meta is missing like weights and reps etc., but representative-enough for the structure of the plan)

```
Workout
  Exercise Group: Super Set 1
    Deadlift
    Weighted Pullups
    BW Low Lunges
    Pullups PG
    Kn Wheel Rollout
    Rest: 120
  Exercise Group: Super Set 1
    Deadlift
    Weighted Pullups
    BW Low Lunges
    Pullups PG
    Kn Wheel Rollout
    Rest: 120
  Exercise Group: Super Set 1
    Deadlift
    Weighted Pullups
    BW Low Lunges
    Pullups PG
    Kn Wheel Rollout
    Rest: 120
```

###### Exercise Group: Single Exercise

```
Group: 1 | Deadlift         | 3 sets | 60 rest
Group: 2 | Weighted Pullups | 3 sets | 60 rest
Group: 3 | BW Low Lunges    | 3 sets | 60 rest
```

Results in the following workout plan (not a perfect representation, because important meta is missing like weights and reps etc., but representative-enough for the structure of the plan)

```
Workout
  Exercise Group: Deadlift
    Deadlift
    Rest: 60
    Deadlift
    Rest: 60
    Deadlift
    Rest: 60
  Exercise Group: Weighted Pullups
    Weighted Pullups
    Rest: 60
    Weighted Pullups
    Rest: 60
    Weighted Pullups
    Rest: 60
  Exercise Group: BW Low Lunges
    BW Low Lunges
    Rest: 60
    BW Low Lunges
    Rest: 60
    BW Low Lunges
    Rest: 60
```

##### Workout Coach's AI Architecture

This experience is built out of a few different agents that the application switches between, based on a state of a state machine:

- Trainee Condition Assessment Agent, with tools:
  - Start Workout Tool (calls it if no adaptation of the training is required), results in the state machine getting an `event.start`
  - Adapt Workout Tool (if the agent identifies the Trainee doesn't feel up to execute the workout as specced out - it can trigger adaptation), results in the state machine getting an `event.adapt` with arguments carrying the nature of adaptation that needs to be performed.
- Workout Adaptation Agent, with tools:
  - Complete Adaptation Tool (calls it with the adapted WorkoutPlan), results in an `event.resume` in the state machine with an argument carrying the adapted WorkoutPlan + the state of the plan execution (i.e. the progress; the user can invoke adaptation mid-workout so we want to make sure we keep this state)
- Workout Agent, with tools:
  - Adapt Workout Tool (calls it if during the workout the Trainee needs to adapt the plan), results in an `event.adapt` being sent to state machine -> the state machine goes into the adaptation state (more info bellow)
  - Play Workout Tool (when the user requests the workout to begin), results in a call to the WorkoutPlayer.play()
  - Pause Workout Tool (when the user requests the workout to be paused), results in a call to the WorkoutPlayer.pause()
  - Step Back Tool (when the user requests the workout to progress a step back), results in a call to the WorkoutPlayer.stepBack()
  - Srep Forth Tool (when the user requests the workout to progress a step forward), results in a call to the WorkoutPlayer.stepForth()
  - Go To Exercise Group Tool (when the user says they want to jump to a whole other exercise group), results in a call to the WorkoutPlayer.goToGroup(index)
  - Show Exercise Tool (called when the user wants to see the exercise video, on desktop it doesn't really do anything as the video is visible at all times), results in the exercise video being shown
  - Hide Exercise Tool (called when the user wants to hide the exercise video, on desktop it doesn't really do anything as the video is visible at all times), results in the exercise video being getting hidden
  - Finish Workout Tool (when the user is done and wants to complete their workout), results in a call to the WorkoutPlayer.finish() + preservance of the workout session in the db, with interpretation of the results together with the results in an ascii table format (more info on exact place for preserving this info in the DB schema description bellow)

The state machine has the following states:

- starting (this is the default init state) this state can progress to one of 2 states
  - workout_running (via the event.start)
  - workout_adapting (via the event.adapt)
- workout_running state can go into 2 other states
  - workout_adapting (via the event.adapt)
  - finished (via the event.finish)
- workout_adapting state can only go into 1 other state
  - workout_running (via the event.resume)

### Server API Endpoints

Please decide the best for the auth-related api endpoints.

Trainer:

- User Creation page
  - [POST] /api/user/create or whatever makes sense when using supabase's RBAC system
- Workout import page
  - no api endpoints necessary, direct calls to supabase are fine
- DB Assistant Chat page
  - [POST] /api/trainer/db-agent/reply this is to protect the LLM API key (OPENAI_API_KEY for example)

Trainee:

- Dashboard page
  - none
- Nutrition Coach page
  - [POST] /api/trainee/nutrition-coach/reply this is to protect the LLM API key (OPENAI_API_KEY for example)
- Workout Coach page
  - [POST] /api/trainee/workout-coach/session/create this returns session object for the started realtime audio conversation to be used on the client side with the openai's javascript API client. It will protect the LLM API key (OPENAI_API_KEY for example).

### Database Schema

Generate a comprehensive Supabase PostgreSQL database schema for an AI-powered fitness coaching application with the following requirements:

#### Core Application Context

- **Application Type**: AI Fitness Coach with dual AI agents (Nutrition Coach and Workout Coach)
- **User Roles**: Trainers and Trainees
- **Primary Features**: Workout management, nutrition coaching, realtime workout guidance, AI prompt customization
- **Database Platform**: Supabase PostgreSQL with Row Level Security (RLS)

#### Required Tables and Specifications

##### 1. Users Table (`user`)

```sql
CREATE TABLE user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Consider if this should integrate with Supabase Auth instead
  role TEXT NOT NULL CHECK (role IN ('trainer', 'trainee')),
  agent_context TEXT, -- Custom context for AI agents (nullable)
  token_meta JSONB, -- Store API tokens, usage limits, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Requirements:**

- Email validation and uniqueness enforcement
- Role-based access control integration
- Consider Supabase Auth integration vs custom auth
- Enable RLS for data isolation between trainers/trainees

##### 2. Workouts Table (`workout`)

```sql
CREATE TABLE workout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_context TEXT, -- Custom AI context for this workout
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Requirements:**

- Workouts are owned by trainers but accessible to assigned trainees
- Support for workout templates that can be reused
- Index on user_id for performance

##### 3. Exercises Table (`exercise`)

```sql
CREATE TABLE exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  execution_meta JSONB NOT NULL, -- Contains sets, reps, weights, rest periods, progression rules
  "group" INTEGER NOT NULL, -- Exercise grouping for supersets/circuits
  "order" INTEGER NOT NULL, -- Order within the workout
  video_url TEXT, -- YouTube demonstration link
  agent_context TEXT, -- Custom AI context for this exercise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Requirements:**

- `execution_meta` JSONB structure should support:
  ```json
  {
    "sets": 3,
    "rest_seconds": 60,
    "weight": 50,
    "reps": 10
  }
  ```
- Composite index on (workout_id, "group", "order")
- Validate video_url format (YouTube links)

##### 4. Workout Sessions Table (`workout_session`)

```sql
CREATE TABLE workout_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  message_thread_id UUID REFERENCES message_thread(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  operational_cost DECIMAL(10,4), -- Track AI usage costs
  agent_prompt TEXT, -- The actual prompt used for this session
  results JSONB, -- Detailed session results and exercise performance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Requirements:**

- `results` JSONB should track individual exercise performance:
  ```json
  {
    "exercises": [
      {
        "exercise_id": "uuid",
        "sets_completed": [
          { "weight": 50, "reps": 10, "completed_at": "timestamp" },
          { "weight": 52.5, "reps": 8, "completed_at": "timestamp" }
        ],
        "notes": "Felt strong today",
        "perceived_exertion": 7
      }
    ],
    "session_summary": {
      "total_duration_minutes": 45,
      "exercises_completed": 8,
      "total_volume": 2500
    }
  }
  ```
- Index on workout_id and start_time for analytics
- Ensure end_time is always >= start_time when set

##### 5. Message Threads Table (`message_thread`)

```sql
CREATE TABLE message_thread (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('nutrition_coach', 'db_agent', 'workout_coach')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Requirements:**

- Support for different conversation types
- RLS to ensure users only see their own threads
- Index on (owner_user_id, type) for filtering

##### 6. Messages Table (`message`)

```sql
CREATE TABLE message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_thread_id UUID NOT NULL REFERENCES message_thread(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user(id) ON DELETE SET NULL, -- NULL for AI messages
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  metadata JSONB, -- Store additional message data (audio transcripts, tool calls, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Requirements:**

- Support for both user and AI messages
- `metadata` JSONB for storing audio transcripts, tool usage, costs
- Index on (message_thread_id, created_at) for conversation retrieval
- Consider message ordering and pagination

##### 7. Prompts Table (`prompt`)

```sql
CREATE TABLE prompt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('nutrition_coach_global', 'workout_coach_global', 'nutrition_coach_user', 'workout_coach_user')),
  user_id UUID REFERENCES user(id) ON DELETE CASCADE, -- NULL for global prompts
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Additional Requirements:**

- Support for global and user-specific prompts
- Prompt versioning and activation system
- Unique constraint on (type, user_id) for user-specific prompts
- Ensure only one active prompt per type per user

#### Row Level Security (RLS) Requirements

##### Trainer Access Patterns:

- Can read/write their own user data
- Can create and manage trainees
- Can read/write workouts for their trainees
- Can read workout sessions and messages for their trainees
- Can access DB Assistant conversations
- Can modify prompts for their trainees

##### Trainee Access Patterns:

- Can read/write their own user data
- Can read workouts assigned to them
- Can create/read their own workout sessions
- Can create/read their own nutrition coach conversations
- Cannot access other trainees' data
- Cannot modify global prompts

#### Additional Schema Requirements

##### Indexes for Performance:

```sql
-- User lookups
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_role ON user(role);

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
```

##### Triggers for Updated_at:

```sql
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON user FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_updated_at BEFORE UPDATE ON workout FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- (repeat for all tables)
```

##### CSV Import Support:

- Design `exercise.execution_meta` to handle variable CSV columns (1st time weights, 2nd time weights, etc.)
- Support for workout template creation from CSV data
- Validation functions for imported exercise data

##### Integration Requirements:

- Supabase Auth integration consideration
- API endpoint security through RLS
- Real-time subscriptions for workout progress
- File storage for exercise videos (if hosting locally)

#### Data Validation and Constraints

##### Business Logic Constraints:

- Trainers can only create trainee accounts
- Trainees cannot access other trainees' data
- Workout sessions must have valid start/end times
- Exercise groups must be sequential within workouts
- Message threads must have consistent ownership

##### Data Integrity:

- Cascade deletes where appropriate
- Foreign key constraints with proper referential actions
- Check constraints for enums and business rules
- JSONB schema validation where critical

#### Migration and Seeding Requirements

##### Default Data:

- Create default global prompts for the agents: nutrition coach, workout coach, and DB Assistant
- Create default users for the agents: nutrition coach, workout coach, and DB Assistant
- Set up example trainer & trainee accounts
- Create an Example workout and exercises (1 super set of Deadlift, Pullups, Pushups, 3 sets, 120s rest after each Pushups set, improvise on weight and reps)

##### Version Control:

- Migration scripts for schema changes
- Rollback procedures
- Data migration scripts for CSV imports

This schema should support the full AI Fitness Coach application with proper security, performance, and scalability considerations for a Supabase PostgreSQL environment.

## Detailed Description For All Pages

### URLs

Here are the pages:
[unauthenticated] / -> /login (redirect)
[unauthenticated] /login (login page)
[authenticated/Trainer] / (Trainer dashboard)
[authenticated/Trainer] /trainer/workout/import (Import workout page)
[authenticated/Trainer] /trainer/prompt-inspector/ (Prompt Inspector page)
[authenticated/Trainer] /trainer/db-assistant/ (DB Assistant page)

[authenticated/Trainee] / (Trainee dashboard)
[authenticated/Trainee] /trainee/nutrition-coach (Nutrition Coach page)
[authenticated/Trainee] /trainee/workout/[workout_id]/execute (Workout page)

### UX

#### Login Page

Contains:

- User text field (validated for being an email input)
- Password text field

#### Trainer Dashboard Page

Contains:

- Link to the Import Workout page
- Link to the Prompt Inspector page
- Link to the DB Assistant page

#### Import Workout Page

Contains

- User Select control: dropdown with all users with fuzzy search
- [inactive before the user is selected] a drop area where you can drop a CSV with the workout you want to upload for the user in-question

Once the CSV is dropped but before it's saved to the database - the imported workout's info is rendered in the browser - if the user agrees with all - they can press a Continue Importing button and the workout is imported in the db and assigned to the selected user.

#### Prompt Inspector Page

Contains:

- User Select control (same as on the Import Workout page)
- 2 tabs
  - Nutrition Coach Prompt
    - Large text area with syntax highlighting for Markdown. Inside is loaded the Nutrition Coach system prompt built as described above from the db data.
  - Workout Coach Prompt
    - Here we also have a Workout Select control: same functionality as the User Select, but you select from the selected user's workouts
    - Large text area with syntax highlighting for Markdown. Inside is loaded the Workout Coach system prompt built as described above from the db data.

#### DB Assistant page

Contains:

- Thread history sidebar on the left side with a New Chat button on top
- Chat interface where the Trainer can use their assistant to query information in the database

#### Trainee Dashboard page

Contains:

- A list of all workouts (as clickable cards). When the Trainee clicks on a card
  - on Desktop the cards can be in multiple columns
  - on Mobile it's a single column
- A button leading to the Nutrition Coach page

#### Nutrition Coach page

Contains:

- Thread history sidebar on the left side with a New Chat button on top
- Chat interface where the Trainee will be able to chat with their Nutrition Coach

#### Workout page

Contains:

- WorkountPlan widget, displaying all the stages (Exercise Groups) of the workout
  - On Desktop it's on the left side, looking like a sidebar
  - On Mobile it's front and center, taking full width of the screen
- Video Example of the current exercise - YT embed with muted sound and playing the video on repeat - is fine.
  - On Desktop it takes most of the screen and it is in the center
  - On Mobile it's by-default hidden, and the user needs to invoke an action to show it (either by voice or pressing a button somewhere)
- Chat interface with history of the ongoing realtime audio conversation + a button to disable the realtime audio + a regular input bar for text and audio (recording) input into the chat (i.e. you don't need to talk to it, you can also write)
  - On Desktop this is about as wide as the WorkoutPlan and is on the right side of the video player
  - On Mobile it is by-default hidden, only messages popover and disappear (toast style) during the conversation. The user can press a button to show the chat and when shown - it takes the full screen (or at least width).
- Workout Player with buttons to control the progress of the workout (play, pause, stepForward, stepBack, finish) and a controller component implementing all of those on logical level + a method without a button WorkoutPlayer.goToGroup(index) usable via the conversation with the Workout Coach agent.

### Design Style

The design should be incredibly beautiful and up to latest standards and trends.
