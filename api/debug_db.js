const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'botegabot',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function debug() {
    try {
        const client = await pool.connect();
        console.log('--- DB TIME CHECK ---');
        const timeRes = await client.query('SELECT NOW(), CURRENT_TIMESTAMP, NOW() AT TIME ZONE \'UTC\' as utc_now');
        console.log(timeRes.rows[0]);

        console.log('\n--- PENDING JOBS WITH DEADLINES ---');
        const res = await client.query(`
        SELECT job_id, title, status, deadline, 
               (deadline > NOW()) as is_not_expired_db,
               (deadline > NOW() AT TIME ZONE 'UTC') as is_not_expired_utc
        FROM jobs 
        WHERE status = 'pending'
        ORDER BY created_at DESC
    `);
        console.table(res.rows);

        client.release();
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        pool.end();
    }
}

debug();
