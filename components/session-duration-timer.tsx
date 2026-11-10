import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { WorkoutStatus } from '@/types/workout';
import { SessionDurationProvider } from './session-duration-context';

interface SessionDurationTimerProps {
  sessionId?: string;
  workoutStatus?: WorkoutStatus;
  className?: string;
  children?: React.ReactNode;
  hideDisplay?: boolean; // If true, only provide context without rendering display
}

export function SessionDurationTimer({
  sessionId,
  workoutStatus,
  className = '',
  children,
  hideDisplay = false
}: SessionDurationTimerProps) {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pausedTime, setPausedTime] = useState(0); // Total seconds paused
  const [storedElapsedSeconds, setStoredElapsedSeconds] = useState(0); // Elapsed time from DB
  const [storedPausedSeconds, setStoredPausedSeconds] = useState(0); // Paused time from DB
  const [lastActivityTime, setLastActivityTime] = useState<Date | null>(null);
  const pauseStartTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null); // When current session window started
  const saveProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef<boolean>(false); // Track if we've loaded initial value from DB
  const currentSessionIdRef = useRef<string | undefined>(undefined); // Track current session ID
  
  // Throttling and queuing system
  const saveQueueRef = useRef<Array<() => Promise<void>>>([]);
  const isSavingRef = useRef<boolean>(false);
  const lastSaveTimeRef = useRef<number>(0);
  const pendingSaveRef = useRef<{ elapsed: number; paused: number } | null>(null);
  const THROTTLE_MS = 30000; // Save at most once every 30 seconds
  const MIN_SAVE_INTERVAL = 30000; // Minimum interval between periodic saves

  // Get current progress data
  const getCurrentProgressData = useCallback(() => {
    const currentPauseDuration = pauseStartTimeRef.current 
      ? Math.floor((Date.now() - pauseStartTimeRef.current) / 1000)
      : 0;
    const totalPausedTime = pausedTime + currentPauseDuration;
    
    return {
      elapsed_seconds: elapsedSeconds,
      paused_seconds: totalPausedTime,
      last_activity_time: new Date().toISOString()
    };
  }, [elapsedSeconds, pausedTime]);

  // Process save queue
  const processSaveQueue = useCallback(async () => {
    if (isSavingRef.current || !sessionId) {
      return;
    }

    // Get the latest pending save data
    const saveData = pendingSaveRef.current;
    if (!saveData) {
      return;
    }

    isSavingRef.current = true;
    pendingSaveRef.current = null;

    try {
      await fetch(`/api/training-session/${sessionId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elapsed_seconds: saveData.elapsed,
          paused_seconds: saveData.paused,
          last_activity_time: new Date().toISOString()
        })
      });
      lastSaveTimeRef.current = Date.now();
    } catch (error) {
      console.error('Failed to save session progress:', error);
    } finally {
      isSavingRef.current = false;
      
      // Process next item in queue if any
      if (saveQueueRef.current.length > 0) {
        const nextSave = saveQueueRef.current.shift();
        if (nextSave) {
          nextSave();
        }
      }
    }
  }, [sessionId]);

  // Queue a save (throttled for periodic saves, immediate for critical events)
  const queueSave = useCallback((immediate: boolean = false) => {
    if (!sessionId || !hasInitializedRef.current) {
      return;
    }

    const currentData = getCurrentProgressData();
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;

    // Update pending save with latest data
    pendingSaveRef.current = {
      elapsed: currentData.elapsed_seconds,
      paused: currentData.paused_seconds
    };

    if (immediate) {
      // Critical event - save immediately
      if (!isSavingRef.current) {
        processSaveQueue();
      } else {
        // If already saving, ensure it's queued (avoid duplicates)
        if (saveQueueRef.current.length === 0) {
          saveQueueRef.current.push(processSaveQueue);
        }
      }
    } else {
      // Periodic save - throttle it
      if (timeSinceLastSave >= THROTTLE_MS && !isSavingRef.current) {
        processSaveQueue();
      }
      // If throttled, the pending data will be saved on next immediate save or when throttle expires
    }
  }, [sessionId, getCurrentProgressData, processSaveQueue]);

  // Save progress to database (throttled)
  const saveProgress = useCallback((immediate: boolean = false) => {
    queueSave(immediate);
  }, [queueSave]);

  // Fetch session data and restore elapsed time ONLY on first load (when sessionId changes)
  useEffect(() => {
    if (!sessionId) {
      // Reset everything when sessionId is cleared
      setStartTime(null);
      setElapsedSeconds(0);
      setPausedTime(0);
      setStoredElapsedSeconds(0);
      setStoredPausedSeconds(0);
      setLastActivityTime(null);
      pauseStartTimeRef.current = null;
      sessionStartTimeRef.current = null;
      hasInitializedRef.current = false;
      currentSessionIdRef.current = undefined;
      return;
    }

    // Only fetch if this is a new sessionId (not already initialized)
    if (currentSessionIdRef.current === sessionId && hasInitializedRef.current) {
      // Already initialized for this session, don't fetch again
      return;
    }

    // Mark this session as being initialized
    currentSessionIdRef.current = sessionId;
    hasInitializedRef.current = false; // Will be set to true after successful load

    const fetchSessionData = async () => {
      try {
        const response = await fetch(`/api/training-session/${sessionId}`);
        if (response.ok) {
          const session = await response.json();
          if (session.start_time) {
            const start = new Date(session.start_time);
            setStartTime(start);
            
            // Get stored elapsed time from results
            const results = session.results || {};
            const sessionSummary = results.session_summary || {};
            const storedElapsed = sessionSummary.elapsed_seconds || 0;
            const storedPaused = sessionSummary.paused_seconds || 0;
            const storedLastActivity = sessionSummary.last_activity_time 
              ? new Date(sessionSummary.last_activity_time)
              : null;

            setStoredElapsedSeconds(storedElapsed);
            setStoredPausedSeconds(storedPaused);
            setPausedTime(storedPaused);
            setLastActivityTime(storedLastActivity);

            // ONLY set timer value on first load - use stored elapsed_seconds as the base
            const baseElapsed = storedElapsed || 0;
            
            setElapsedSeconds(Math.max(0, baseElapsed));
            elapsedAtPauseRef.current = Math.max(0, baseElapsed);
            
            // Mark as initialized - timer will now count independently
            hasInitializedRef.current = true;
            
            // If session is active, start counting from now
            if (workoutStatus === WorkoutStatus.IN_PROGRESS) {
              resumeTimeRef.current = new Date();
            } else {
              // If paused, don't start counting yet
              resumeTimeRef.current = null;
            }
          } else {
            // No start_time means this is a fresh session - start from 0
            setStartTime(new Date());
            setElapsedSeconds(0);
            setPausedTime(0);
            elapsedAtPauseRef.current = 0;
            hasInitializedRef.current = true;
            if (workoutStatus === WorkoutStatus.IN_PROGRESS) {
              resumeTimeRef.current = new Date();
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch session data:', error);
        // On error, assume fresh start
        setStartTime(new Date());
        setElapsedSeconds(0);
        setPausedTime(0);
        elapsedAtPauseRef.current = 0;
        hasInitializedRef.current = true;
        if (workoutStatus === WorkoutStatus.IN_PROGRESS) {
          resumeTimeRef.current = new Date();
        }
      }
    };

    fetchSessionData();
  }, [sessionId]); // Only depend on sessionId, NOT workoutStatus

  // Track pause/resume state and save progress on state changes
  // Use a ref to track previous status to detect changes
  const prevWorkoutStatusRef = useRef<WorkoutStatus | undefined>(workoutStatus);
  
  useEffect(() => {
    const prevStatus = prevWorkoutStatusRef.current;
    prevWorkoutStatusRef.current = workoutStatus;

    // Only act on status changes, not on every render
    if (prevStatus === workoutStatus) {
      return;
    }

    if (workoutStatus === WorkoutStatus.PAUSED) {
      // Workout just paused - record the pause start time
      if (pauseStartTimeRef.current === null) {
        pauseStartTimeRef.current = Date.now();
      }
      // Freeze elapsed time at current value
      elapsedAtPauseRef.current = elapsedSeconds;
      // Reset resume time ref so we don't count time while paused
      resumeTimeRef.current = null;
      // Save progress immediately on pause (critical event)
      if (sessionId && hasInitializedRef.current) {
        saveProgress(true);
      }
    } else if (workoutStatus === WorkoutStatus.IN_PROGRESS) {
      // Workout just resumed
      if (pauseStartTimeRef.current !== null) {
        const pauseDuration = Math.floor((Date.now() - pauseStartTimeRef.current) / 1000);
        setPausedTime(prev => {
          const newPausedTime = prev + pauseDuration;
          // Save updated paused time immediately on resume (critical event)
          // Note: paused time is already included in saveProgress via getCurrentProgressData
          return newPausedTime;
        });
        pauseStartTimeRef.current = null;
      }
      // Set resume time to start counting from now
      // elapsedAtPauseRef should already be set to the paused value
      resumeTimeRef.current = new Date();
      // Save progress immediately on resume (critical event)
      if (sessionId && hasInitializedRef.current) {
        saveProgress(true);
      }
    }
  }, [workoutStatus, sessionId, elapsedSeconds, saveProgress]);

  // Track when we last resumed (to calculate elapsed since resume)
  const resumeTimeRef = useRef<Date | null>(null);
  const elapsedAtPauseRef = useRef<number>(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!startTime) {
      return;
    }

    const interval = setInterval(() => {
      if (workoutStatus === WorkoutStatus.IN_PROGRESS) {
        // Only update if we have a resume time
        if (resumeTimeRef.current) {
          // Calculate time elapsed since last resume
          const now = Date.now();
          const elapsedSinceResume = Math.floor(
            (now - resumeTimeRef.current.getTime()) / 1000
          );
          
          // Total elapsed = elapsed at pause + time since resume
          const totalElapsed = elapsedAtPauseRef.current + elapsedSinceResume;
          setElapsedSeconds(Math.max(0, totalElapsed));
        }
      }
      // When paused, don't update elapsedSeconds - it stays frozen
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, workoutStatus]);

  // Save progress periodically (throttled to every 30 seconds)
  // Only save if timer has been initialized (not during initial load)
  useEffect(() => {
    if (!sessionId || workoutStatus !== WorkoutStatus.IN_PROGRESS || !hasInitializedRef.current) {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
        saveProgressIntervalRef.current = null;
      }
      return;
    }

    // Save immediately when interval starts (after initialization) - but throttled
    saveProgress(false);

    // Then save every 30 seconds (throttled - will only save if enough time has passed)
    saveProgressIntervalRef.current = setInterval(() => {
      saveProgress(false);
    }, MIN_SAVE_INTERVAL);

    return () => {
      if (saveProgressIntervalRef.current) {
        clearInterval(saveProgressIntervalRef.current);
      }
    };
  }, [sessionId, workoutStatus, saveProgress]);

  // Save progress when workout completes (critical event)
  useEffect(() => {
    if (sessionId && workoutStatus === WorkoutStatus.COMPLETED) {
      // Final save when workout completes - immediate
      saveProgress(true);
    }
  }, [sessionId, workoutStatus, saveProgress]);

  // Save progress on unmount, route change, or before page unload (critical events)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && hasInitializedRef.current) {
        // Use sendBeacon for reliable delivery on page unload
        const currentData = getCurrentProgressData();
        const data = JSON.stringify({
          elapsed_seconds: currentData.elapsed_seconds,
          paused_seconds: currentData.paused_seconds,
          last_activity_time: currentData.last_activity_time
        });
        navigator.sendBeacon(
          `/api/training-session/${sessionId}/progress`,
          new Blob([data], { type: 'application/json' })
        );
      }
    };

    const handleVisibilityChange = () => {
      // Save when tab becomes hidden (user switching tabs or minimizing)
      if (document.hidden && sessionId && hasInitializedRef.current) {
        saveProgress(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Also save on component unmount (route change) - immediate
      if (sessionId && hasInitializedRef.current) {
        saveProgress(true);
      }
    };
  }, [sessionId, getCurrentProgressData, saveProgress]);

  // Format time as MM:SS or HH:MM:SS
  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Calculate total paused seconds for context
  const totalPausedSeconds = useMemo(() => {
    const currentPauseDuration = pauseStartTimeRef.current 
      ? Math.floor((Date.now() - pauseStartTimeRef.current) / 1000)
      : 0;
    return pausedTime + currentPauseDuration;
  }, [pausedTime]);

  // Always provide context, even if not initialized yet
  const contextValue = {
    elapsedSeconds: sessionId && startTime ? elapsedSeconds : 0,
    pausedSeconds: sessionId && startTime ? totalPausedSeconds : 0,
    isInitialized: hasInitializedRef.current
  };

  // If no sessionId or startTime, just provide context without rendering timer
  if (!sessionId || !startTime) {
    return (
      <SessionDurationProvider {...contextValue}>
        {children}
      </SessionDurationProvider>
    );
  }

  // Render timer display (if not hidden) and provide context
  return (
    <SessionDurationProvider {...contextValue}>
      {!hideDisplay && (
        <div
          className={`flex items-center text-white px-4 py-2.5 rounded-lg shadow-md ${className}`}
          style={{ backgroundColor: '#036FE3' }}
        >
          <div className="flex items-center justify-center w-8 h-8 mr-3 bg-white rounded-full flex-shrink-0">
            <Clock className="w-4 h-4" style={{ color: '#036FE3' }} />
          </div>
          <div className="flex flex-col text-left min-w-0">
            <p className="text-xs font-normal opacity-90 leading-tight">Session Duration</p>
            <div className="font-bold text-base leading-tight mt-0.5">{formattedTime}</div>
          </div>
        </div>
      )}
      {children}
    </SessionDurationProvider>
  );
}

