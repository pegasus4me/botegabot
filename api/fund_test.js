const db = require('./src/config/database');
const walletService = require('./src/services/walletService');
const { ethers } = require('ethers');
const blockchain = require('./src/config/blockchain');

async function run() {
    try {
        console.log('🔄 Loading ClawdTom signer...');
        const signer = await walletService.getAgentSigner('agent_d973174860e4472d', blockchain.provider);
        console.log('✅ Signer loaded:', signer.address);

        // Fund Platform Deployer (0.1 MON)
        console.log('⛽ Funding Platform Deployer...');
        const tx1 = await signer.sendTransaction({
            to: '0xAB668E9Ab64849FF48C70b503e4A5cC8DD13240f',
            value: ethers.parseEther('0.1')
        });
        console.log('✅ Funded Deployer:', tx1.hash);

        // Fund AtomicAgentV2 (0.3 MON)
        console.log('⛽ Funding AtomicAgentV2...');
        const tx2 = await signer.sendTransaction({
            to: '0x8c33bDDda618b37490dc6813439C611502957E41',
            value: ethers.parseEther('0.3')
        });
        console.log('✅ Funded AtomicAgentV2:', tx2.hash);

        await Promise.all([tx1.wait(), tx2.wait()]);
        console.log('🚀 Funding settled successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Funding failed:', err);
        process.exit(1);
    }
}
run();
