const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function runMigrations() {
    try {
        const client = await pool.connect();
        try {
            const migrationFiles = fs.readdirSync(path.join(__dirname, 'migrations'))
                .filter(file => file.endsWith('.sql'))
                .sort();

            console.log(`Found ${migrationFiles.length} migrations.`);

            for (const file of migrationFiles) {
                console.log(`Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
                await client.query(sql);
                console.log(`✅ Completed: ${file}`);
            }
            console.log('🎉 All migrations applied successfully!');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigrations();
