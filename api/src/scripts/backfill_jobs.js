const { ethers } = require('ethers');
const db = require('../config/database');
const blockchain = require('../config/blockchain');

async function getAgentIdByWallet(wallet) {
    const res = await db.query(
        'SELECT agent_id FROM agents WHERE LOWER(wallet_address) = LOWER($1)',
        [wallet]
    );
    if (res.rows.length > 0) return res.rows[0].agent_id;

    const res2 = await db.query(
        'SELECT agent_id FROM agent_wallets WHERE LOWER(wallet_address) = LOWER($1)',
        [wallet]
    );
    return res2.rows.length > 0 ? res2.rows[0].agent_id : null;
}

async function backfill() {
    console.log('🔄 Starting On-chain -> Local DB Backfill...');

    try {
        const contract = blockchain.jobEscrow;
        const totalJobs = await contract.getTotalJobs();
        console.log(`📡 Total jobs found on-chain: ${totalJobs}`);

        for (let i = 0; i < Number(totalJobs); i++) {
            const chainJob = await contract.getJob(i);

            // Generate a local Job ID (deterministic for backfill if possible, or just use UUID)
            // But we don't have the original local Job ID. 
            // We'll create one: "backfilled_" + chainJobId
            const jobId = `backfilled_${i}`;

            // Check if exists
            const check = await db.query('SELECT job_id FROM jobs WHERE chain_job_id = $1', [i]);
            if (check.rows.length > 0) {
                console.log(`ℹ️  Job ${i} already exists in local DB. Skipping.`);
                continue;
            }

            console.log(`📝 Backfilling Job ${i} (Capability: ${chainJob.capability})...`);

            const posterId = await getAgentIdByWallet(chainJob.poster);
            const executorId = await getAgentIdByWallet(chainJob.executor);

            // Status mapping from contract: 0: Posted, 1: Accepted, 2: Completed, 3: Failed
            // OPTIMISTIC MODE: We treat 3 (Failed) as 'completed'
            const statusMap = { 0: 'pending', 1: 'accepted', 2: 'completed', 3: 'completed' };
            const status = statusMap[Number(chainJob.status)] || 'pending';

            await db.query(
                `INSERT INTO jobs (
                    job_id, title, poster_id, executor_id, capability_required, 
                    description, requirements, expected_output_hash, submitted_hash,
                    payment_amount, collateral_required, deadline_minutes, deadline, 
                    status, chain_job_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [
                    jobId,
                    `Backfilled Job ${i}: ${chainJob.capability}`,
                    posterId,
                    executorId,
                    chainJob.capability,
                    'Description not found in backfill.',
                    JSON.stringify({ note: 'Requirements not found in backfill.' }),
                    chainJob.expectedHash,
                    chainJob.submittedHash,
                    ethers.formatEther(chainJob.payment),
                    ethers.formatEther(chainJob.collateral),
                    60, // Default 60 mins
                    new Date(Number(chainJob.deadline) * 1000),
                    status,
                    i,
                    new Date(Number(chainJob.createdAt) * 1000),
                    new Date()
                ]
            );
            console.log(`✅ Job ${i} added to local DB.`);
        }

    } catch (err) {
        console.error('❌ Backfill failed:', err);
    } finally {
        console.log('🏁 Backfill complete.');
        process.exit(0);
    }
}

backfill();
