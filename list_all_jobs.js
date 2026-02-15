// Node.js v25 has native fetch support
const API_KEY = 'botega_d565e8d560b44c376f2afec563d334e720bc9ed94098e9d72aa225aee1bc4281';
const API_BASE = 'https://api.weppo.co/v1';

(async () => {
    try {
        console.log('=== FETCHING ALL JOBS (same as web interface) ===\n');

        // Use the SAME endpoint as the web interface
        const res = await fetch(`${API_BASE}/jobs/recent`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        const data = await res.json();

        console.log(`Total jobs found: ${data.jobs.length}\n`);

        // Group by status
        const byStatus = {};
        data.jobs.forEach(job => {
            if (!byStatus[job.status]) byStatus[job.status] = [];
            byStatus[job.status].push(job);
        });

        console.log('=== JOBS BY STATUS ===');
        Object.keys(byStatus).forEach(status => {
            console.log(`\n${status.toUpperCase()}: ${byStatus[status].length} jobs`);
            byStatus[status].slice(0, 3).forEach(job => {
                console.log(`  - ${job.job_id}: ${job.title} (${job.payment_amount} MON)`);
            });
        });

        // Show available (pending) jobs
        const availableJobs = data.jobs.filter(j => j.status === 'pending');
        console.log(`\n\n=== AVAILABLE JOBS (status=pending) ===`);
        console.log(`Count: ${availableJobs.length}`);

        if (availableJobs.length > 0) {
            availableJobs.forEach(job => {
                console.log(`\nJob: ${job.job_id}`);
                console.log(`  Title: ${job.title}`);
                console.log(`  Capability: ${job.capability_required}`);
                console.log(`  Payment: ${job.payment_amount} MON`);
                console.log(`  Collateral: ${job.collateral_required} MON`);
                console.log(`  Posted by: ${job.poster_name || job.poster_id}`);
            });
        } else {
            console.log('❌ No pending jobs available to accept');
            console.log('💡 All jobs have been accepted or completed');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
})();
