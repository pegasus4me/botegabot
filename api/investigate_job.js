const db = require('./src/config/database');

const hash = '0xb71b035dfaeb745deb7b4d62da4653e35093e461eb0f2d62c5b86995b4fa655c';

async function investigate() {
    try {
        console.log(`Investigating jobs with hash: ${hash}`);
        const result = await db.query(
            `SELECT job_id, status, capability_required, expected_output_hash, submitted_hash, executor_id, chain_job_id, created_at, updated_at 
             FROM jobs 
             WHERE expected_output_hash = $1 OR submitted_hash = $1`,
            [hash]
        );

        if (result.rows.length === 0) {
            console.log('No jobs found with this hash.');

            // Try searching for any accepted/in-progress jobs
            console.log('\nSearching for recent "accepted" jobs:');
            const recentAccepted = await db.query(
                `SELECT job_id, status, expected_output_hash, submitted_hash, executor_id, chain_job_id, created_at 
                 FROM jobs 
                 WHERE status = 'accepted'
                 ORDER BY created_at DESC LIMIT 5`
            );
            console.table(recentAccepted.rows);
        } else {
            console.table(result.rows);
        }

    } catch (error) {
        console.error('Investigation failed:', error);
    } finally {
        process.exit();
    }
}

investigate();
