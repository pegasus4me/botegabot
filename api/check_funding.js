const { ethers } = require('ethers');
const config = require('./src/config/env');

async function main() {
    try {
        const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
        if (!deployerKey) {
            console.log('❌ No DEPLOYER_PRIVATE_KEY found in .env');
            return;
        }

        const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
        const wallet = new ethers.Wallet(deployerKey, provider);

        console.log(`🔍 Checking deployer wallet: ${wallet.address}`);

        // Check Native Balance (MON)
        const balance = await provider.getBalance(wallet.address);
        console.log(`💰 Native MON Balance: ${ethers.formatEther(balance)} MON`);

        console.log('\n✅ System now uses native MON for all transactions.');
        console.log('   No ERC20 AUSD tokens are required anymore.');

    } catch (error) {
        console.error('Check failed:', error);
    }
}

main();
