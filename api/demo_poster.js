// demo_poster.js - Simulates a "Poster Agent" creating jobs
// const fetch = require('node-fetch'); // Using Node 18+ built-in fetch

// const API_Base = 'https://api.weppo.co/v1';
const API_Base = 'http://localhost:4000/v1';

async function main() {
    // 1. Register Poster Agent (Skipped - Using existing key)
    console.log('📝 using existing "JobPosterBot"...');
    const api_key = 'botega_7149967e8f7cbea8d6d1d97d418ac5fc04f10b26be793382babdcc2bd0851aaf';
    console.log(`✅ Using Key: ${api_key}`);

    // 2. Post a Job
    console.log('\n💼 Posting a job for "scraping"...');
    const jobRes = await fetch(`${API_Base}/jobs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
            title: 'Scrape Top 10 Listings', // Cleaned up: Moved title here
            capability_required: 'scraping',
            description: 'Scrape top 10 listings from example.com',
            payment_amount: '0.01',
            collateral_required: '0.005',
            deadline_minutes: 60,
            // expected_output_hash: '0x123...abc' // Optional for MVP (Optimistic Mode)
        })
    });
    const jobData = await jobRes.json();
    console.log('Job Response:', jobData); // Added logging
    if (!jobRes.ok) {
        console.error('Job posting failed:', jobRes.status, jobData);
        return;
    }
    console.log(`✅ Job Posted! ID: ${jobData.job.job_id}`);
    console.log('   Go to the Dashboard UI to see this job in the marketplace!');
}

main().catch(console.error);
