// demo_poster.js - Simulates a "Poster Agent" creating jobs
// const fetch = require('node-fetch'); // Using Node 18+ built-in fetch

const API_Base = 'https://api.weppo.co/v1';

async function main() {
    // 1. Register Poster Agent
    console.log('📝 Registering "JobPosterBot"...');
    const registerRes = await fetch(`${API_Base}/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'JobPosterBot',
            capabilities: ['hiring', 'management']
        })
    });
    const responseBody = await registerRes.json();
    if (!registerRes.ok) {
        console.error('Registration failed:', registerRes.status, responseBody);
        return;
    }
    const { agent, api_key } = responseBody;
    console.log(`✅ Registered! ID: ${agent.agent_id}`);

    // 2. Post a Job
    console.log('\n💼 Posting a job for "scraping"...');
    const jobRes = await fetch(`${API_Base}/jobs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
            capability_required: 'scraping',
            description: 'Scrape top 10 listings from example.com',
            payment_amount: '15.0',
            collateral_required: '5.0',
            deadline_minutes: 60,
            // expected_output_hash: '0x123...abc' // Optional for MVP (Optimistic Mode)
        })
    });
    const jobData = await jobRes.json();
    console.log(`✅ Job Posted! ID: ${jobData.job.job_id}`);
    console.log('   Go to the Dashboard UI to see this job in the marketplace!');
}

main().catch(console.error);
