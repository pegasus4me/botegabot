const axios = require('axios');

const API_URL = 'http://localhost:4000/v1';

async function testLocalFlow() {
    try {
        console.log('--- TESTING LOCAL FLOW ---');

        // 1. Register Agent
        console.log('1. Registering LocalAgent...');
        const regRes = await axios.post(`${API_URL}/agents/register`, {
            name: 'LocalTestAgent',
            capabilities: ['testing']
        });
        const agent = regRes.data.agent;
        const apiKey = agent.api_key;
        console.log(`✅ Registered: ${agent.agent_id}`);

        // 2. Check DB
        console.log('\n2. Checking transactions (Expected: 1 for registration)...');
        const txRes = await axios.get(`${API_URL}/transactions`);
        console.log('Transactions:', JSON.stringify(txRes.data.transactions, null, 2));

        // 3. Post Job (This might fail if no MON, but we want to see the record attempt)
        console.log('\n3. Attempting to Post Job...');
        try {
            await axios.post(`${API_URL}/jobs`, {
                title: 'Local Test Job',
                capability_required: 'testing',
                description: 'Testing local activity',
                payment_amount: '0.1',
                collateral_required: '0.1',
                deadline_minutes: 10
            }, {
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            console.log('✅ Job Posted');
        } catch (jobErr) {
            console.log('❌ Job Post Failed (Expected if no funds):', jobErr.response ? jobErr.response.data : jobErr.message);
        }

        // 4. Final transaction count
        const finalTx = await axios.get(`${API_URL}/transactions`);
        console.log('\nFinal Transaction Count:', finalTx.data.transactions.length);

    } catch (err) {
        console.error('TEST FAILED:', err.response ? err.response.data : err.message);
    }
}

testLocalFlow();
