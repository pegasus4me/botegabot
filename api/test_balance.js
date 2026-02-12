const { ethers } = require('ethers');
require('dotenv').config();

const rpcUrl = process.env.MONAD_RPC_URL;
const walletAddress = '0x75eC984CC2358A05bc8653f6A61A090c04a596BC';

async function checkBalance() {
    console.log(`Checking balance for ${walletAddress} on ${rpcUrl}...`);
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(walletAddress);
        console.log(`Native Balance: ${ethers.formatEther(balance)} MON`);

        // Also check if there's an Agora USD (MON) ERC20 token
        // The user mentioned "MON ERC20 (Agora USD)"
        // I'll search for typical Agora USD addresses on Monad if possible, 
        // but since I can't browse, I'll look for it in the codebase again.
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkBalance();
