const db = require('../config/database');
const { generateAgentId, generateApiKey, isValidAddress } = require('../utils/helpers');
const blockchainService = require('../services/blockchainService');
const walletService = require('../services/walletService');
const transactionService = require('../services/transactionService');

/**
 * Register a new agent
 */
async function registerAgent(req, res) {
    try {
        const { name, description, capabilities } = req.body;

        // Validation
        if (!name || !capabilities) {
            return res.status(400).json({ error: 'Missing required fields: name, capabilities' });
        }

        if (!Array.isArray(capabilities) || capabilities.length === 0) {
            return res.status(400).json({ error: 'Capabilities must be a non-empty array' });
        }

        // Generate IDs
        const agentId = generateAgentId();
        const apiKey = generateApiKey();

        // Create custodial wallet for agent
        const wallet = await walletService.createWalletForAgent(agentId);

        // Insert into database
        await db.query(
            `INSERT INTO agents (agent_id, api_key, wallet_address, name, description, capabilities)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [agentId, apiKey, wallet.address, name, description || '', capabilities]
        );

        // Insert into api_keys table
        await db.query(
            'INSERT INTO api_keys (api_key, agent_id) VALUES ($1, $2)',
            [apiKey, agentId]
        );

        // Register agent on-chain (async - don't wait)
        transactionService.registerAgentOnChain(agentId, capabilities)
            .then(() => console.log(`✅ Agent ${agentId} registered on-chain`))
            .catch(err => console.error(`❌ Failed to register agent on-chain:`, err));

        // Return response
        res.status(201).json({
            agent: {
                agent_id: agentId,
                api_key: apiKey,
                wallet_address: wallet.address,
                mnemonic: wallet.mnemonic,
                capabilities,
                reputation_score: 0
            },
            important: '⚠️ SAVE YOUR API KEY AND MNEMONIC! They will not be shown again.',
            note: 'Your wallet is being registered on-chain. This may take a few moments.'
        });

    } catch (error) {
        console.error('Register agent error:', error);
        res.status(500).json({ error: 'Failed to register agent' });
    }
}

/**
 * Get current agent's profile
 */
async function getMe(req, res) {
    try {
        const result = await db.query(
            `SELECT agent_id, name, wallet_address, description, capabilities, 
              reputation_score, total_jobs_completed, total_jobs_posted,
              total_earned, total_spent, is_active, created_at
       FROM agents WHERE agent_id = $1`,
            [req.agentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const agent = result.rows[0];

        res.json({
            agent_id: agent.agent_id,
            name: agent.name,
            wallet_address: agent.wallet_address,
            description: agent.description,
            capabilities: agent.capabilities,
            reputation_score: agent.reputation_score,
            total_jobs_completed: agent.total_jobs_completed,
            total_jobs_posted: agent.total_jobs_posted,
            total_earned: agent.total_earned,
            total_spent: agent.total_spent,
            is_active: agent.is_active,
            created_at: agent.created_at
        });

    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get agent profile' });
    }
}

/**
 * Search for agents
 */
async function searchAgents(req, res) {
    try {
        const { capability, min_reputation } = req.query;

        let query = 'SELECT agent_id, name, capabilities, reputation_score, total_jobs_completed FROM agents WHERE is_active = true';
        const params = [];

        if (capability) {
            params.push(capability);
            query += ` AND $${params.length} = ANY(capabilities)`;
        }

        if (min_reputation) {
            params.push(parseInt(min_reputation));
            query += ` AND reputation_score >= $${params.length}`;
        }

        query += ' ORDER BY reputation_score DESC LIMIT 50';

        const result = await db.query(query, params);

        const agents = result.rows.map(row => ({
            agent_id: row.agent_id,
            name: row.name,
            capabilities: row.capabilities,
            reputation_score: row.reputation_score,
            total_jobs_completed: row.total_jobs_completed
        }));

        res.json({ agents });

    } catch (error) {
        console.error('Search agents error:', error);
        res.status(500).json({ error: 'Failed to search agents' });
    }
}

module.exports = {
    registerAgent,
    getMe,
    searchAgents
};
