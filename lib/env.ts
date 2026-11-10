import { z } from 'zod';

const serverEnvSchema = z.object({
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().default('us-east-1'),
  AMAZON_Q_APPLICATION_ID: z
    .string()
    .min(1, 'AMAZON_Q_APPLICATION_ID is required'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  MODEL: z.string().default('gpt-4o-mini'),

  // Next.js
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),

  // Project specific
  PROJECT_REF: z.string().optional(),

  // Database
  DB_URL: z.string().min(1, 'DB_URL is required'),

  OUTSPEED_API_KEY: z.string().min(1, 'OUTSPEED_API_KEY is required')
});

const clientEnvSchema = z.object({
  // Supabase (public)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
});

// Type definitions
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

// Validation functions
function validateServerEnv(): ServerEnv {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => err.path.join('.'))
        .join(', ');
      throw new Error(
        `Missing or invalid server environment variables: ${missingVars}. ` +
          'Please check your .env.local file and ensure all required variables are set correctly.'
      );
    }
    throw error;
  }
}

function validateClientEnv(): ClientEnv {
  try {
    return clientEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => err.path.join('.'))
        .join(', ');
      throw new Error(
        `Missing or invalid client environment variables: ${missingVars}. ` +
          'Please check your .env.local file and ensure all required variables are set correctly.'
      );
    }
    throw error;
  }
}

// Environment instances
let serverEnv: ServerEnv | null = null;
let clientEnv: ClientEnv | null = null;

// Getter functions
export function getServerEnv(): ServerEnv {
  if (!serverEnv) {
    serverEnv = validateServerEnv();
  }
  return serverEnv;
}

export function getClientEnv(): ClientEnv {
  if (!clientEnv) {
    clientEnv = validateClientEnv();
  }
  return clientEnv;
}

// Convenience getters for specific environment variables
export function getSupabaseConfig() {
  const server = getServerEnv();
  const client = getClientEnv();

  return {
    url: client.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: client.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: server.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function getAwsConfig() {
  const env = getServerEnv();

  return {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    amazonQApplicationId: env.AMAZON_Q_APPLICATION_ID
  };
}

export function getOpenAIConfig() {
  const env = getServerEnv();

  return {
    apiKey: env.OPENAI_API_KEY,
    model: env.MODEL
  };
}

export function getNextAuthConfig() {
  const env = getServerEnv();

  return {
    url: env.NEXTAUTH_URL,
    secret: env.NEXTAUTH_SECRET
  };
}

export function getDbConfig() {
  const env = getServerEnv();

  return {
    connectionString: env.DB_URL
  };
}

export function isDevelopment(): boolean {
  return getServerEnv().NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return getServerEnv().NODE_ENV === 'production';
}

export function isTest(): boolean {
  return getServerEnv().NODE_ENV === 'test';
}

// Validation on module load (for server-side)
if (typeof window === 'undefined') {
  // Only validate server env on server-side
  try {
    getServerEnv();
  } catch (error) {
    console.error('Server environment validation failed:', error);
    // Don't throw here to allow the app to start, but log the error
  }
}
