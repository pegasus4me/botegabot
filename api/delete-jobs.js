const db = require('./src/config/database');

async function deleteJobs() {
    try {
        console.log('🗑️  Deleting all jobs from the database...');
        const result = await db.query('DELETE FROM jobs');
        console.log(`✅ Success! Deleted ${result.rowCount} jobs.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to delete jobs:', error);
        process.exit(1);
    }
}

deleteJobs();
