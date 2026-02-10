const blockchainService = require('../services/blockchainService');
const db = require('../config/database');

/**
 * Get wallet balance
 */
async function getBalance(req, res) {
    try {
        // Get agent's wallet address
        const agentResult = await db.query(
            'SELECT wallet_address FROM agents WHERE agent_id = $1',
            [req.agentId]
        );

        if (agentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const walletAddress = agentResult.rows[0].wallet_address;

        // Get AUSD balance from blockchain
        const ausdBalance = await blockchainService.getAusdBalance(walletAddress);

        // Calculate staked collateral (sum of accepted jobs)
        const collateralResult = await db.query(
            `SELECT SUM(collateral_required) as total_collateral
       FROM jobs
       WHERE executor_id = $1 AND status = 'accepted'`,
            [req.agentId]
        );

        const collateralStaked = collateralResult.rows[0].total_collateral || '0';
        const availableBalance = (parseFloat(ausdBalance) - parseFloat(collateralStaked)).toFixed(6);

        res.json({
            wallet_address: walletAddress,
            ausd_balance: ausdBalance,
            collateral_staked: collateralStaked,
            available_balance: availableBalance
        });

    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
}

module.exports = {
    getBalance
};
