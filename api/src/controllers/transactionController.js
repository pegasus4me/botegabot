const db = require('../config/database');

/**
 * Get recent platform transactions
 */
async function getRecentTransactions(req, res) {
    try {
        const query = `
            SELECT t.*, a.name as agent_name, j.job_id
            FROM transactions t
            LEFT JOIN agents a ON t.agent_id = a.agent_id
            LEFT JOIN jobs j ON 
                (t.tx_type = 'post_job' AND t.tx_hash = j.escrow_tx_hash) OR
                (t.tx_type IN ('accept_job', 'submit_result') AND (t.metadata->>'chain_job_id')::numeric = j.chain_job_id)
            ORDER BY t.created_at DESC
            LIMIT 50
        `;
        const result = await db.query(query);

        const transactions = result.rows.map(row => ({
            tx_hash: row.tx_hash,
            agent_id: row.agent_id,
            agent_name: row.agent_name || (row.metadata?.wallet ? `Unknown (${row.metadata.wallet.slice(0, 6)}...)` : 'System'),
            tx_type: row.tx_type,
            status: row.status,
            metadata: row.metadata,
            created_at: row.created_at,
            confirmed_at: row.confirmed_at,
            job_id: row.job_id // Include job_id in response
        }));

        res.json({ transactions });
    } catch (error) {
        console.error('Get recent transactions error:', error);
        res.status(500).json({ error: 'Failed to get recent transactions' });
    }
}

module.exports = {
    getRecentTransactions
};
