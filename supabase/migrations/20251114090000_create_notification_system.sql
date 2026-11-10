-- Create enum types for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'notification_alert_type'
  ) THEN
    CREATE TYPE public.notification_alert_type AS ENUM ('success', 'reminder', 'error');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'notification_status'
  ) THEN
    CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'acknowledged');
  END IF;
END
$$;

-- Notification table
CREATE TABLE IF NOT EXISTS public.notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES public.user(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.user(id) ON DELETE SET NULL,
  message_thread_id uuid REFERENCES public.message_thread(id) ON DELETE SET NULL,
  alert_type public.notification_alert_type NOT NULL,
  status public.notification_status NOT NULL DEFAULT 'pending',
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_channels text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure metadata is json object
ALTER TABLE public.notification
  ADD CONSTRAINT notification_metadata_is_object
  CHECK (jsonb_typeof(metadata) = 'object');

ALTER TABLE public.notification
  ADD CONSTRAINT notification_delivery_channels_valid
  CHECK (
    delivery_channels <@ ARRAY['in_app','chat','email']::text[]
  );

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_notification_updated_at'
  ) THEN
    CREATE TRIGGER set_notification_updated_at
    BEFORE UPDATE ON public.notification
    FOR EACH ROW
    EXECUTE FUNCTION public.set_notification_updated_at();
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS notification_recipient_status_idx
  ON public.notification (recipient_user_id, status);

CREATE INDEX IF NOT EXISTS notification_created_at_idx
  ON public.notification (created_at DESC);

