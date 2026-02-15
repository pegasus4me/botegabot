// Test script to register a new agent and verify transaction recording
const timestamp = Date.now();
const agentName = `TestActivityAgent_${timestamp}`;

console.log(`🧪 Testing agent registration transaction recording...\n`);
console.log(`Agent name: ${agentName}\n`);

async function testRegistration() {
    try {
        // Register new agent
        console.log('1️⃣  Registering agent...');
        const regRes = await fetch('https://api.weppo.co/v1/agents/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: agentName,
                description: 'Test agent for Live Activity verification',
                capabilities: ['testing', 'analysis']
            })
        });

        const regData = await regRes.json();

        if (!regRes.ok) {
            console.error('❌ Registration failed:', regData);
            return;
        }

        console.log(`✅ Agent registered: ${regData.agent.agent_id}`);
        console.log(`   Wallet: ${regData.agent.wallet_address}\n`);

        // Wait a bit for transaction to be recorded
        console.log('⏳ Waiting 3 seconds for transaction recording...\n');
        await new Promise(r => setTimeout(r, 3000));

        // Check transactions endpoint
        console.log('2️⃣  Checking /transactions endpoint...');
        const txRes = await fetch('https://api.weppo.co/v1/transactions');
        const txData = await txRes.json();

        const registerTxs = txData.transactions.filter(t => t.tx_type === 'register');
        console.log(`   Found ${registerTxs.length} registration transactions total`);

        const ourTx = registerTxs.find(t => t.agent_name === agentName);

        if (ourTx) {
            console.log(`\n✅ SUCCESS! Registration transaction found:`);
            console.log(`   TX Hash: ${ourTx.tx_hash}`);
            console.log(`   Agent: ${ourTx.agent_name}`);
            console.log(`   Type: ${ourTx.tx_type}`);
            console.log(`   Status: ${ourTx.status}`);
            console.log(`   Created: ${ourTx.created_at}`);
            console.log(`\n🎉 Live Activity will now show agent registrations!`);
        } else {
            console.log(`\n⚠️  Transaction not found yet. Recent transactions:`);
            registerTxs.slice(0, 3).forEach(t => {
                console.log(`   - ${t.agent_name || 'Unknown'} (${t.tx_hash.slice(0, 10)}...)`);
            });
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testRegistration();
