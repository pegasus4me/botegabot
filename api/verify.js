const axios = require('axios');

const API_URL = 'http://localhost:4000/v1';

async function run() {
    try {
        console.log('Registering Poster Agent...');
        const posterRes = await axios.post(`${API_URL}/agents/register`, {
            name: `Poster_${Date.now()}`,
            capabilities: ['hiring']
        });
        const posterKey = posterRes.data.agent.api_key;
        console.log('Poster API Key:', posterKey);
        const posterId = posterRes.data.agent.agent_id;
        console.log(`Poster: ${posterId}`);

        console.log('Registering Worker Agent...');
        const workerRes = await axios.post(`${API_URL}/agents/register`, {
            name: `Worker_${Date.now()}`,
            capabilities: ['working']
        });
        const workerKey = workerRes.data.agent.api_key;
        const workerId = workerRes.data.agent.agent_id;
        console.log(`Worker: ${workerId}`);

        console.log('Posting Job (Manual Verification)...');
        // Note: posting might require funds. If new agents have 0 balance, this might fail.
        // Assuming testnet or local environment allows it or gives initial balance.
        try {
            const jobRes = await axios.post(`${API_URL}/jobs`, {
                title: 'Manual Verification Test',
                description: 'Test job',
                capability_required: 'working',
                payment_amount: '0',
                collateral_required: '0',
                deadline_minutes: 60,
                manual_verification: true
            }, {
                headers: { Authorization: `Bearer ${posterKey}` }
            });
            const jobId = jobRes.data.job.job_id;
            console.log(`Job Posted: ${jobId}`);

            console.log('Worker Accepting Job...');
            await axios.post(`${API_URL}/jobs/${jobId}/accept`, {
                collateral_amount: '0.000000'
            }, {
                headers: { Authorization: `Bearer ${workerKey}` }
            });
            console.log('Job Accepted');

            const crypto = require('crypto');
            const validHash = '0x' + crypto.createHash('sha256').update(JSON.stringify({ foo: 'bar' })).digest('hex');

            console.log('Worker Submitting Result...');
            await axios.post(`${API_URL}/jobs/${jobId}/submit`, {
                result: { foo: 'bar' },
                result_hash: validHash
            }, {
                headers: { Authorization: `Bearer ${workerKey}` }
            });
            console.log('Result Submitted');

            console.log('Checking Status (Expecting pending_review)...');
            const statusRes = await axios.get(`${API_URL}/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${posterKey}` }
            });
            console.log(`Status: ${statusRes.data.job.status}`);

            if (statusRes.data.job.status !== 'pending_review') {
                throw new Error(`Expected pending_review, got ${statusRes.data.job.status}`);
            }

            console.log('Approving Job...');
            await axios.post(`${API_URL}/jobs/${jobId}/validate`, {
                approved: true
            }, {
                headers: { Authorization: `Bearer ${posterKey}` }
            });
            console.log('Job Approved');

            console.log('Checking Final Status (Expecting completed)...');
            const finalRes = await axios.get(`${API_URL}/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${posterKey}` }
            });
            console.log(`Final Status: ${finalRes.data.job.status}`);

            if (finalRes.data.job.status !== 'completed') {
                throw new Error(`Expected completed, got ${finalRes.data.job.status}`);
            }

            console.log('VERIFICATION SUCCESSFUL');

        } catch (e) {
            console.error('Job Flow Failed:', e.response ? e.response.data : e.message);
        }

    } catch (e) {
        console.error('Setup Failed:', e.response ? e.response.data : e.message);
    }
}

run();
