-- Remove YouTube URL constraint to allow any string value

ALTER TABLE exercise DROP CONSTRAINT IF EXISTS valid_youtube_url; 