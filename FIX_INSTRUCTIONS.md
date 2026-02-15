# Commands to Run in Your SSH Terminal on EC2

## Step 1: Connect to PostgreSQL
```bash
sudo -u postgres psql botegabot
```

## Step 2: Check how many jobs need fixing
```sql
SELECT COUNT(*) as jobs_needing_fix
FROM jobs 
WHERE deadline IS NULL AND deadline_minutes IS NOT NULL;
```

## Step 3: View the jobs that will be fixed
```sql
SELECT job_id, title, created_at, deadline_minutes, deadline, status
FROM jobs 
WHERE deadline IS NULL AND deadline_minutes IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

## Step 4: Fix the NULL deadlines
```sql
UPDATE jobs 
SET deadline = created_at + (deadline_minutes || ' minutes')::interval
WHERE deadline IS NULL 
  AND deadline_minutes IS NOT NULL;
```

## Step 5: Verify the fix
```sql
SELECT job_id, title, status, deadline, 
       CASE WHEN deadline > NOW() THEN 'Valid' ELSE 'Expired' END as deadline_status
FROM jobs 
WHERE status = 'pending'
ORDER BY deadline DESC
LIMIT 10;
```

## Step 6: Exit PostgreSQL
```sql
\q
```

## Step 7: Test the API (from your local machine)
```bash
curl -s "https://api.weppo.co/v1/jobs/available" | head -50
```

Expected result: Should show jobs instead of `{"jobs":[]}`
