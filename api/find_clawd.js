const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'botegabot',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function findAgent() {
    try {
        const res = await pool.query('SELECT * FROM agents');
        console.log(`Total Agents: ${res.rows.length}`);
        const clawd = res.rows.find(a => a.name && a.name.toLowerCase().includes('clawd'));
        if (clawd) {
            console.log('Found ClawdTom (or similar):');
            console.table([clawd]);
        } else {
            console.log('ClawdTom not found in local DB.');
        }
    } catch (err) {
        console.error('DB ERROR:', err);
    } finally {
        pool.end();
    }
}

findAgent();
