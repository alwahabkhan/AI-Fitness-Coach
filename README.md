# AI Fitness Coach
 
An AI-powered fitness coaching platform that connects trainers and trainees through intelligent workout guidance and nutrition coaching.

## Features

### For Trainers

- **Dashboard**: Comprehensive overview of trainees and activities
- **Workout Import**: Upload workout plans from CSV files
- **Workouts Inspector**: Inspect added workouts
- **Prompt Inspector**: Customize AI coaching prompts for nutrition and workout coaches
- **DB Assistant**: Query database for insights about trainee progress
- **User Management**: Create and manage trainer and trainee accounts

### For Trainees

- **Personalized Workouts**: AI-guided workout sessions with real-time coaching
- **Nutrition Coaching**: Chat-based nutrition advice and meal planning
- **Progress Tracking**: Monitor workout completion and fitness progress
- **Interactive Experience**: Real-time audio and text coaching during workouts

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase PostgreSQL
- **Authentication**: Custom session-based auth with bcrypt
- **AI Integration**: OpenAI GPT models and Outspeed API for workout coaching
- **Database**: Supabase with Row Level Security (RLS)

## Prerequisites

- Node.js 18+
- Yarn or npm
- Supabase account
- OpenAI API account

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ai-fitness-coach
yarn install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PROJECT_REF=

# OpenAI Configuration
OPENAI_API_KEY=

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string

# Amazon 
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Amazon Q ENVs

AMAZON_Q_APPLICATION_ID=

# DEBUG 

NEXT_PUBLIC_NUTRITION_DEBUG_ENABLED=
NEXT_PUBLIC_DB_DEBUG_ENABLED=

# POSTGRES CLIENT
DB_URL=

# OUTSPEED
OUTSPEED_API_KEY=
```

### 3. Database Setup

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and API keys from the project settings

#### Initialize Supabase CLI

1. Link your local project to your Supabase project:
```bash
yarn supabase login
yarn supabase link --project-ref YOUR_PROJECT_REF
```

#### Run Database Migrations

1. Push the database schema and run migrations:
```bash
yarn supabase db push
```

2. Seed the database with initial data:
```bash
yarn supabase db reset --with-seed
```

3. Generate TypeScript types for the database:
```bash
yarn gen:types:local
```

This will create:

- All required tables with proper relationships
- Row Level Security (RLS) policies
- Default global prompts for AI coaches
- Demo user accounts (see Login Credentials below)

### 4. Run the Application

```bash
yarn dev
```

The application will be available at `http://localhost:3000`

## Login Credentials

The database is seeded with demo accounts:

**Trainer Account:**

- Email: `trainer@example.com`
- Password: `password123`

**Trainee Account:**

- Email: `trainee@example.com`
- Password: `password123`

## Database Schema Overview

### Core Tables

- **user**: Stores trainer and trainee accounts with roles
- **workout**: Workout plans assigned to trainees
- **exercise**: Individual exercises within workouts with execution metadata
- **workout_session**: Records of completed workout sessions
- **message_thread**: Conversation threads for AI coaching
- **message**: Individual messages in coaching conversations
- **prompt**: Customizable AI prompts (global and user-specific)

### Key Features

- **Row Level Security**: Ensures data isolation between users
- **JSON Metadata**: Flexible storage for exercise parameters and session results
- **Audit Trails**: Automatic timestamps and update tracking
- **Role-based Access**: Separate permissions for trainers and trainees

## API Endpoints

### Authentication

- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination

### Trainer Endpoints

- `POST /api/user/create` - Create new users (trainer-only)
- `POST /api/trainer/db-agent/reply` - Database assistant queries

### Trainee Endpoints

- `POST /api/trainee/nutrition-coach/reply` - Nutrition coaching chat
- `POST /api/trainee/workout-coach/session/create` - Start workout session

## Application Structure

```
ai-fitness-coach/
├── components/              # Feature-based UI components
│   ├── ui/                 # Reusable design system components
│   ├── layout/             # Layout and navigation components
│   ├── chat-interface/     # Chat interfaces for AI coaching
│   ├── workout-execute/    # Workout execution and control panels
│   ├── nutrition-chat/     # Nutrition coaching interface
│   ├── db-assistant/       # Database query assistant UI
│   ├── import-workout/     # CSV workout import workflow
│   └── user-management/    # User creation and management
├── lib/                    # Core business logic and utilities
│   ├── ai/                 # AI agent implementations (workout, nutrition, DB)
│   ├── supabase.ts         # Database client and configuration
│   ├── auth.ts             # Authentication and session management
│   ├── workout.ts          # Workout execution logic
│   └── utils.ts            # Shared utilities and helpers
├── src/pages/              # Next.js pages and API routes
│   ├── api/                # RESTful API endpoints
│   │   ├── auth/           # Authentication endpoints
│   │   ├── trainer/        # Trainer-specific API routes
│   │   ├── trainee/        # Trainee-specific API routes
│   │   └── workout/        # Workout management APIs
│   ├── trainer/            # Trainer dashboard and tools
│   ├── trainee/            # Trainee workout and nutrition interfaces
│   └── login.tsx           # Authentication page
├── hooks/                  # Custom React hooks for state management
├── database/               # Database schema and type definitions
│   ├── schema.sql          # Complete PostgreSQL schema
│   └── *.types.ts          # TypeScript type definitions
├── state-machine/          # Workout execution state management
├── supabase/               # Database migrations and configuration
└── middleware.ts           # Route protection and authentication middleware
```

## Workout CSV Import Format

The application supports importing workouts via CSV with the following structure:

```csv
Exercise Group,YouTube Link,Day 1 Exercises,Sets,Rest,1st time weights,1st time reps,2nd time weights,2nd time reps
1,https://youtube.com/watch?v=...,Deadlift,3,120,135,8,140,8
1,https://youtube.com/watch?v=...,Pull-ups,3,120,0,5,0,6
1,https://youtube.com/watch?v=...,Push-ups,3,120,0,10,0,12
```

### Column Descriptions

- **Exercise Group**: Number for grouping exercises (supersets)
- **YouTube Link**: Exercise demonstration video
- **Day 1 Exercises**: Exercise name
- **Sets**: Number of sets to perform
- **Rest**: Rest time in seconds between sets
- **[N]st/nd time weights**: Weight used in session N
- **[N]st/nd time reps**: Reps completed in session N

## AI Coaching System

### Nutrition Coach

- Provides personalized dietary advice
- Helps with meal planning and nutrition goals
- Considers dietary restrictions and preferences
- Available through chat interface

### Workout Coach

- Guides users through workout sessions
- Provides real-time motivation and instruction
- Collects performance data (sets, reps, weights)
- Adapts workouts based on user feedback

### Prompt Customization

Trainers can customize AI behavior through:

- Global prompts (affect all users)
- User-specific prompts (override global settings)
- Workout-specific context
- Exercise-specific instructions

## Development

### Project Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn pretty` - Run Prettier

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Tailwind CSS for styling
- Component-based architecture

## Deployment

1. Build the application: `yarn build`
2. Deploy to your preferred platform (Vercel, Railway, etc.)
3. Ensure environment variables are configured
4. Database should be accessible from production environment

## Support

For issues or questions:

1. Check the database schema in `database/schema.sql`
2. Review the API endpoints documentation
3. Verify environment variables are correctly set
4. Check Supabase dashboard for database connectivity
