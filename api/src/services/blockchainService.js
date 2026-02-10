const { ethers } = require('ethers');
const blockchain = require('../config/blockchain');

/**
 * Get agent info from blockchain
 */
async function getAgentInfo(walletAddress) {
    try {
        const info = await blockchain.agentRegistry.getAgentInfo(walletAddress);
        return {
            wallet: info.wallet,
            capabilities: info.capabilities,
            reputationScore: Number(info.reputationScore),
            totalJobsCompleted: Number(info.totalJobsCompleted),
            totalJobsPosted: Number(info.totalJobsPosted),
            totalEarned: ethers.formatEther(info.totalEarned),
            totalSpent: ethers.formatEther(info.totalSpent),
            isActive: info.isActive,
            registeredAt: Number(info.registeredAt)
        };
    } catch (error) {
        throw new Error(`Failed to get agent info: ${error.message}`);
    }
}

/**
 * Check if agent is registered on-chain
 */
async function isAgentRegistered(walletAddress) {
    try {
        return await blockchain.agentRegistry.isRegistered(walletAddress);
    } catch (error) {
        return false;
    }
}

/**
 * Get AUSD balance for a wallet
 */
async function getAusdBalance(walletAddress) {
    try {
        const balance = await blockchain.ausdToken.balanceOf(walletAddress);
        return ethers.formatEther(balance);
    } catch (error) {
        throw new Error(`Failed to get AUSD balance: ${error.message}`);
    }
}

/**
 * Get job details from blockchain
 */
async function getJobFromChain(chainJobId) {
    try {
        const job = await blockchain.jobEscrow.getJob(chainJobId);
        return {
            jobId: Number(job.jobId),
            poster: job.poster,
            executor: job.executor,
            expectedHash: job.expectedHash,
            submittedHash: job.submittedHash,
            payment: ethers.formatEther(job.payment),
            collateral: ethers.formatEther(job.collateral),
            deadline: Number(job.deadline),
            status: Number(job.status),
            capability: job.capability,
            createdAt: Number(job.createdAt),
            completedAt: Number(job.completedAt)
        };
    } catch (error) {
        throw new Error(`Failed to get job from chain: ${error.message}`);
    }
}

/**
 * Listen to blockchain events
 */
function listenToEvents(eventHandlers) {
    // JobPosted event
    if (eventHandlers.onJobPosted) {
        blockchain.jobEscrow.on('JobPosted', (jobId, poster, payment, collateral, capability, deadline, event) => {
            eventHandlers.onJobPosted({
                jobId: Number(jobId),
                poster,
                payment: ethers.formatEther(payment),
                collateral: ethers.formatEther(collateral),
                capability,
                deadline: Number(deadline),
                txHash: event.log.transactionHash
            });
        });
    }

    // JobAccepted event
    if (eventHandlers.onJobAccepted) {
        blockchain.jobEscrow.on('JobAccepted', (jobId, executor, collateral, event) => {
            eventHandlers.onJobAccepted({
                jobId: Number(jobId),
                executor,
                collateral: ethers.formatEther(collateral),
                txHash: event.log.transactionHash
            });
        });
    }

    // JobCompleted event
    if (eventHandlers.onJobCompleted) {
        blockchain.jobEscrow.on('JobCompleted', (jobId, verified, payment, executor, event) => {
            eventHandlers.onJobCompleted({
                jobId: Number(jobId),
                verified,
                payment: ethers.formatEther(payment),
                executor,
                txHash: event.log.transactionHash
            });
        });
    }

    // JobFailed event
    if (eventHandlers.onJobFailed) {
        blockchain.jobEscrow.on('JobFailed', (jobId, reason, slashedAmount, event) => {
            eventHandlers.onJobFailed({
                jobId: Number(jobId),
                reason,
                slashedAmount: ethers.formatEther(slashedAmount),
                txHash: event.log.transactionHash
            });
        });
    }
}

module.exports = {
    getAgentInfo,
    isAgentRegistered,
    getAusdBalance,
    getJobFromChain,
    listenToEvents
};
