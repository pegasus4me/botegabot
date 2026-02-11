const { Pool } = require('pg');
require('dotenv').config();

const passwords = [undefined, '', 'postgres', 'password', 'botegabot', 'admin'];

async function testConnection() {
    for (const pass of passwords) {
        console.log(`Trying password: '${pass}'...`);
        const pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'botegabot',
            user: process.env.DB_USER || 'postgres',
            password: pass,
            connectionTimeoutMillis: 2000
        });

        try {
            await pool.query('SELECT 1');
            console.log(`✅ SUCCESS! Working password is: '${pass}'`);
            process.exit(0);
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        } finally {
            await pool.end();
        }
    }
    console.error('All passwords failed.');
}

testConnection();
