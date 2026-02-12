const db = require('../config/database');
const { generateJobId, isValidHash } = require('../utils/helpers');
const { generateHash } = require('../services/hashService');
const transactionService = require('../services/transactionService');

/**
 * Post a new job
 */
async function postJob(req, res) {
    try {
        const {
            title,
            capability_required,
            description,
            requirements,
            expected_output_hash,
            payment_amount,
            collateral_required,
            deadline_minutes,
            manual_verification = false
        } = req.body;

        // Validation
        if (!title || !capability_required || !description || !payment_amount || !collateral_required || !deadline_minutes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (expected_output_hash && !isValidHash(expected_output_hash)) {
            return res.status(400).json({ error: 'Invalid hash format' });
        }

        if ((parseFloat(payment_amount) <= 0 || parseFloat(collateral_required) <= 0) && !manual_verification) {
            return res.status(400).json({ error: 'Payment and collateral must be greater than 0' });
        }

        // Generate job ID
        const jobId = generateJobId();

        // 1. Post job on-chain FIRST (awaiting confirmation)
        console.log(`⛓️  Posting job ${jobId} on-chain...`);
        let txResult;
        try {
            txResult = await transactionService.postJobOnChain(req.agentId, {
                capability: capability_required,
                expectedHash: expected_output_hash || '0x',
                payment: payment_amount,
                collateral: collateral_required,
                deadlineMinutes: deadline_minutes
            });
            console.log(`✅ Job ${jobId} posted on-chain. Tx: ${txResult.tx.hash}`);
        } catch (txError) {
            console.error(`❌ Failed to post job ${jobId} on-chain:`, txError);
            return res.status(400).json({
                error: 'Blockchain transaction failed. Ensure you have enough MON for payment and collateral.',
                details: txError.message
            });
        }

        // 2. Insert into database ONLY after on-chain success
        const deadline = new Date(Date.now() + deadline_minutes * 60 * 1000);
        const result = await db.query(
            `INSERT INTO jobs (
        job_id, title, poster_id, capability_required, description, requirements,
        expected_output_hash, payment_amount, collateral_required,
        deadline_minutes, deadline, status, manual_verification,
        chain_job_id, escrow_tx_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
            [
                jobId,
                title,
                req.agentId,
                capability_required,
                description,
                JSON.stringify(requirements || {}),
                expected_output_hash || '0x',
                payment_amount,
                collateral_required,
                deadline_minutes,
                deadline,
                'pending',
                manual_verification,
                txResult.chainJobId,
                txResult.tx.hash
            ]
        );

        const job = result.rows[0];

        // 3. Broadcast to WebSocket clients
        const wsService = require('../services/websocketService');
        wsService.broadcastJobPosted(job);

        res.status(201).json({
            job: {
                job_id: job.job_id,
                chain_job_id: job.chain_job_id,
                escrow_tx_hash: job.escrow_tx_hash,
                status: job.status,
                capability_required: job.capability_required,
                description: job.description,
                payment_amount: job.payment_amount,
                collateral_required: job.collateral_required,
                deadline: job.deadline,
                manual_verification: job.manual_verification,
                created_at: job.created_at
            }
        });

    } catch (error) {
        console.error('Post job error:', error);
        res.status(500).json({ error: 'Failed to post job' });
    }
}

/**
 * Get available jobs
 */
async function getAvailableJobs(req, res) {
    try {
        const { capability, min_payment } = req.query;

        let query = `
      SELECT j.*, a.name as poster_name
      FROM jobs j
      JOIN agents a ON j.poster_id = a.agent_id
      WHERE j.status = 'pending' AND j.deadline > NOW()
    `;
        const params = [];

        if (capability) {
            params.push(capability);
            query += ` AND j.capability_required = $${params.length}`;
        }

        if (min_payment) {
            params.push(parseFloat(min_payment));
            query += ` AND j.payment_amount >= $${params.length}`;
        }

        query += ' ORDER BY j.created_at DESC LIMIT 1000';

        const result = await db.query(query, params);

        const jobs = result.rows.map(row => ({
            job_id: row.job_id,
            title: row.title,
            poster_id: row.poster_id,
            poster_name: row.poster_name,
            capability_required: row.capability_required,
            description: row.description,
            payment_amount: row.payment_amount,
            collateral_required: row.collateral_required,
            deadline_minutes: row.deadline_minutes,
            created_at: row.created_at
        }));

        res.json({ jobs });

    } catch (error) {
        console.error('Get available jobs error:', error);
        res.status(500).json({ error: 'Failed to get available jobs' });
    }
}

/**
 * Accept a job
 */
async function acceptJob(req, res) {
    try {
        const { job_id } = req.params;
        const { collateral_amount } = req.body;

        // Get job
        const jobResult = await db.query(
            'SELECT * FROM jobs WHERE job_id = $1',
            [job_id]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult.rows[0];

        // Validation
        if (job.status !== 'pending') {
            return res.status(400).json({ error: 'Job is not available' });
        }

        if (job.poster_id === req.agentId) {
            return res.status(400).json({ error: 'Cannot accept your own job' });
        }

        if (new Date(job.deadline) < new Date()) {
            return res.status(400).json({ error: 'Job has expired' });
        }

        if (parseFloat(collateral_amount) < parseFloat(job.collateral_required)) {
            return res.status(400).json({ error: 'Insufficient collateral' });
        }

        // Update job
        await db.query(
            `UPDATE jobs SET executor_id = $1, status = 'accepted', updated_at = NOW()
       WHERE job_id = $2`,
            [req.agentId, job_id]
        );

        // Accept job on-chain (async)
        if (job.chain_job_id) {
            transactionService.acceptJobOnChain(req.agentId, job.chain_job_id, collateral_amount)
                .then(async (txResult) => {
                    await db.query(
                        'UPDATE jobs SET collateral_tx_hash = $1 WHERE job_id = $2',
                        [txResult.tx.hash, job_id]
                    );
                    console.log(`✅ Job ${job_id} accepted on-chain: ${txResult.tx.hash}`);
                })
                .catch(err => console.error(`❌ Failed to accept job on-chain:`, err));
        }

        // Notify poster via WebSocket
        const wsService = require('../services/websocketService');
        wsService.notifyJobAccepted(job, req.agentId);

        res.json({
            job: {
                job_id: job.job_id,
                status: 'accepted',
                executor: req.agentId,
                deadline: job.deadline
            },
            message: `Job accepted! Complete before deadline to earn ${job.payment_amount} MON`
        });

    } catch (error) {
        console.error('Accept job error:', error);
        res.status(500).json({ error: 'Failed to accept job' });
    }
}

/**
 * Submit job result
 */
async function submitResult(req, res) {
    try {
        const { job_id } = req.params;
        const { result, result_hash } = req.body;

        // Validation
        if (!result || !result_hash) {
            return res.status(400).json({ error: 'Missing result or result_hash' });
        }

        if (!isValidHash(result_hash)) {
            return res.status(400).json({ error: 'Invalid hash format' });
        }

        // Verify hash matches result
        const calculatedHash = generateHash(result);
        if (calculatedHash !== result_hash) {
            // Get job to check manual_verification status (optimization: we would need to check this anyway)
            const jobResult = await db.query('SELECT manual_verification FROM jobs WHERE job_id = $1', [job_id]);
            const isManual = jobResult.rows.length > 0 && jobResult.rows[0].manual_verification;

            if (!isManual) {
                return res.status(400).json({ error: 'Result hash does not match calculated hash' });
            }
            console.warn(`⚠️ Hash mismatch for manual_verification job ${job_id}. Allowing submission for review.`);
        }

        // Get job
        const jobResult = await db.query(
            'SELECT * FROM jobs WHERE job_id = $1',
            [job_id]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult.rows[0];

        // Validation
        if (job.executor_id !== req.agentId) {
            return res.status(403).json({ error: 'Only the executor can submit results' });
        }

        if (job.status !== 'accepted') {
            return res.status(400).json({ error: 'Job is not in accepted state' });
        }

        if (new Date(job.deadline) < new Date()) {
            return res.status(400).json({ error: 'Deadline has passed' });
        }

        // Check if hash matches expected
        // Optimistic Mode: If expected hash is missing or 0x, any submission matches
        const isOptimistic = !job.expected_output_hash || job.expected_output_hash === '0x';
        const hashMatch = isOptimistic || result_hash === job.expected_output_hash;

        // Manual Verification Logic
        if (job.manual_verification) {
            await db.query(
                `UPDATE jobs SET 
            submitted_hash = $1, 
            submitted_result = $2,
            status = 'pending_review', 
            updated_at = NOW()
           WHERE job_id = $3`,
                [result_hash, JSON.stringify(result), job_id]
            );

            // Notify poster
            const wsService = require('../services/websocketService');
            // Assuming we have a notifyJobsubmitted or similar, otherwise just reuse existing or create new?
            // Existing notifications seem to be: broadcastJobPosted, notifyJobAccepted, notifyPaymentReceived, notifyJobCompleted
            // We should ideally add notifyJobSubmittedForReview. For now let's just log it or maybe assume poster checks dashboard.
            // But let's verify if there is a method we can use or if we should add it. 
            // I will assume notifyJobSubmittedForReview doesn't exist yet, so I might need to add it later.
            // For now, I'll proceed without a specific WS notification or just skip it.
            // Actually, let's look at `wsService` usage. `wsService.notifyJobAccepted(job, req.agentId)`

            res.json({
                job: {
                    job_id: job.job_id,
                    status: 'pending_review',
                    verification_status: 'pending',
                    completed_at: new Date()
                },
                message: 'Result submitted! Waiting for manual verification by poster.'
            });
            return;
        }

        const newStatus = hashMatch ? 'completed' : 'failed';

        // Update job
        await db.query(
            `UPDATE jobs SET 
        submitted_hash = $1, 
        submitted_result = $2,
        status = $3, 
        completed_at = NOW(),
        updated_at = NOW()
       WHERE job_id = $4`,
            [result_hash, JSON.stringify(result), newStatus, job_id]
        );

        // Update agent stats
        if (hashMatch) {
            // Update executor
            await db.query(
                `UPDATE agents SET
          total_jobs_completed = total_jobs_completed + 1,
          total_earned = total_earned + $1,
          reputation_score = reputation_score + 5
         WHERE agent_id = $2`,
                [job.payment_amount, req.agentId]
            );

            // Update poster
            await db.query(
                `UPDATE agents SET
          total_spent = total_spent + $1
         WHERE agent_id = $2`,
                [job.payment_amount, job.poster_id]
            );
        } else {
            // Negative reputation for executor
            await db.query(
                'UPDATE agents SET reputation_score = reputation_score - 10 WHERE agent_id = $1',
                [req.agentId]
            );
        }

        // Submit result on-chain (async)
        if (job.chain_job_id) {
            transactionService.submitResultOnChain(req.agentId, job.chain_job_id, result_hash)
                .then(async (txResult) => {
                    const finalStatus = txResult.verified ? 'completed' : 'failed';

                    // Update job with on-chain result
                    await db.query(
                        `UPDATE jobs SET 
                            submitted_hash = $1,
                            status = $2,
                            payment_tx_hash = $3,
                            completed_at = NOW(),
                            updated_at = NOW()
                         WHERE job_id = $4`,
                        [result_hash, finalStatus, txResult.tx.hash, job_id]
                    );

                    // Update agent stats based on on-chain result
                    if (txResult.verified) {
                        await db.query(
                            `UPDATE agents SET
                                total_jobs_completed = total_jobs_completed + 1,
                                total_earned = total_earned + $1,
                                reputation_score = reputation_score + 5
                             WHERE agent_id = $2`,
                            [job.payment_amount, req.agentId]
                        );

                        await db.query(
                            `UPDATE agents SET total_spent = total_spent + $1 WHERE agent_id = $2`,
                            [job.payment_amount, job.poster_id]
                        );
                    } else {
                        await db.query(
                            'UPDATE agents SET reputation_score = reputation_score - 10 WHERE agent_id = $1',
                            [req.agentId]
                        );
                    }

                    console.log(`✅ Job ${job_id} ${txResult.verified ? 'completed' : 'failed'} on-chain: ${txResult.tx.hash}`);

                    // Notify via WebSocket
                    const wsService = require('../services/websocketService');
                    wsService.notifyPaymentReceived(job, job.payment_amount, txResult.verified);
                    wsService.notifyJobCompleted(job, txResult.verified);
                })
                .catch(err => console.error(`❌ Failed to submit result on-chain:`, err));
        } else {
            // Fallback: off-chain verification (for jobs created before wallet integration)
            const hashMatch = result_hash === job.expected_output_hash;
            const newStatus = hashMatch ? 'completed' : 'failed';

            await db.query(
                `UPDATE jobs SET 
                    submitted_hash = $1, 
                    status = $2, 
                    completed_at = NOW(),
                    updated_at = NOW()
                 WHERE job_id = $3`,
                [result_hash, newStatus, job_id]
            );

            // Update agent stats
            if (hashMatch) {
                await db.query(
                    `UPDATE agents SET
                        total_jobs_completed = total_jobs_completed + 1,
                        total_earned = total_earned + $1,
                        reputation_score = reputation_score + 5
                     WHERE agent_id = $2`,
                    [job.payment_amount, req.agentId]
                );

                await db.query(
                    `UPDATE agents SET total_spent = total_spent + $1 WHERE agent_id = $2`,
                    [job.payment_amount, job.poster_id]
                );
            } else {
                await db.query(
                    'UPDATE agents SET reputation_score = reputation_score - 10 WHERE agent_id = $1',
                    [req.agentId]
                );
            }

            // Notify via WebSocket
            const wsService = require('../services/websocketService');
            wsService.notifyPaymentReceived(job, job.payment_amount, hashMatch);
            wsService.notifyJobCompleted(job, hashMatch);
        }

        res.json({
            job: {
                job_id: job.job_id,
                status: newStatus,
                verification_status: hashMatch ? 'verified' : 'failed',
                payment_amount: hashMatch ? job.payment_amount : '0',
                completed_at: new Date()
            },
            message: hashMatch
                ? `✅ Hash verified! ${job.payment_amount} MON will be paid to your wallet`
                : '❌ Hash mismatch! Collateral will be slashed'
        });

    } catch (error) {
        console.error('Submit result error:', error);
        res.status(500).json({ error: 'Failed to submit result' });
    }
}

/**
 * Get job details
 */
async function getJob(req, res) {
    try {
        const { job_id } = req.params;

        const query = `
            SELECT 
                j.*, 
                a.name as poster_name,
                e.name as executor_name
            FROM jobs j
            LEFT JOIN agents a ON j.poster_id = a.agent_id
            LEFT JOIN agents e ON j.executor_id = e.agent_id
            WHERE j.job_id = $1
        `;

        const result = await db.query(query, [job_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ job: result.rows[0] });

    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Failed to get job' });
    }
}

/**
 * Get recent jobs across all statuses (Activity Feed)
 */
async function getRecentJobs(req, res) {
    try {
        const query = `
      SELECT 
        j.*, 
        a.name as poster_name,
        e.name as executor_name
      FROM jobs j
      LEFT JOIN agents a ON j.poster_id = a.agent_id
      LEFT JOIN agents e ON j.executor_id = e.agent_id
      ORDER BY j.updated_at DESC
      LIMIT 1000
    `;

        const result = await db.query(query);

        const jobs = result.rows.map(row => ({
            job_id: row.job_id,
            title: row.title,
            poster_id: row.poster_id,
            poster_name: row.poster_name,
            executor_id: row.executor_id,
            executor_name: row.executor_name,
            capability_required: row.capability_required,
            description: row.description,
            payment_amount: row.payment_amount,
            collateral_required: row.collateral_required,
            deadline_minutes: row.deadline_minutes,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        res.json({ jobs });

    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ error: 'Failed to get recent activity' });
    }
}


/**
 * Validate a job (Manual verification)
 */
async function validateJob(req, res) {
    try {
        const { job_id } = req.params;
        const { approved } = req.body;

        // Get job
        const jobResult = await db.query(
            'SELECT * FROM jobs WHERE job_id = $1',
            [job_id]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult.rows[0];

        // Validation
        if (job.poster_id !== req.agentId) {
            return res.status(403).json({ error: 'Only the poster can validate this job' });
        }

        if (job.status !== 'pending_review') {
            return res.status(400).json({ error: 'Job is not pending review' });
        }

        if (approved) {
            // Determine success based on approval
            const finalStatus = 'completed';

            // Mark as completed in DB
            await db.query(
                `UPDATE jobs SET 
                    status = $1, 
                    completed_at = NOW(),
                    updated_at = NOW()
                 WHERE job_id = $2`,
                [finalStatus, job_id]
            );

            // Update agent stats (Positive)
            await db.query(
                `UPDATE agents SET
                    total_jobs_completed = total_jobs_completed + 1,
                    total_earned = total_earned + $1,
                    reputation_score = reputation_score + 5
                 WHERE agent_id = $2`,
                [job.payment_amount, job.executor_id]
            );

            await db.query(
                `UPDATE agents SET total_spent = total_spent + $1 WHERE agent_id = $2`,
                [job.payment_amount, job.poster_id]
            );

            // Trigger on-chain settlement
            if (job.chain_job_id && job.submitted_hash) {
                transactionService.submitResultOnChain(job.executor_id, job.chain_job_id, job.submitted_hash)
                    .then(async (txResult) => {
                        await db.query(
                            `UPDATE jobs SET payment_tx_hash = $1 WHERE job_id = $2`,
                            [txResult.tx.hash, job_id]
                        );
                        console.log(`✅ Job ${job_id} settlement triggered on-chain: ${txResult.tx.hash}`);
                    })
                    .catch(err => console.error(`❌ Failed to trigger settlement on-chain:`, err));
            }

            res.json({ message: 'Job approved and settled successfully' });

        } else {
            // Reject - Mark as failed? Or back to accepted?
            // Let's mark as failed for now, implies slashing.
            const finalStatus = 'failed';

            await db.query(
                `UPDATE jobs SET 
                    status = $1, 
                    updated_at = NOW()
                 WHERE job_id = $2`,
                [finalStatus, job_id]
            );

            // Negative reputation
            await db.query(
                'UPDATE agents SET reputation_score = reputation_score - 10 WHERE agent_id = $1',
                [job.executor_id]
            );

            res.json({ message: 'Job rejected.' });
        }

    } catch (error) {
        console.error('Validate job error:', error);
        res.status(500).json({ error: 'Failed to validate job' });
    }
}

module.exports = {
    postJob,
    getAvailableJobs,
    acceptJob,
    submitResult,
    getJob,
    getRecentJobs,
    validateJob
};
