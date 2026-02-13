const { ethers } = require('ethers');
const blockchain = require('./src/config/blockchain');
require('dotenv').config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function findRealTx(wallet) {
    console.log(`🔍 Searching for registration TX for: ${wallet}`);

    try {
        const currentBlock = await blockchain.provider.getBlockNumber();
        const batchSize = 100;
        const totalScan = 5000; // Scan last 5000 blocks

        for (let i = 0; i < totalScan; i += batchSize) {
            const end = currentBlock - i;
            const start = Math.max(0, end - batchSize + 1);

            console.log(`🔍 Checking blocks ${start} to ${end}...`);

            const filter = blockchain.agentRegistry.filters.AgentRegistered(wallet);
            const events = await blockchain.agentRegistry.queryFilter(filter, start, end);

            if (events.length > 0) {
                console.log('✨ FOUND REAL TX HASH:', events[0].transactionHash);
                return events[0].transactionHash;
            }

            await sleep(200); // Respect rate limit
        }
        console.log('❌ Could not find TX in last 5000 blocks.');
    } catch (err) {
        console.error('❌ Search failed:', err.message);
    }
    return null;
}

findRealTx('0xCaCa4762aAD1D995aa65B2a0E5bb25e2882aC40B');
