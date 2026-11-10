import { NextApiRequest, NextApiResponse } from 'next';
import { GetServerSidePropsContext } from 'next';
import { isProduction } from './env';
import { UserWithoutPassword } from './auth';

export interface Session {
  user: UserWithoutPassword;
  expiresAt: string;
}

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Server-side session functions for API routes
export function createSessionForResponse(
  user: UserWithoutPassword,
  res: NextApiResponse
): void {
  const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

  const session: Session = {
    user,
    expiresAt
  };

  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE_NAME}=${JSON.stringify(session)}; HttpOnly; Secure=${isProduction()}; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION / 1000}`
  ]);
}

export function getSessionFromRequest(
  req: NextApiRequest | GetServerSidePropsContext['req']
): Session | null {
  const sessionCookie = req.cookies[SESSION_COOKIE_NAME];

  if (!sessionCookie) {
    return null;
  }

  try {
    const session: Session = JSON.parse(sessionCookie);

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function deleteSessionFromResponse(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure=${isProduction()}; SameSite=Lax; Path=/; Max-Age=0`
  ]);
}

// Server-side helper functions for getServerSideProps
export function getCurrentUserFromContext(
  context: GetServerSidePropsContext
): UserWithoutPassword | null {
  const session = getSessionFromRequest(context.req);
  return session?.user || null;
}

// Backwards compatibility functions (these will throw errors if used incorrectly)
export async function createSession(): Promise<void> {
  throw new Error(
    'createSession() cannot be used in Pages Router. Use createSessionForResponse() in API routes instead.'
  );
}

export async function getSession(): Promise<Session | null> {
  throw new Error(
    'getSession() cannot be used in Pages Router. Use getSessionFromRequest() instead.'
  );
}

export async function deleteSession(): Promise<void> {
  throw new Error(
    'deleteSession() cannot be used in Pages Router. Use deleteSessionFromResponse() in API routes instead.'
  );
}

export async function getCurrentUser(): Promise<UserWithoutPassword | null> {
  throw new Error(
    'getCurrentUser() cannot be used in Pages Router. Use getCurrentUserFromContext() in getServerSideProps instead.'
  );
}

export async function requireAuth(): Promise<UserWithoutPassword> {
  throw new Error(
    'requireAuth() cannot be used in Pages Router. Use getCurrentUserFromContext() and handle redirects manually.'
  );
}

export async function requireTrainer(): Promise<UserWithoutPassword> {
  throw new Error(
    'requireTrainer() cannot be used in Pages Router. Use getCurrentUserFromContext() and handle role checking manually.'
  );
}

export async function requireTrainee(): Promise<UserWithoutPassword> {
  throw new Error(
    'requireTrainee() cannot be used in Pages Router. Use getCurrentUserFromContext() and handle role checking manually.'
  );
}
