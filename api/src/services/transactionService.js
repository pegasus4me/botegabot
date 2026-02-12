const { ethers } = require('ethers');
const db = require('../config/database');
const blockchain = require('../config/blockchain');
const walletService = require('./walletService');

class TransactionService {
    /**
     * Record transaction in database
     */
    async recordTransaction(txHash, agentId, txType, metadata = {}) {
        await db.query(
            `INSERT INTO transactions (tx_hash, agent_id, tx_type, status, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
            [txHash, agentId, txType, 'pending', JSON.stringify(metadata)]
        );
    }

    /**
     * Update transaction status
     */
    async updateTransaction(txHash, status, receipt = null) {
        const updates = { status };

        if (receipt) {
            updates.gas_used = receipt.gasUsed?.toString();
            updates.gas_price = receipt.gasPrice?.toString();
            updates.block_number = receipt.blockNumber;
            updates.confirmed_at = new Date();
        }

        const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = [txHash, ...Object.values(updates)];

        await db.query(
            `UPDATE transactions SET ${setClauses} WHERE tx_hash = $1`,
            values
        );
    }

    /**
     * Wait for transaction confirmation and update database
     */
    async waitForConfirmation(tx, agentId, txType) {
        try {
            console.log(`⏳ Waiting for tx confirmation: ${tx.hash}`);

            const receipt = await tx.wait();

            await this.updateTransaction(tx.hash, 'confirmed', receipt);

            console.log(`✅ Transaction confirmed: ${tx.hash}`);

            return receipt;

        } catch (error) {
            console.error(`❌ Transaction failed: ${tx.hash}`, error);

            await db.query(
                'UPDATE transactions SET status = $1, error_message = $2 WHERE tx_hash = $3',
                ['failed', error.message, tx.hash]
            );

            throw error;
        }
    }


    /**
     * Register agent on-chain
     */
    async registerAgentOnChain(agentId, capabilities) {
        try {
            const signer = await walletService.getAgentSigner(agentId, blockchain.provider);
            const registryWithSigner = blockchain.agentRegistry.connect(signer);

            console.log(`📝 Registering agent ${agentId} on-chain...`);

            const tx = await registryWithSigner.registerAgent(capabilities);

            await this.recordTransaction(tx.hash, agentId, 'register_agent', {
                capabilities
            });

            const receipt = await this.waitForConfirmation(tx, agentId, 'register_agent');

            return { tx, receipt };

        } catch (error) {
            console.error('Error registering agent on-chain:', error);
            throw error;
        }
    }

    /**
     * Post job on-chain
     */
    async postJobOnChain(agentId, jobData) {
        try {
            const { capability, expectedHash, payment, collateral, deadlineMinutes } = jobData;

            const signer = await walletService.getAgentSigner(agentId, blockchain.provider);
            const escrowWithSigner = blockchain.jobEscrow.connect(signer);

            const paymentWei = ethers.parseEther(payment.toString());
            const collateralWei = ethers.parseEther(collateral.toString());

            // Ensure hash is 32 bytes (64 hex characters + 0x)
            let normalizedHash = expectedHash;
            if (!normalizedHash || normalizedHash === '0x' || normalizedHash === 'HASH_PLACEHOLDER') {
                normalizedHash = ethers.ZeroHash;
            }

            console.log(`📝 Posting job on-chain: ${capability}, ${payment} MON...`);

            // Post job with native value
            const tx = await escrowWithSigner.postJob(
                normalizedHash,
                paymentWei,
                collateralWei,
                capability,
                deadlineMinutes,
                { value: paymentWei }
            );

            await this.recordTransaction(tx.hash, agentId, 'post_job', {
                capability,
                payment: payment.toString(),
                collateral: collateral.toString()
            });

            const receipt = await this.waitForConfirmation(tx, agentId, 'post_job');

            // Extract job ID from events
            const jobPostedEvent = receipt.logs.find(log => {
                try {
                    const parsed = blockchain.jobEscrow.interface.parseLog(log);
                    return parsed?.name === 'JobPosted';
                } catch {
                    return false;
                }
            });

            let chainJobId = null;
            if (jobPostedEvent) {
                const parsed = blockchain.jobEscrow.interface.parseLog(jobPostedEvent);
                chainJobId = Number(parsed.args.jobId);
            }

            return { tx, receipt, chainJobId };

        } catch (error) {
            console.error('Error posting job on-chain:', error);
            throw error;
        }
    }

    /**
     * Accept job on-chain
     */
    async acceptJobOnChain(agentId, chainJobId, collateralAmount) {
        try {
            const signer = await walletService.getAgentSigner(agentId, blockchain.provider);
            const escrowWithSigner = blockchain.jobEscrow.connect(signer);

            console.log(`📝 Accepting job ${chainJobId} on-chain with collateral ${collateralAmount} MON...`);

            const collateralWei = ethers.parseEther(collateralAmount.toString());

            // Accept job with native value
            const tx = await escrowWithSigner.acceptJob(chainJobId, { value: collateralWei });

            await this.recordTransaction(tx.hash, agentId, 'accept_job', {
                chain_job_id: chainJobId,
                collateral: collateralAmount.toString()
            });

            const receipt = await this.waitForConfirmation(tx, agentId, 'accept_job');

            return { tx, receipt };

        } catch (error) {
            console.error('Error accepting job on-chain:', error);
            throw error;
        }
    }

    /**
     * Submit result on-chain
     */
    async submitResultOnChain(agentId, chainJobId, resultHash) {
        try {
            const signer = await walletService.getAgentSigner(agentId, blockchain.provider);
            const escrowWithSigner = blockchain.jobEscrow.connect(signer);

            console.log(`📝 Submitting result for job ${chainJobId}...`);

            const tx = await escrowWithSigner.submitResult(chainJobId, resultHash);

            await this.recordTransaction(tx.hash, agentId, 'submit_result', {
                chain_job_id: chainJobId,
                result_hash: resultHash
            });

            const receipt = await this.waitForConfirmation(tx, agentId, 'submit_result');

            // Check if job was completed or failed
            const jobCompletedEvent = receipt.logs.find(log => {
                try {
                    const parsed = blockchain.jobEscrow.interface.parseLog(log);
                    return parsed?.name === 'JobCompleted';
                } catch {
                    return false;
                }
            });

            let verified = false;
            if (jobCompletedEvent) {
                const parsed = blockchain.jobEscrow.interface.parseLog(jobCompletedEvent);
                verified = parsed.args.verified;
            }

            return { tx, receipt, verified };

        } catch (error) {
            console.error('Error submitting result on-chain:', error);
            throw error;
        }
    }

    /**
     * Get transaction status
     */
    async getTransactionStatus(txHash) {
        const result = await db.query(
            'SELECT * FROM transactions WHERE tx_hash = $1',
            [txHash]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    /**
     * Get agent's transaction history
     */
    async getAgentTransactions(agentId, limit = 50) {
        const result = await db.query(
            `SELECT * FROM transactions 
       WHERE agent_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
            [agentId, limit]
        );

        return result.rows;
    }
}

// Singleton instance
const transactionService = new TransactionService();

module.exports = transactionService;
