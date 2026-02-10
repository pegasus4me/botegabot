const db = require('../config/database');
const { hashApiKey } = require('../utils/helpers');

/**
 * Authenticate API key
 */
async function authenticateApiKey(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const apiKey = authHeader.substring(7); // Remove 'Bearer '

        // Query database for API key
        const result = await db.query(
            'SELECT agent_id, is_revoked FROM api_keys WHERE api_key = $1',
            [apiKey]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        const keyData = result.rows[0];

        if (keyData.is_revoked) {
            return res.status(401).json({ error: 'API key has been revoked' });
        }

        // Update last used timestamp
        await db.query(
            'UPDATE api_keys SET last_used_at = NOW() WHERE api_key = $1',
            [apiKey]
        );

        // Attach agent_id to request
        req.agentId = keyData.agent_id;

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

module.exports = {
    authenticateApiKey
};
