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

        // 1. Listen for future events
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
     * Map wallet address to agent_id
     */
    async getAgentIdByWallet(wallet) {
        const res = await db.query(
            'SELECT agent_id FROM agents WHERE LOWER(wallet_address) = LOWER($1)',
            [wallet]
        );
        if (res.rows.length > 0) return res.rows[0].agent_id;

        // Try agent_wallets table as fallback
        const res2 = await db.query(
            'SELECT agent_id FROM agent_wallets WHERE LOWER(wallet_address) = LOWER($1)',
            [wallet]
        );
        return res2.rows.length > 0 ? res2.rows[0].agent_id : null;
    }

    /**
     * Record a transaction in the database if it doesn't exist
     */
    async recordTransaction(txHash, agentId, txType, metadata = {}) {
        // Allow anonymous transactions (e.g. from wallets not yet registered as agents)
        if (!agentId) {
            console.log(`ℹ️  Indexing anonymous on-chain transaction: ${txHash}`);
        }

        try {
            // Check if already exists
            const check = await db.query('SELECT tx_hash FROM transactions WHERE tx_hash = $1', [txHash]);
            if (check.rows.length > 0) return;

            console.log(`📝 Indexing agent transaction: ${txHash} (${txType})`);
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

        // Sync job status in database
        const status = data.verified ? 'completed' : 'failed';
        console.log(`📡 Event: Job ${data.jobId} completed on-chain. Syncing status: ${status}`);
        await db.query(
            'UPDATE jobs SET status = $1, payment_tx_hash = $2, updated_at = NOW() WHERE chain_job_id = $3',
            [status, data.txHash, data.jobId]
        );
    }

    async handleJobFailed(data) {
        // Find executor for transaction log (chain_job_id lookup)
        const jobRes = await db.query('SELECT executor_id FROM jobs WHERE chain_job_id = $1', [data.jobId]);
        const agentId = jobRes.rows.length > 0 ? jobRes.rows[0].executor_id : null;

        await this.recordTransaction(data.txHash, agentId, 'job_failed', {
            chain_job_id: data.jobId,
            reason: data.reason,
            slashedAmount: data.slashedAmount
        });

        // Sync job status in database
        console.log(`📡 Event: Job ${data.jobId} failed on-chain. Syncing status: failed`);
        await db.query(
            'UPDATE jobs SET status = \'failed\', updated_at = NOW() WHERE chain_job_id = $1',
            [data.jobId]
        );
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
