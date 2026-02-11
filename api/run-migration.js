const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', '004_add_job_title.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Running migration: 004_add_job_title.sql');
        await db.query(sql);
        console.log('✅ Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
