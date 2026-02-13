const blockchainService = require('./blockchainService');
const blockchain = require('../config/blockchain');
const db = require('../config/database');
const { ethers } = require('ethers');

class IndexerService {
    /**
     * Start the on-chain indexer
     */
    async start() {
        console.log('⛓️  Starting On-chain Indexer...');

        // 1. Initial historical scan (last 5000 blocks)
        await this.scanRecentBlocks(5000);

        // 2. Listen for future events
        blockchainService.listenToEvents({
            onJobPosted: async (data) => this.handleJobPosted(data),
            onJobAccepted: async (data) => this.handleJobAccepted(data),
            onJobCompleted: async (data) => this.handleJobCompleted(data),
            onJobFailed: async (data) => this.handleJobFailed(data),
            onAgentRegistered: async (data) => this.handleAgentRegistered(data)
        });

        console.log('📡 Indexer listening to Monad blockchain events');
    }

    /**
     * Scan recent blocks for missed events in chunks to respect RPC limits
     */
    async scanRecentBlocks(blockRange = 100) {
        try {
            const currentBlock = await blockchain.provider.getBlockNumber();
            const startBlock = Math.max(0, currentBlock - blockRange);

            console.log(`🔎 Scanning blocks ${startBlock} to ${currentBlock} for missed events (chunked)...`);

            // Alchemy free tier limit is 10 blocks per eth_getLogs
            const CHUNK_SIZE = 10;
            for (let i = startBlock; i < currentBlock; i += CHUNK_SIZE) {
                const toBlock = Math.min(i + CHUNK_SIZE - 1, currentBlock);
                await this.scanBlockRange(i, toBlock);
            }

            console.log(`✅ Historical scan complete.`);
        } catch (err) {
            console.error('❌ Historical scan failed:', err.message);
        }
    }

    /**
     * Scan a specific block range for events
     */
    async scanBlockRange(fromBlock, toBlock) {
        // Scan JobEscrow events
        const jobPostedEvents = await blockchain.jobEscrow.queryFilter('JobPosted', fromBlock, toBlock);
        for (const event of jobPostedEvents) {
            const { jobId, poster, payment, collateral, capability, deadline } = event.args;
            await this.handleJobPosted({
                jobId: Number(jobId),
                poster,
                payment: ethers.formatEther(payment),
                collateral: ethers.formatEther(collateral),
                capability,
                deadline: Number(deadline),
                txHash: event.transactionHash
            });
        }

        // Scan AgentRegistry events
        const agentRegEvents = await blockchain.agentRegistry.queryFilter('AgentRegistered', fromBlock, toBlock);
        for (const event of agentRegEvents) {
            const { wallet, capabilities, timestamp } = event.args;
            await this.handleAgentRegistered({
                wallet,
                capabilities,
                timestamp: Number(timestamp),
                txHash: event.transactionHash
            });
        }
    }

    /**
     * Map wallet address to agent_id
     */
    async getAgentIdByWallet(wallet) {
        const res = await db.query(
            'SELECT agent_id FROM agents WHERE wallet_address = $1',
            [wallet]
        );
        if (res.rows.length > 0) return res.rows[0].agent_id;

        // Try agent_wallets table as fallback
        const res2 = await db.query(
            'SELECT agent_id FROM agent_wallets WHERE wallet_address = $1',
            [wallet]
        );
        return res2.rows.length > 0 ? res2.rows[0].agent_id : null;
    }

    /**
     * Record a transaction in the database if it doesn't exist
     */
    async recordTransaction(txHash, agentId, txType, metadata = {}) {
        try {
            // Check if already exists to avoid duplicates
            const check = await db.query('SELECT tx_hash FROM transactions WHERE tx_hash = $1', [txHash]);
            if (check.rows.length > 0) return;

            console.log(`📝 Indexing on-chain transaction: ${txHash} (${txType})`);
            await db.query(
                `INSERT INTO transactions (tx_hash, agent_id, tx_type, status, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [txHash, agentId, txType, 'confirmed', JSON.stringify(metadata), new Date()]
            );
        } catch (err) {
            console.error(`❌ Failed to record indexed transaction ${txHash}:`, err.message);
        }
    }

    async handleJobPosted(data) {
        const agentId = await this.getAgentIdByWallet(data.poster);
        await this.recordTransaction(data.txHash, agentId, 'post_job', {
            chain_job_id: data.jobId,
            payment: data.payment,
            collateral: data.collateral,
            capability: data.capability,
            wallet: data.poster
        });

        // If it's a new job from another instance/agent, we should ideally add it to 'jobs' too
        // but for now let's focus on Live Activity (transactions).
    }

    async handleJobAccepted(data) {
        const agentId = await this.getAgentIdByWallet(data.executor);
        await this.recordTransaction(data.txHash, agentId, 'accept_job', {
            chain_job_id: data.jobId,
            collateral: data.collateral,
            wallet: data.executor
        });
    }

    async handleJobCompleted(data) {
        const agentId = await this.getAgentIdByWallet(data.executor);
        await this.recordTransaction(data.txHash, agentId, 'submit_result', {
            chain_job_id: data.jobId,
            verified: data.verified,
            payment: data.payment,
            wallet: data.executor
        });
    }

    async handleJobFailed(data) {
        // Find which job it was to find the executor
        // Skipping complex lookup for MVP transactions log
    }

    async handleAgentRegistered(data) {
        const agentId = await this.getAgentIdByWallet(data.wallet);
        await this.recordTransaction(data.txHash, agentId, 'register', {
            wallet: data.wallet,
            capabilities: data.capabilities
        });
    }
}

module.exports = new IndexerService();
