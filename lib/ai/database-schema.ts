export const DATABASE_SCHEMA = {
  description:
    'AI Fitness Coach Database - PostgreSQL database for managing fitness training, users, workouts, and analytics',
  tables: {
    user: {
      description: 'Stores user information including trainers and trainees',
      columns: {
        id: { type: 'UUID', description: 'Primary key, auto-generated UUID' },
        name: { type: 'TEXT', description: "User's full name" },
        email: { type: 'TEXT', description: "User's email address (unique)" },
        password: { type: 'TEXT', description: 'Hashed password' },
        role: {
          type: 'user_role ENUM',
          description: "User role: 'trainer', 'trainee', or 'admin'"
        },
        agent_context: {
          type: 'TEXT',
          description: 'Additional context about the user for AI agents'
        },
        token_meta: { type: 'JSONB', description: 'Token metadata as JSON' },
        created_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the user was created'
        },
        updated_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the user was last updated'
        }
      },
      relationships: {
        workouts: 'One-to-many with workout table (user_id)',
        message_threads:
          'One-to-many with message_thread table (owner_user_id)',
        prompts: 'One-to-many with prompt table (user_id)'
      }
    },
    workout: {
      description: 'Stores workout plans created by users',
      columns: {
        id: { type: 'UUID', description: 'Primary key, auto-generated UUID' },
        user_id: { type: 'UUID', description: 'Foreign key to user table' },
        name: { type: 'TEXT', description: 'Name of the workout' },
        agent_context: {
          type: 'TEXT',
          description: 'Context about the workout for AI agents'
        },
        created_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the workout was created'
        },
        updated_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the workout was last updated'
        }
      },
      relationships: {
        user: 'Many-to-one with user table (user_id)',
        exercises: 'One-to-many with exercise table (workout_id)',
        workout_sessions: 'One-to-many with workout_session table (workout_id)'
      }
    },
    exercise: {
      description: 'Stores individual exercises within workouts',
      columns: {
        id: { type: 'UUID', description: 'Primary key, auto-generated UUID' },
        workout_id: {
          type: 'UUID',
          description: 'Foreign key to workout table'
        },
        name: { type: 'TEXT', description: 'Name of the exercise' },
        execution_meta: {
          type: 'JSONB',
          description: 'Exercise metadata (sets, reps, weight, rest time)'
        },
        group: {
          type: 'INTEGER',
          description: 'Exercise group number (for supersets)'
        },
        order: { type: 'INTEGER', description: 'Order within the group' },
        video_url: {
          type: 'TEXT',
          description: 'YouTube video URL for exercise demonstration'
        },
        agent_context: {
          type: 'TEXT',
          description: 'Context about the exercise for AI agents'
        },
        created_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the exercise was created'
        },
        updated_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the exercise was last updated'
        }
      },
      relationships: {
        workout: 'Many-to-one with workout table (workout_id)'
      }
    },
    message_thread: {
      description: 'Stores chat conversation threads',
      columns: {
        id: { type: 'UUID', description: 'Primary key, auto-generated UUID' },
        owner_user_id: {
          type: 'UUID',
          description: 'Foreign key to user table (thread owner)'
        },
        type: {
          type: 'message_thread_type ENUM',
          description:
            "Thread type: 'nutrition_coach', 'db_agent', 'workout_coach'"
        },
        created_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the thread was created'
        },
        updated_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the thread was last updated'
        }
      },
      relationships: {
        user: 'Many-to-one with user table (owner_user_id)',
        messages: 'One-to-many with message table (message_thread_id)',
        workout_sessions:
          'One-to-many with workout_session table (message_thread_id)'
      }
    },
    workout_session: {
      description: 'Stores individual workout session data and results',
      columns: {
        id: { type: 'UUID', description: 'Primary key, auto-generated UUID' },
        workout_id: {
          type: 'UUID',
          description: 'Foreign key to workout table'
        },
        message_thread_id: {
          type: 'UUID',
          description: 'Foreign key to message_thread table (optional)'
        },
        start_time: {
          type: 'TIMESTAMPTZ',
          description: 'When the session started'
        },
        end_time: {
          type: 'TIMESTAMPTZ',
          description: 'When the session ended (NULL if ongoing)'
        },
        operational_cost: {
          type: 'DECIMAL(10,4)',
          description: 'Cost of the session'
        },
        agent_prompt: {
          type: 'TEXT',
          description: 'Prompt used for the session'
        },
        results: {
          type: 'JSONB',
          description: 'Session results and performance data'
        },
        created_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the session was created'
        },
        updated_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the session was last updated'
        }
      },
      relationships: {
        workout: 'Many-to-one with workout table (workout_id)',
        message_thread:
          'Many-to-one with message_thread table (message_thread_id)'
      }
    },
    message: {
      description: 'Stores individual messages within conversation threads',
      columns: {
        id: { type: 'UUID', description: 'Primary key, auto-generated UUID' },
        message_thread_id: {
          type: 'UUID',
          description: 'Foreign key to message_thread table'
        },
        user_id: {
          type: 'UUID',
          description: 'Foreign key to user table (who sent the message)'
        },
        content: { type: 'TEXT', description: 'Message content' },
        role: {
          type: 'message_role ENUM',
          description: "Message role: 'user', 'assistant', 'system'"
        },
        metadata: { type: 'JSONB', description: 'Additional message metadata' },
        created_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the message was created'
        },
        updated_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the message was last updated'
        }
      },
      relationships: {
        message_thread:
          'Many-to-one with message_thread table (message_thread_id)',
        user: 'Many-to-one with user table (user_id)'
      }
    },
    prompt: {
      description: 'Stores AI agent prompts (global and user-specific)',
      columns: {
        id: { type: 'UUID', description: 'Primary key, auto-generated UUID' },
        type: {
          type: 'prompt_type ENUM',
          description:
            "Prompt type: 'nutrition_coach_global', 'workout_coach_global', 'nutrition_coach_user', 'workout_coach_user'"
        },
        user_id: {
          type: 'UUID',
          description: 'Foreign key to user table (NULL for global prompts)'
        },
        content: { type: 'TEXT', description: 'Prompt content' },
        is_active: {
          type: 'BOOLEAN',
          description: 'Whether the prompt is active'
        },
        created_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the prompt was created'
        },
        updated_at: {
          type: 'TIMESTAMPTZ',
          description: 'When the prompt was last updated'
        }
      },
      relationships: {
        user: 'Many-to-one with user table (user_id)'
      }
    }
  },
  enums: {
    user_role: {
      values: ['trainer', 'trainee'],
      description: 'User roles in the system'
    },
    message_thread_type: {
      values: ['nutrition_coach', 'db_agent', 'workout_coach'],
      description: 'Types of conversation threads'
    },
    message_role: {
      values: ['user', 'assistant', 'system'],
      description: 'Roles of messages in conversations'
    },
    prompt_type: {
      values: [
        'nutrition_coach_global',
        'workout_coach_global',
        'nutrition_coach_user',
        'workout_coach_user'
      ],
      description: 'Types of AI agent prompts'
    }
  },
  functions: {
    get_user_workout_history: {
      description: 'Returns workout history for a specific user',
      parameters: ['user_uuid UUID'],
      returns:
        'TABLE with workout_name, session_date, duration_minutes, exercises_completed'
    }
  },
  common_queries: {
    user_counts: 'Count users by role',
    active_users: 'Find users with recent activity',
    workout_completion: 'Calculate workout completion rates',
    exercise_performance: 'Analyze exercise performance trends',
    session_analytics: 'Session duration and frequency analysis'
  }
};

export const SCHEMA_SUMMARY = `
Database: AI Fitness Coach
Tables: user, workout, exercise, message_thread, workout_session, message, prompt

Key relationships:
- Users can have multiple workouts
- Workouts contain multiple exercises
- Users can have multiple message threads
- Workout sessions track actual training sessions
- Messages are stored in threads
- Prompts can be global or user-specific

Common analysis patterns:
- User activity and engagement
- Workout completion rates
- Exercise performance tracking
- Session analytics and trends
- Message thread activity

Table names in SQL queries:
- user
- workout
- exercise
- message_thread
- workout_session
- message
- prompt
`;
