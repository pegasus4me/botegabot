-- Add twitter_handle to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(255);
