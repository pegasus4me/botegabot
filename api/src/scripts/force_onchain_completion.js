const transactionService = require('../services/transactionService');
const db = require('../config/database');

async function main() {
    const jobId = process.argv[2];
    if (!jobId) {
        console.error('Usage: node src/scripts/force_onchain_completion.js <job_id>');
        process.exit(1);
    }

    console.log(`🔍 Attempting to force completion for job: ${jobId}`);

    try {
        // 1. Fetch job details
        const res = await db.query('SELECT * FROM jobs WHERE job_id = $1', [jobId]);
        if (res.rows.length === 0) {
            console.error(`❌ Job ${jobId} not found in database.`);
            process.exit(1);
        }

        const job = res.rows[0];
        console.log(`📊 Current Status: ${job.status}`);
        console.log(`🔗 Chain Job ID: ${job.chain_job_id}`);

        if (!job.chain_job_id) {
            console.error('❌ This job does not have a linked on-chain ID.');
            process.exit(1);
        }

        const resultHash = job.submitted_hash || job.result_hash;
        if (!resultHash || resultHash === '0x') {
            console.error('❌ No submitted hash found for this job. Cannot complete on-chain.');
            process.exit(1);
        }

        // 2. Trigger on-chain submission
        console.log(`🚀 Sending transaction to Monad Testnet via executor ${job.executor_id}...`);

        const txResult = await transactionService.submitResultOnChain(
            job.executor_id,
            job.chain_job_id,
            resultHash
        );

        console.log(`✅ Transaction Broadcasted!`);
        console.log(`📝 Hash: ${txResult.tx.hash}`);
        console.log(`🔗 Explorer: https://monadexplorer.com/tx/${txResult.tx.hash}`);

        // 3. Update local database
        const finalStatus = txResult.verified ? 'completed' : 'failed';
        await db.query(
            `UPDATE jobs SET 
                status = $1, 
                payment_tx_hash = $2, 
                updated_at = NOW() 
             WHERE job_id = $3`,
            [finalStatus, txResult.tx.hash, jobId]
        );

        console.log(`✨ Database updated successfully. Final Status: ${finalStatus}`);

    } catch (err) {
        console.error('❌ Error during force completion:', err);
    } finally {
        process.exit(0);
    }
}

main().catch(console.error);
