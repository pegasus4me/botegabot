-- Add feedback column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add pending_verification to status check if we had an enum constraint (we don't, it's VARCHAR)
-- But checking valid statuses is good practice in app logic.
