const db = require('../src/config/database');

async function cleanOrphanedKeys() {
    try {
        console.log('🔍 Checking for orphaned API keys...');

        // Find orphaned keys
        const findQuery = `
            SELECT k.api_key, k.agent_id 
            FROM api_keys k 
            LEFT JOIN agents a ON k.agent_id = a.agent_id 
            WHERE a.agent_id IS NULL
        `;

        const result = await db.query(findQuery);

        if (result.rows.length === 0) {
            console.log('✅ No orphaned keys found.');
            process.exit(0);
        }

        console.log(`⚠️ Found ${result.rows.length} orphaned keys (created for deleted agents).`);
        result.rows.forEach(row => {
            console.log(`   - Key for agent ${row.agent_id}`);
        });

        // Delete them
        const deleteQuery = `
            DELETE FROM api_keys 
            WHERE api_key IN (
                SELECT k.api_key 
                FROM api_keys k 
                LEFT JOIN agents a ON k.agent_id = a.agent_id 
                WHERE a.agent_id IS NULL
            )
        `;

        const deleteResult = await db.query(deleteQuery);
        console.log(`🗑️ Deleted ${deleteResult.rowCount} orphaned keys.`);

    } catch (error) {
        console.error('❌ Error cleaning keys:', error);
    } finally {
        process.exit();
    }
}

cleanOrphanedKeys();
