const db = require('./src/config/database');

const targetAddresses = [
    '0xd7F3494070F0e106e6eaDCf6e66A995f279F7bd8',
    '0x75eC984CC2358A05bc8653f6A61A090c04a596BC',
    '0xDd0585006f47a8a5F236186038D883e170476Aa8',
    '0xe6F6E999fEd27F66B38bDb54AC8831403f75B20B',
    '0x3Bc085fdc9e603599085F3bC63A4B3742918828C'
].map(addr => addr.toLowerCase());

async function findAgents() {
    console.log('Searching for agents with target wallets...');
    try {
        const result = await db.query('SELECT agent_id, name, wallet_address FROM agents');
        const found = result.rows.filter(row => targetAddresses.includes(row.wallet_address.toLowerCase()));

        console.log(`Found ${found.length} agents matching the target addresses.`);
        found.forEach(agent => {
            console.log(`Agent ID: ${agent.agent_id}, Name: ${agent.name}, Wallet: ${agent.wallet_address}`);
        });

        // If none found, check if they are in agent_wallets table instead
        if (found.length === 0) {
            console.log('Checking agent_wallets table...');
            const walletResult = await db.query('SELECT agent_id, wallet_address FROM agent_wallets');
            const foundWallets = walletResult.rows.filter(row => targetAddresses.includes(row.wallet_address.toLowerCase()));
            console.log(`Found ${foundWallets.length} wallet entries matching.`);
            foundWallets.forEach(w => {
                console.log(`Agent ID: ${w.agent_id}, Wallet: ${w.wallet_address}`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findAgents();
