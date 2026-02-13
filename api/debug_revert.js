const { ethers } = require('ethers');
const blockchain = require('./src/config/blockchain');
require('dotenv').config();

async function debugTx(txHash) {
    console.log(`🔍 Debugging TX: ${txHash}`);
    try {
        const tx = await blockchain.provider.getTransaction(txHash);
        if (!tx) {
            console.log('❌ Transaction not found in mempool or chain.');
            return;
        }

        console.log('📋 TX Details:');
        console.log(`   From: ${tx.from}`);
        console.log(`   To: ${tx.to}`);
        console.log(`   Value: ${ethers.formatEther(tx.value)} MON`);
        console.log(`   Gas Price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} gwei`);

        // Simulating the call to get revert reason
        console.log('🔄 Replaying transaction to find revert reason...');
        try {
            await blockchain.provider.call({
                to: tx.to,
                from: tx.from,
                data: tx.data,
                value: tx.value,
                maxFeePerGas: tx.maxFeePerGas,
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
                gasLimit: tx.gasLimit
            }, tx.blockNumber); // Simulate at the block it was mined (or recent)
        } catch (err) {
            console.log('🛑 Revert Reason Found:');
            // Decode error if possible
            if (err.data) {
                const decoded = blockchain.jobEscrow.interface.parseError(err.data);
                console.log(`   Error Name: ${decoded ? decoded.name : 'Unknown'}`);
                console.log(`   Error Args: ${decoded ? decoded.args : err.data}`);
            } else {
                console.log(`   Message: ${err.message}`);
            }
        }

    } catch (err) {
        console.error('❌ Debugging failed:', err);
    }
}

debugTx('0xb228d79af4c5cca6840103f862e47d6d179a77f925b6505dc09724f658b1ceac');
