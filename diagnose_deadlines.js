// Script to diagnose why /jobs/available returns empty but /jobs/recent shows pending jobs
// Node.js v25 has native fetch support

const API_KEY = 'botega_d565e8d560b44c376f2afec563d334e720bc9ed94098e9d72aa225aee1bc4281';
const API_BASE = 'https://api.weppo.co/v1';

(async () => {
    try {
        console.log('🔍 DIAGNOSING THE ISSUE...\n');

        // 1. Get ALL recent jobs
        const recentRes = await fetch(`${API_BASE}/jobs/recent`);
        const { jobs: allJobs } = await recentRes.json();

        // 2. Get "available" jobs (what the hunter uses)
        const availableRes = await fetch(`${API_BASE}/jobs/available`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const { jobs: availableJobs } = await availableRes.json();

        console.log(`📊 SUMMARY:`);
        console.log(`   Total jobs (recent): ${allJobs.length}`);
        console.log(`   Available jobs: ${availableJobs.length}\n`);

        // 3. Filter pending jobs from "all" jobs
        const pendingJobs = allJobs.filter(j => j.status === 'pending');
        console.log(`   Pending jobs in /recent: ${pendingJobs.length}`);
        console.log(`   Pending jobs in /available: ${availableJobs.length}\n`);

        // 4. Analyze WHY pending jobs aren't in /available
        console.log('🔎 ANALYZING PENDING JOBS NOT IN /available:\n');

        pendingJobs.forEach(job => {
            const now = new Date();
            const deadline = new Date(job.deadline);
            const isExpired = deadline < now;
            const minutesRemaining = (deadline - now) / 1000 / 60;

            console.log(`Job: ${job.job_id}`);
            console.log(`  Title: ${job.title}`);
            console.log(`  Status: ${job.status}`);
            console.log(`  Deadline: ${job.deadline}`);
            console.log(`  Now: ${now.toISOString()}`);
            console.log(`  Expired: ${isExpired} (${minutesRemaining.toFixed(1)} minutes ${isExpired ? 'PAST' : 'remaining'})`);
            console.log(`  Payment: ${job.payment_amount} MON\n`);
        });

        // 5. Root cause
        console.log('\n💡 ROOT CAUSE:');
        const expiredCount = pendingJobs.filter(j => new Date(j.deadline) < new Date()).length;
        if (expiredCount > 0) {
            console.log(`   ❌ ${expiredCount}/${pendingJobs.length} pending jobs have EXPIRED deadlines!`);
            console.log(`   The /jobs/available endpoint filters by "deadline > NOW()"`);
            console.log(`   These jobs show in the UI but can't be accepted.\n`);
        } else {
            console.log(`   ⚠️ All pending jobs have valid deadlines, but still not showing in /available`);
            console.log(`   This suggests another filter issue (capability? poster_id join?)\n`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
})();
