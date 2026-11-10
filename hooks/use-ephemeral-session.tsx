'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';

interface EphemeralSession {
  client_secret: {
    value: string;
  };
}

interface EphemeralSessionContextValue {
  ephemeralKey: EphemeralSession | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const EphemeralSessionContext = createContext<
  EphemeralSessionContextValue | undefined
>(undefined);

interface EphemeralSessionProviderProps {
  children: ReactNode;
}

export const EphemeralSessionProvider = ({
  children
}: EphemeralSessionProviderProps) => {
  const [ephemeralKey, setEphemeralKey] = useState<EphemeralSession | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEphemeralKey = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ephemeral-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch ephemeral session: ${response.statusText}`
        );
      }

      const data = await response.json();
      setEphemeralKey(data);
    } catch (err) {
      console.error('Error fetching ephemeral session:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch once on mount
  useEffect(() => {
    fetchEphemeralKey();
  }, []); // Empty dependency array - only runs once

  const refetch = () => {
    fetchEphemeralKey();
  };

  const contextValue: EphemeralSessionContextValue = {
    ephemeralKey,
    loading,
    error,
    refetch
  };

  return (
    <EphemeralSessionContext.Provider value={contextValue}>
      {children}
    </EphemeralSessionContext.Provider>
  );
};

export const useEphemeralSession = (): EphemeralSessionContextValue => {
  const context = useContext(EphemeralSessionContext);
  if (context === undefined) {
    throw new Error(
      'useEphemeralSession must be used within an EphemeralSessionProvider'
    );
  }
  return context;
};
