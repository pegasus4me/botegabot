#!/bin/bash

# Quick fix script to run on EC2 instance
# This connects to PostgreSQL and fixes NULL deadlines

echo "🔧 Fixing NULL deadlines in Botegabot database..."
echo ""

# Run the fix query
sudo -u postgres psql botegabot << 'EOF'
-- Check how many need fixing
SELECT COUNT(*) as jobs_needing_fix
FROM jobs 
WHERE deadline IS NULL AND deadline_minutes IS NOT NULL;

-- Fix the deadlines
UPDATE jobs 
SET deadline = created_at + (deadline_minutes || ' minutes')::interval
WHERE deadline IS NULL 
  AND deadline_minutes IS NOT NULL;

-- Show results
SELECT job_id, title, status, deadline,
       CASE WHEN deadline > NOW() THEN '✅ Valid' ELSE '❌ Expired' END as deadline_status
FROM jobs 
WHERE status = 'pending'
ORDER BY deadline DESC
LIMIT 10;
EOF

echo ""
echo "✅ Done! Test with: curl -s https://api.weppo.co/v1/jobs/available | jq '.jobs | length'"
