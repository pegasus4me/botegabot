const db = require('../config/database');
const { generateJobId, isValidHash } = require('../utils/helpers');
const { generateHash } = require('../services/hashService');

/**
 * Post a new job
 */
async function postJob(req, res) {
    try {
        const {
            capability_required,
            description,
            requirements,
            expected_output_hash,
            payment_amount,
            collateral_required,
            deadline_minutes
        } = req.body;

        // Validation
        if (!capability_required || !description || !expected_output_hash || !payment_amount || !collateral_required || !deadline_minutes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!isValidHash(expected_output_hash)) {
            return res.status(400).json({ error: 'Invalid hash format' });
        }

        if (parseFloat(payment_amount) <= 0 || parseFloat(collateral_required) <= 0) {
            return res.status(400).json({ error: 'Payment and collateral must be greater than 0' });
        }

        // Generate job ID
        const jobId = generateJobId();

        // Calculate deadline
        const deadline = new Date(Date.now() + deadline_minutes * 60 * 1000);

        // Insert into database
        const result = await db.query(
            `INSERT INTO jobs (
        job_id, poster_id, capability_required, description, requirements,
        expected_output_hash, payment_amount, collateral_required,
        deadline_minutes, deadline, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
            [
                jobId,
                req.agentId,
                capability_required,
                description,
                JSON.stringify(requirements || {}),
                expected_output_hash,
                payment_amount,
                collateral_required,
                deadline_minutes,
                deadline,
                'pending'
            ]
        );

        const job = result.rows[0];

        // TODO: Call blockchain to post job (requires wallet integration)
        // For now, we'll just store in database

        res.status(201).json({
            job: {
                job_id: job.job_id,
                status: job.status,
                capability_required: job.capability_required,
                description: job.description,
                payment_amount: job.payment_amount,
                collateral_required: job.collateral_required,
                deadline: job.deadline,
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

        query += ' ORDER BY j.created_at DESC LIMIT 50';

        const result = await db.query(query, params);

        const jobs = result.rows.map(row => ({
            job_id: row.job_id,
            poster: row.poster_id,
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

        // TODO: Call blockchain to accept job

        res.json({
            job: {
                job_id: job.job_id,
                status: 'accepted',
                executor: req.agentId,
                deadline: job.deadline
            },
            message: `Job accepted! Complete before deadline to earn ${job.payment_amount} AUSD`
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
            return res.status(400).json({ error: 'Result hash does not match calculated hash' });
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
        const hashMatch = result_hash === job.expected_output_hash;
        const newStatus = hashMatch ? 'completed' : 'failed';

        // Update job
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

        // TODO: Call blockchain to submit result

        res.json({
            job: {
                job_id: job.job_id,
                status: newStatus,
                verification_status: hashMatch ? 'verified' : 'failed',
                payment_amount: hashMatch ? job.payment_amount : '0',
                completed_at: new Date()
            },
            message: hashMatch
                ? `✅ Hash verified! ${job.payment_amount} AUSD will be paid to your wallet`
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

        const result = await db.query(
            'SELECT * FROM jobs WHERE job_id = $1',
            [job_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ job: result.rows[0] });

    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Failed to get job' });
    }
}

module.exports = {
    postJob,
    getAvailableJobs,
    acceptJob,
    submitResult,
    getJob
};
