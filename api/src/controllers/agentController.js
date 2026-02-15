const { ethers } = require('ethers');
const db = require('../config/database');
const { generateAgentId, generateApiKey } = require('../utils/helpers');
const walletService = require('../services/walletService');
const config = require('../config/env');
const blockchainConfig = require('../config/blockchain');
const blockchainService = require('../services/blockchainService');

/**
 * Register a new agent
 */
async function registerAgent(req, res) {
    try {
        const { name, description, capabilities, twitter_handle } = req.body;

        // Validation
        if (!name || !capabilities) {
            return res.status(400).json({ error: 'Missing required fields: name, capabilities' });
        }

        if (!Array.isArray(capabilities) || capabilities.length === 0) {
            return res.status(400).json({ error: 'Capabilities must be a non-empty array' });
        }

        // Check if agent already exists
        const existing = await db.query(
            'SELECT agent_id, api_key, wallet_address, is_active FROM agents WHERE name = $1',
            [name]
        );

        let agentId, apiKey, walletAddress, privateKey, mnemonic;
        let isNew = false;

        if (existing.rows.length > 0) {
            const agent = existing.rows[0];
            if (agent.is_active) {
                return res.status(400).json({ error: 'Agent with this name already registered' });
            }

            // Reuse existing
            agentId = agent.agent_id;
            apiKey = agent.api_key;
            walletAddress = agent.wallet_address;

            // Get private key from wallet service
            try {
                const walletInfo = await walletService.exportWallet(agentId);
                privateKey = walletInfo.private_key;
                mnemonic = walletInfo.mnemonic;
            } catch (err) {
                console.error('Failed to retrieve existing wallet:', err);
                return res.status(500).json({ error: 'Failed to retrieve wallet for existing inactive agent' });
            }
        } else {
            // Generate New
            agentId = generateAgentId();
            apiKey = generateApiKey();
            const wallet = walletService.generateWallet();
            walletAddress = wallet.address;
            privateKey = wallet.privateKey;
            mnemonic = wallet.mnemonic;
            isNew = true;

            // Save to DB in pending state
            await db.query(
                `INSERT INTO agents (agent_id, api_key, wallet_address, name, description, capabilities, twitter_handle, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
                [agentId, apiKey, walletAddress, name, description || '', capabilities, twitter_handle || null]
            );

            await walletService.saveAgentWallet(agentId, { address: walletAddress, privateKey, mnemonic });

            await db.query(
                'INSERT INTO api_keys (api_key, agent_id) VALUES ($1, $2)',
                [apiKey, agentId]
            );
            if (isNew) {
                // 2. Automated Welcome Drip (0.005 MON for gas)
                try {
                    if (config.wallet.deployerPrivateKey) {
                        console.log(`⛽ Sending Welcome Drip to ${walletAddress}...`);
                        const funder = new ethers.Wallet(config.wallet.deployerPrivateKey, blockchainConfig.provider);
                        const fundTx = await funder.sendTransaction({
                            to: walletAddress,
                            value: ethers.parseEther("0.1")
                        });
                        await fundTx.wait();
                        console.log(`✅ Welcome Drip confirmed: ${fundTx.hash}`);
                    }
                } catch (fundError) {
                    console.error('⚠️ Welcome Drip failed (non-blocking):', fundError.message);
                    // We don't fail here, the user can still fund manually as a fallback
                }
            }
        }

        // 3. Register agent on-chain (Atomic)
        try {
            console.log(`📝 Registering agent ${agentId} on-chain with wallet ${walletAddress}...`);
            const agentSigner = new ethers.Wallet(privateKey, blockchainConfig.provider);
            const registryWithSigner = blockchainConfig.agentRegistry.connect(agentSigner);

            const tx = await registryWithSigner.registerAgent(capabilities, { gasLimit: 500000 });
            await tx.wait();
            console.log(`✅ On-chain registration confirmed: ${tx.hash}`);

            // Record registration transaction for Live Activity feed
            await db.query(
                `INSERT INTO transactions (tx_hash, agent_id, tx_type, status, metadata)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (tx_hash) DO NOTHING`,
                [
                    tx.hash,
                    agentId,
                    'register',
                    'confirmed',
                    JSON.stringify({
                        agent_name: name,
                        wallet: walletAddress,
                        capabilities,
                        twitter_handle: twitter_handle || null
                    })
                ]
            );
            console.log(`📊 Registration transaction recorded: ${tx.hash}`);

            // 4. Update status to active
            await db.query('UPDATE agents SET is_active = true WHERE agent_id = $1', [agentId]);

        } catch (regError) {
            console.error('❌ On-chain registration failed:', regError);
            return res.status(500).json({
                error: 'Blockchain registration failed. Ensure your internal agent wallet has MON for gas.',
                message: regError.message,
                wallet_address: walletAddress,
                hint: `Send MON to ${walletAddress} then try registering again with the same name. Your wallet will be preserved.`
            });
        }

        // Return sync response
        res.status(201).json({
            agent: {
                agent_id: agentId,
                api_key: apiKey,
                wallet_address: walletAddress,
                mnemonic: mnemonic,
                capabilities,
                twitter_handle,
                reputation_score: 0
            },
            important: '⚠️ SAVE YOUR API KEY AND MNEMONIC! They will not be shown again.',
            note: 'Your agent is now live and registered on-chain!'
        });

    } catch (error) {
        console.error('Register agent error:', error);
        res.status(500).json({ error: 'Failed to register agent', details: error.message });
    }
}

/**
 * Get current agent's profile
 */
async function getMe(req, res) {
    try {
        const result = await db.query(
            `SELECT a.agent_id, a.name, COALESCE(a.wallet_address, w.wallet_address) as wallet_address, a.description, a.capabilities, 
              a.reputation_score, a.total_jobs_completed, a.total_jobs_posted,
              a.total_earned, a.total_spent, a.is_active, a.created_at
       FROM agents a
       LEFT JOIN agent_wallets w ON a.agent_id = w.agent_id
       WHERE a.agent_id = $1`,
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

        let query = `
            SELECT a.agent_id, a.name, COALESCE(a.wallet_address, w.wallet_address) as wallet_address, a.capabilities, 
                   a.reputation_score, a.total_jobs_completed, a.total_earned, a.twitter_handle 
            FROM agents a
            LEFT JOIN agent_wallets w ON a.agent_id = w.agent_id`;
        query += ' ORDER BY a.reputation_score DESC';

        const result = await db.query(query, params);

        const agents = result.rows.map(row => ({
            agent_id: row.agent_id,
            name: row.name,
            wallet_address: row.wallet_address,
            capabilities: row.capabilities,
            reputation_score: row.reputation_score,
            total_jobs_completed: row.total_jobs_completed,
            total_earned: row.total_earned,
            twitter_handle: row.twitter_handle
        }));

        res.json({ agents });

    } catch (error) {
        console.error('Search agents error:', error);
        res.status(500).json({ error: 'Failed to search agents' });
    }
}

/**
 * Get recent active agents (public)
 */
async function getRecentAgents(req, res) {
    try {
        const result = await db.query(
            `SELECT a.agent_id, a.name, COALESCE(a.wallet_address, w.wallet_address) as wallet_address, a.capabilities,
            a.reputation_score, a.total_jobs_completed, a.total_earned, a.twitter_handle, a.created_at 
             FROM agents a
             LEFT JOIN agent_wallets w ON a.agent_id = w.agent_id
             WHERE a.is_active = true
             ORDER BY a.created_at DESC`
        );

        const agents = await Promise.all(result.rows.map(async row => {
            let monBalance = '0';
            try {
                if (row.wallet_address) {
                    monBalance = await blockchainService.getMonBalance(row.wallet_address);
                }
            } catch (err) {
                console.error(`Failed to get balance for ${row.wallet_address}: `, err.message);
            }

            return {
                agent_id: row.agent_id,
                name: row.name,
                wallet_address: row.wallet_address,
                capabilities: row.capabilities,
                reputation_score: row.reputation_score,
                total_jobs_completed: row.total_jobs_completed,
                total_earned: row.total_earned,
                mon_balance: monBalance,
                twitter_handle: row.twitter_handle,
                created_at: row.created_at
            };
        }));

        res.json({ agents });

    } catch (error) {
        console.error('Get recent agents error:', error);
        require('fs').writeFileSync('error.log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        res.status(500).json({ error: 'Failed to get recent agents' });
    }
}

/**
 * Get currently online agents
 */
async function getOnlineAgents(req, res) {
    try {
        const wsService = require('../services/websocketService');
        const onlineIds = wsService.getOnlineAgentIds();

        if (onlineIds.length === 0) {
            return res.json({ agents: [] });
        }

        const result = await db.query(
            `SELECT a.agent_id, a.name, COALESCE(a.wallet_address, w.wallet_address) as wallet_address, a.capabilities,
            a.reputation_score, a.total_jobs_completed, a.total_earned, a.twitter_handle, a.created_at 
             FROM agents a
             LEFT JOIN agent_wallets w ON a.agent_id = w.agent_id
             WHERE a.agent_id = ANY($1) AND a.is_active = true`,
            [onlineIds]
        );

        const agents = await Promise.all(result.rows.map(async row => {
            let monBalance = '0';
            try {
                if (row.wallet_address) {
                    monBalance = await blockchainService.getMonBalance(row.wallet_address);
                }
            } catch (err) {
                console.error(`Failed to get balance for ${row.wallet_address}: `, err.message);
            }

            return {
                agent_id: row.agent_id,
                name: row.name,
                wallet_address: row.wallet_address,
                capabilities: row.capabilities,
                reputation_score: row.reputation_score,
                total_jobs_completed: row.total_jobs_completed,
                total_earned: row.total_earned,
                mon_balance: monBalance,
                twitter_handle: row.twitter_handle,
                created_at: row.created_at
            };
        }));

        res.json({ agents });

    } catch (error) {
        console.error('Get online agents error:', error);
        res.status(500).json({ error: 'Failed to get online agents' });
    }
}

/**
 * Get agents active in the last 24 hours
 */
async function getDailyActiveAgents(req, res) {
    try {
        const result = await db.query(
            `SELECT a.agent_id, a.name, COALESCE(a.wallet_address, w.wallet_address) as wallet_address, a.capabilities,
            a.reputation_score, a.total_jobs_completed, a.total_earned, a.twitter_handle, a.created_at 
             FROM agents a
             LEFT JOIN api_keys ak ON a.agent_id = ak.agent_id
             LEFT JOIN agent_wallets w ON a.agent_id = w.agent_id
        WHERE a.is_active = true AND (
            a.created_at >= NOW() - INTERVAL '24 hours' OR 
                ak.last_used_at >= NOW() - INTERVAL '24 hours'
        )
             ORDER BY COALESCE(ak.last_used_at, a.created_at) DESC`
        );

        const agents = await Promise.all(result.rows.map(async row => {
            let monBalance = '0';
            try {
                if (row.wallet_address) {
                    monBalance = await blockchainService.getMonBalance(row.wallet_address);
                }
            } catch (err) {
                console.error(`Failed to get balance for ${row.wallet_address}: `, err.message);
            }

            return {
                agent_id: row.agent_id,
                name: row.name,
                wallet_address: row.wallet_address,
                capabilities: row.capabilities,
                reputation_score: row.reputation_score,
                total_jobs_completed: row.total_jobs_completed,
                total_earned: row.total_earned,
                mon_balance: monBalance,
                twitter_handle: row.twitter_handle,
                created_at: row.created_at
            };
        }));

        res.json({ agents });

    } catch (error) {
        console.error('Get daily active agents error:', error);
        res.status(500).json({ error: 'Failed to get daily active agents' });
    }
}

/**
 * Get public profile of an agent
 */
async function getAgentPublicProfile(req, res) {
    try {
        const { agentId } = req.params;

        const result = await db.query(
            `SELECT a.agent_id, a.name, COALESCE(a.wallet_address, w.wallet_address) as wallet_address, a.description, a.capabilities,
            a.reputation_score, a.total_jobs_completed, a.total_jobs_posted,
            a.total_earned, a.total_spent, a.is_active, a.created_at, a.twitter_handle
       FROM agents a
       LEFT JOIN agent_wallets w ON a.agent_id = w.agent_id
       WHERE a.agent_id = $1 AND a.is_active = true`,
            [agentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const agent = result.rows[0];

        res.json({ agent });

    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({ error: 'Failed to get agent public profile' });
    }
}

/**
 * Get job history for an agent
 */
async function getAgentHistory(req, res) {
    try {
        const { agentId } = req.params;

        const result = await db.query(
            `SELECT j.*, a.name as poster_name, e.name as executor_name
             FROM jobs j
             LEFT JOIN agents a ON j.poster_id = a.agent_id
             LEFT JOIN agents e ON j.executor_id = e.agent_id
             WHERE j.poster_id = $1 OR j.executor_id = $1
             ORDER BY j.updated_at DESC
             LIMIT 50`,
            [agentId]
        );

        const jobs = result.rows.map(row => ({
            job_id: row.job_id,
            title: row.title,
            poster_id: row.poster_id,
            poster_name: row.poster_name,
            executor_id: row.executor_id,
            executor_name: row.executor_name,
            capability_required: row.capability_required,
            description: row.description,
            payment_amount: row.payment_amount,
            collateral_required: row.collateral_required,
            deadline_minutes: row.deadline_minutes,
            status: row.status,
            result_hash: row.result_hash,
            escrow_tx_hash: row.escrow_tx_hash,
            collateral_tx_hash: row.collateral_tx_hash,
            payment_tx_hash: row.payment_tx_hash,
            submitted_result: row.submitted_result,
            created_at: row.created_at,
            updated_at: row.updated_at,
            completed_at: row.completed_at
        }));

        res.json({ jobs });

    } catch (error) {
        console.error('Get agent history error:', error);
        res.status(500).json({ error: 'Failed to get agent history' });
    }
}

/**
 * Get marketplace stats (total agents, jobs, etc.)
 */
async function getMarketplaceStats(req, res) {
    try {
        const agentResult = await db.query('SELECT COUNT(*) FROM agents WHERE is_active = true');
        const jobResult = await db.query('SELECT COUNT(*) FROM jobs WHERE status = \'completed\'');
        const earningsResult = await db.query('SELECT SUM(total_earned) FROM agents');

        res.json({
            total_agents: parseInt(agentResult.rows[0].count),
            total_jobs_completed: parseInt(jobResult.rows[0].count),
            total_earned: earningsResult.rows[0].sum || '0'
        });

    } catch (error) {
        console.error('Get marketplace stats error:', error);
        res.status(500).json({ error: 'Failed to get marketplace stats' });
    }
}

module.exports = {
    registerAgent,
    getMe,
    searchAgents,
    getRecentAgents,
    getOnlineAgents,
    getDailyActiveAgents,
    getAgentPublicProfile,
    getAgentHistory,
    getMarketplaceStats
};
