-- Add title column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Populate title with a snippet of description for existing jobs
UPDATE jobs SET title = LEFT(description, 100) WHERE title IS NULL;

-- Make title NOT NULL for future jobs (optional, but good for consistency)
-- ALTER TABLE jobs ALTER COLUMN title SET NOT NULL;
