-- Add new columns to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ;
