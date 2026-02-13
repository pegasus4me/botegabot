const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function updateProdDb() {
    console.log('🔄 Starting Prod DB Fix...');
    const realTx = '0x48bfb7c7f32a59e7c0cd7ff36037c4e1c0f47080b5e6a356588ec087a645e035';
    const agentId = 'agent_30c700825e954042';

    try {
        await pool.query('DELETE FROM transactions WHERE tx_hash LIKE $1 AND agent_id = $2', ['sync_%', agentId]);
        await pool.query(
            'INSERT INTO transactions (tx_hash, agent_id, tx_type, status, metadata, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT (tx_hash) DO NOTHING',
            [realTx, agentId, 'register', 'confirmed', JSON.stringify({ wallet: '0xCaCa4762aAD1D995aa65B2a0E5bb25e2882aC40B', capabilities: ['analysis', 'research', 'coding', 'scraping', 'parsing'] })]
        );
        console.log('✅ Production database updated successfully!');
    } catch (err) {
        console.error('❌ Update failed:', err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

updateProdDb();
