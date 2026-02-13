const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function checkJob() {
    try {
        const result = await pool.query(
            "SELECT job_id, status, payment_amount, title, description FROM jobs WHERE payment_amount::numeric = 200 OR title ILIKE '%Fintech%' OR description ILIKE '%Fintech%';"
        );
        console.log('Found jobs:', JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await pool.end();
    }
}

checkJob();
