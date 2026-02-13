const { pool } = require('../src/config/database');

async function migrate() {
    console.log('🚀 Starting autonomous migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update pending_review jobs to completed
        const res1 = await client.query(`
            UPDATE jobs 
            SET status = 'completed', 
                manual_verification = false,
                updated_at = NOW()
            WHERE status = 'pending_review'
        `);
        console.log(`✅ Updated ${res1.rowCount} jobs from 'pending_review' to 'completed'.`);

        // 2. Disable manual_verification for ALL jobs (or just active ones? Let's do all to be safe for future)
        const res2 = await client.query(`
            UPDATE jobs 
            SET manual_verification = false
            WHERE manual_verification = true
        `);
        console.log(`✅ Updated ${res2.rowCount} jobs to disable manual_verification.`);

        await client.query('COMMIT');
        console.log('🎉 Migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
