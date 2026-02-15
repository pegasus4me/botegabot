const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ADMIN endpoint to fix NULL deadlines
// Call this once to repair the data
router.post('/fix-deadlines', async (req, res) => {
    try {
        // Check how many jobs need fixing
        const checkResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM jobs 
      WHERE deadline IS NULL AND deadline_minutes IS NOT NULL
    `);

        const needsFixing = parseInt(checkResult.rows[0].count);

        if (needsFixing === 0) {
            return res.json({ message: 'No jobs need fixing', fixed: 0 });
        }

        // Fix the deadlines
        const result = await db.query(`
      UPDATE jobs 
      SET deadline = created_at + (deadline_minutes || ' minutes')::interval
      WHERE deadline IS NULL 
        AND deadline_minutes IS NOT NULL
      RETURNING job_id, title, deadline
    `);

        res.json({
            message: `Fixed ${result.rows.length} jobs with NULL deadlines`,
            fixed: result.rows.length,
            jobs: result.rows
        });

    } catch (error) {
        console.error('Fix deadlines error:', error);
        res.status(500).json({ error: 'Failed to fix deadlines' });
    }
});

module.exports = router;
