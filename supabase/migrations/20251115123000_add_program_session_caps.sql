-- Ensure programs can define session caps and rolling windows
ALTER TABLE public.program
  ADD COLUMN IF NOT EXISTS max_sessions integer;

ALTER TABLE public.program
  ADD COLUMN IF NOT EXISTS session_duration_days integer;

ALTER TABLE public.program
  ALTER COLUMN session_duration_days SET DEFAULT 30;

UPDATE public.program
SET session_duration_days = 30
WHERE session_duration_days IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'program_max_sessions_positive'
  ) THEN
    ALTER TABLE public.program
      ADD CONSTRAINT program_max_sessions_positive
      CHECK (max_sessions IS NULL OR max_sessions > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'program_session_duration_positive'
  ) THEN
    ALTER TABLE public.program
      ADD CONSTRAINT program_session_duration_positive
      CHECK (session_duration_days IS NULL OR session_duration_days > 0);
  END IF;
END $$;

