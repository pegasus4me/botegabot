/**
 * Fix script to repair NULL deadlines in the jobs table
 * This script calculates deadline from created_at + deadline_minutes for all pending jobs
 */

const db = require('./src/config/database');

async function fixDeadlines() {
    try {
        console.log('🔧 Fixing NULL deadlines in jobs table...\n');

        // Check how many jobs need fixing
        const checkResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE deadline IS NULL AND deadline_minutes IS NOT NULL
    `);

        const needsFixing = parseInt(checkResult.rows[0].count);
        console.log(`📊 Found ${needsFixing} jobs with NULL deadlines\n`);

        if (needsFixing === 0) {
            console.log('✅ No jobs need fixing!');
            return;
        }

        // Fix the deadlines
        const result = await db.query(`
      UPDATE jobs 
      SET deadline = created_at + (deadline_minutes || ' minutes')::interval
      WHERE deadline IS NULL 
        AND deadline_minutes IS NOT NULL
      RETURNING job_id, title, created_at, deadline_minutes, deadline
    `);

        console.log(`✅ Fixed ${result.rows.length} jobs:\n`);

        result.rows.forEach(job => {
            const minutesAgo = (new Date() - new Date(job.created_at)) / 1000 / 60;
            const isExpired = new Date(job.deadline) < new Date();

            console.log(`   ${job.job_id}: ${job.title}`);
            console.log(`     Created: ${minutesAgo.toFixed(0)} minutes ago`);
            console.log(`     Duration: ${job.deadline_minutes} minutes`);
            console.log(`     Deadline: ${job.deadline}`);
            console.log(`     Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}\n`);
        });

        // Check if database is on UTC
        const tzResult = await db.query(`SELECT NOW(), CURRENT_TIMESTAMP`);
        console.log(`\n🕒 Database timezone check:`);
        console.log(`   DB NOW(): ${tzResult.rows[0].now}`);
        console.log(`   Node NOW: ${new Date().toISOString()}\n`);

        console.log('✅ Done! Jobs should now appear in /jobs/available endpoint.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

fixDeadlines();
