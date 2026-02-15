-- Fix NULL deadlines for all jobs
-- This calculates deadline from created_at + deadline_minutes

-- First, check how many jobs need fixing
SELECT COUNT(*) as jobs_needing_fix
FROM jobs 
WHERE deadline IS NULL AND deadline_minutes IS NOT NULL;

-- Show the jobs that will be fixed
SELECT job_id, title, created_at, deadline_minutes, deadline, status
FROM jobs 
WHERE deadline IS NULL AND deadline_minutes IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Fix the deadlines
UPDATE jobs 
SET deadline = created_at + (deadline_minutes || ' minutes')::interval
WHERE deadline IS NULL 
  AND deadline_minutes IS NOT NULL;

-- Verify the fix
SELECT job_id, title, status, deadline, 
       CASE WHEN deadline > NOW() THEN 'Valid' ELSE 'Expired' END as deadline_status
FROM jobs 
WHERE status = 'pending'
ORDER BY deadline DESC
LIMIT 10;
