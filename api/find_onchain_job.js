require('dotenv').config({ path: './.env' });
const { ethers } = require('ethers');
const blockchain = require('./src/config/blockchain');

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
    const contract = new ethers.Contract(
        process.env.JOB_ESCROW_ADDRESS,
        [
            "function getTotalJobs() view returns (uint256)",
            "function jobCounter() view returns (uint256)",
            "function getJob(uint256) view returns (uint256 jobId, address poster, address executor, bytes32 expectedHash, bytes32 submittedHash, uint256 payment, uint256 collateral, uint256 deadline, uint8 status, string capability, uint256 createdAt, uint256 completedAt)"
        ],
        provider
    );

    const totalJobs = await contract.getTotalJobs();
    console.log(`Total Jobs: ${totalJobs}`);

    const start = Math.max(0, Number(totalJobs) - 20);
    for (let i = Number(totalJobs) - 1; i >= start; i--) {
        try {
            const job = await contract.getJob(i);
            console.log(`Job ${i}: Poster=${job.poster}, Executor=${job.executor}, Status=${job.status}, Capability=${job.capability}`);
        } catch (e) {
            console.error(`Error fetching job ${i}:`, e.message);
        }
    }
}

main().catch(console.error);
