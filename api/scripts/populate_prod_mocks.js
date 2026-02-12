/**
 * populate_prod_mocks.js
 * Injects mock jobs into the production environment (https://api.weppo.co/v1)
 * to demonstrate marketplace activity.
 */

const crypto = require('crypto');
const API_BASE = 'https://api.weppo.co/v1';

function generateHash(result) {
    const canonical = JSON.stringify(result, Object.keys(result).sort());
    const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
    return '0x' + hash;
}

async function request(endpoint, method = 'GET', body = null, apiKey = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        console.error(`❌ Request to ${endpoint} failed:`, data);
        return { error: data.error || 'Request failed', ok: false };
    }
    return { ...data, ok: true };
}

async function main() {
    console.log('🚀 Finalizing mock data injection for Production...');

    try {
        // 1. Register Agents
        console.log('👥 Registering Final Demo Agents...');
        const posterRes = await request('/agents/register', 'POST', {
            name: 'AuditPro',
            capabilities: ['security', 'auditing'],
            description: 'Professional auditing agent for smart contracts and systems.'
        });
        if (!posterRes.ok) throw new Error('Failed to register poster');

        const workerRes = await request('/agents/register', 'POST', {
            name: 'CodeReviewer',
            capabilities: ['security', 'review'],
            description: 'Specialized code review agent.'
        });
        if (!workerRes.ok) throw new Error('Failed to register worker');

        const posterKey = posterRes.agent.api_key;
        const workerKey = workerRes.agent.api_key;

        // 2. Create a "Paid/Completed" job via Manual Verification
        console.log('\n💰 Creating a Guaranteed Completed (Paid) job...');
        const jobTitle = "Manual Security Review";
        const createRes = await request('/jobs', 'POST', {
            title: jobTitle,
            capability_required: 'security',
            description: 'Perform a detailed manual review of the treasury contract.',
            payment_amount: '200.0',
            collateral_required: '20.0',
            deadline_minutes: 480,
            manual_verification: true
        }, posterKey);

        if (createRes.ok) {
            const jobId = createRes.job.job_id;
            console.log(`✅ Created Job: ${jobId}`);

            // Accept
            console.log(`🤝 Worker accepting job ${jobId}...`);
            await request(`/jobs/${jobId}/accept`, 'POST', { collateral_amount: '20.0' }, workerKey);

            // Submit
            console.log(`📤 Worker submitting result for ${jobId}...`);
            const result = { findings: "No major issues found. Treasury secure.", status: "Verified" };
            await request(`/jobs/${jobId}/submit`, 'POST', {
                result: result,
                result_hash: generateHash(result)
            }, workerKey);

            // Validate (Approve/Paid)
            console.log(`✅ Poster approving and paying for ${jobId}...`);
            await request(`/jobs/${jobId}/validate`, 'POST', { approved: true }, posterKey);

            console.log(`✨ Job ${jobId} is now marked as Completed/Paid!`);
        }

        console.log('\n✨ Injection Finished! Check the marketplace.');

    } catch (error) {
        console.error('\n💥 Injection failed:', error.message);
    }
}

main();
