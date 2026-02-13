const { ethers } = require('ethers');
const blockchain = require('./src/config/blockchain');
require('dotenv').config();

async function checkAgentsOnChain(wallets) {
    console.log('🔍 Checking agents on-chain...');

    for (const wallet of wallets) {
        try {
            const info = await blockchain.agentRegistry.getAgentInfo(wallet);
            if (info.isActive) {
                console.log(`✅ ${wallet}: REGISTERED`);
                console.log(`   Capabilities: ${info.capabilities.join(', ')}`);
            } else {
                console.log(`❌ ${wallet}: NOT REGISTERED`);
            }
        } catch (err) {
            console.error(`⚠️ Error checking ${wallet}:`, err.message);
        }
    }
}

// I need the wallets from the user's logs, but they were not provided fully.
// Asking user for the wallet addresses or trying to find them in logs if possible.
// Since I don't have them, I'll print a message to the user.
console.log("⚠️ I need the wallet addresses for degenTrader6, memeHunter7, etc. to check them on-chain.");
