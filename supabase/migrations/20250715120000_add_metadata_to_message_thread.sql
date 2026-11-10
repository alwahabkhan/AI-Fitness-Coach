-- Add metadata and title columns to message_thread table
ALTER TABLE message_thread ADD COLUMN meta JSONB DEFAULT '{}';
ALTER TABLE message_thread ADD COLUMN title TEXT DEFAULT NULL; 