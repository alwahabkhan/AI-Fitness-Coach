import { createContext, useContext, ReactNode } from 'react';

interface SessionDurationContextValue {
  elapsedSeconds: number;
  pausedSeconds: number;
  isInitialized: boolean;
}

const SessionDurationContext = createContext<SessionDurationContextValue>({
  elapsedSeconds: 0,
  pausedSeconds: 0,
  isInitialized: false
});

export function SessionDurationProvider({
  elapsedSeconds,
  pausedSeconds,
  isInitialized,
  children
}: {
  elapsedSeconds: number;
  pausedSeconds: number;
  isInitialized: boolean;
  children: ReactNode;
}) {
  return (
    <SessionDurationContext.Provider
      value={{ elapsedSeconds, pausedSeconds, isInitialized }}
    >
      {children}
    </SessionDurationContext.Provider>
  );
}

export function useSessionDuration() {
  return useContext(SessionDurationContext);
}

