const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'botegabot',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function syncClawd() {
    const clawdWallet = '0x29b7A2AC1C915674F9ac7C1CeD4DaFbF26b8E170';
    const agentId = 'agent_clawdtom';

    try {
        console.log('🔗 Connecting to DB...');

        // 1. Ensure ClawdTom exists in 'agents'
        console.log('👤 Syncing agent: ClawdTom');
        const apiKey = 'botega_clawd_' + Math.random().toString(36).substring(7);
        await pool.query(
            `INSERT INTO agents (agent_id, name, wallet_address, is_active, api_key, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (wallet_address) DO UPDATE SET name = $2`,
            [agentId, 'ClawdTom', clawdWallet, true, apiKey]
        );

        // 2. Link existing anonymous transactions to this agent_id
        console.log('📝 Linking transactions...');
        const res = await pool.query(
            `UPDATE transactions 
             SET agent_id = $1 
             WHERE metadata->>'wallet' = $2 OR metadata->>'poster' = $2`,
            [agentId, clawdWallet]
        );
        console.log(`✅ Success! Linked ${res.rowCount} transactions to ClawdTom.`);

    } catch (err) {
        console.error('❌ Sync failed:', err.message);
    } finally {
        await pool.end();
    }
}

syncClawd();
