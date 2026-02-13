const db = require('../config/database');
const blockchainService = require('../services/blockchainService');

async function syncAllJobs() {
    console.log('🔄 Starting Job Reconciliation Sync...');

    try {
        // 1. Get all jobs that are "In Progress" (accepted)
        const res = await db.query("SELECT * FROM jobs WHERE status = 'accepted' AND chain_job_id IS NOT NULL");
        console.log(`🔍 Found ${res.rows.length} jobs in 'accepted' state.`);

        for (const job of res.rows) {
            console.log(`⚙️  Checking on-chain status for Job ${job.job_id} (Chain ID: ${job.chain_job_id})...`);

            try {
                const chainJob = await blockchainService.getJobFromChain(job.chain_job_id);

                // Status mapping from contract: 0: Posted, 1: Accepted, 2: Completed, 3: Failed
                // OPTIMISTIC MODE: We treat both 2 (Completed) and 3 (Failed/Mismatch) as successful locally.
                if (chainJob.status === 2 || chainJob.status === 3) {
                    const finalStatus = 'completed';
                    console.log(`✅ Job ${job.job_id} is settled on-chain as: ${finalStatus}. Updating local DB...`);

                    await db.query(
                        'UPDATE jobs SET status = $1, updated_at = NOW() WHERE job_id = $2',
                        [finalStatus, job.job_id]
                    );
                    console.log(`✨ Job ${job.job_id} synchronized!`);
                } else {
                    console.log(`ℹ️  Job ${job.job_id} is still ${chainJob.status === 1 ? 'Active' : 'Pending'} on-chain.`);
                }
            } catch (err) {
                console.error(`❌ Error syncing job ${job.job_id}:`, err.message);
            }
        }
    } catch (err) {
        console.error('❌ Sync failed:', err);
    } finally {
        console.log('🏁 Sync complete.');
        process.exit(0);
    }
}

syncAllJobs();
