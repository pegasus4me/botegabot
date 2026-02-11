const db = require('./src/config/database');

async function checkJob() {
    try {
        const query = `
            SELECT job_id, title, description, status, poster_id, executor_id, created_at, updated_at 
            FROM jobs 
            WHERE title ILIKE '%10 leads%' OR description ILIKE '%10 leads%' OR title ILIKE '%B2B%' OR description ILIKE '%B2B%' 
            ORDER BY created_at DESC 
            LIMIT 5;
        `;
        const result = await db.query(query);
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error querying jobs:', error);
        process.exit(1);
    }
}

checkJob();
