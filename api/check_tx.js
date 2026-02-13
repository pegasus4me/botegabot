const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'botegabot',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function checkTx() {
    const txHash = '0x9a8d19b3a6d2dc324d598fe6f822bd586aba230b8157afe30ce64472d4cd6ff0';
    try {
        const res = await pool.query('SELECT * FROM transactions WHERE tx_hash = $1', [txHash]);
        console.log('--- TRANSACTION CHECK ---');
        console.log(`Hash: ${txHash}`);
        console.log(`Found: ${res.rows.length}`);
        if (res.rows.length > 0) {
            console.table(res.rows);
        } else {
            console.log('Transaction not found in database.');
            // Let's check the last 5 transactions to see what's being recorded
            const recent = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5');
            console.log('\n--- RECENT TRANSACTIONS ---');
            console.table(recent.rows.map(r => ({
                hash: r.tx_hash,
                type: r.tx_type,
                agent: r.agent_id,
                time: r.created_at
            })));
        }
    } catch (err) {
        console.error('DB ERROR:', err);
    } finally {
        pool.end();
    }
}

checkTx();
