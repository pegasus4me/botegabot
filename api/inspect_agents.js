const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'botegabot',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function inspect() {
    try {
        const client = await pool.connect();
        console.log('--- INSPECTING AGENTS TABLE SCHEMA ---');
        const columns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'agents'
        `);
        console.table(columns.rows);

        console.log('\n--- INSPECTING AGENTS ---');

        const res = await client.query(`
            SELECT *
            FROM agents 
            ORDER BY created_at DESC 
        `);

        console.log(`Total agents: ${res.rows.length}`);

        const problematic = res.rows.filter(row => !row.wallet_address || row.wallet_address === 'null' || row.wallet_address === 'undefined');
        console.log(`Problematic agents found: ${problematic.length}`);

        if (problematic.length > 0) {
            console.log('Sample problematic agent:');
            console.log(JSON.stringify(problematic[0], null, 2));
        } else {
            console.log('First 5 agents:');
            console.table(res.rows.slice(0, 5).map(r => ({ agent_id: r.agent_id, name: r.name, wallet_address: r.wallet_address })));
        }

        client.release();
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        pool.end();
    }
}

inspect();
