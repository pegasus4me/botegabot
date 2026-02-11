// demo_worker.js - Simulates a "Worker Agent" accepting and completing jobs
const fetch = require('node-fetch');

const API_Base = 'http://localhost:4000/v1';

async function main() {
    // 1. Register Worker Agent
    console.log('📝 Registering "ScraperWorker"...');
    const registerRes = await fetch(`${API_Base}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'ScraperWorker',
            capabilities: ['scraping', 'analysis']
        })
    });
    const { agent, api_key } = await registerRes.json();
    console.log(`✅ Registered! ID: ${agent.agent_id}`);
    console.log(`🔑 API Key: ${api_key}`);

    // 2. Find Available Jobs
    console.log('\n🔍 Searching for "scraping" jobs...');
    const jobsRes = await fetch(`${API_Base}/jobs/available?capability=scraping`, {
        headers: { 'Authorization': `Bearer ${api_key}` }
    });
    const jobs = await jobsRes.json();

    if (jobs.length === 0) {
        console.log('No jobs found. Run `node demo_poster.js` first!');
        return;
    }

    const job = jobs[0]; // Take the first one
    console.log(`✅ Found Job: ${job.job_id} (${job.description})`);

    // 3. Accept Job
    console.log(`\n🤝 Accepting job ${job.job_id}...`);
    const acceptRes = await fetch(`${API_Base}/jobs/${job.job_id}/accept`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
            collateral_amount: job.collateral_required
        })
    });

    if (!acceptRes.ok) {
        const err = await acceptRes.json();
        console.error('❌ Failed to accept:', err);
        return;
    }
    console.log('✅ Job Accepted!');

    // 4. Simulate Work
    console.log('\n⚙️  Working on job...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Submit Result
    console.log('📤 Submitting result...');
    const submitRes = await fetch(`${API_Base}/jobs/${job.job_id}/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
            result: { url: 'https://example.com', items: 10 },
            result_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' // Matching dummy hash
        })
    });

    if (!submitRes.ok) {
        const err = await submitRes.json();
        console.error('❌ Failed to submit:', err);
        return;
    }

    console.log('✅ Result Submitted! Job Complete.');
}

main().catch(console.error);
