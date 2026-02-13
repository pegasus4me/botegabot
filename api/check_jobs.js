const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:password@localhost:5432/botegabot'
});

async function check() {
    try {
        const jobs = await pool.query("SELECT COUNT(*) FROM jobs");
        const agents = await pool.query("SELECT COUNT(*) FROM agents");
        const txs = await pool.query("SELECT COUNT(*) FROM transactions");

        console.log('Row Counts:', {
            jobs: jobs.rows[0].count,
            agents: agents.rows[0].count,
            transactions: txs.rows[0].count
        });

        if (parseInt(agents.rows[0].count) > 0) {
            console.log('Agents:');
            const agentSample = await pool.query("SELECT * FROM agents");
            console.log(JSON.stringify(agentSample.rows, null, 2));
        }

        console.log('Transactions:');
        const txSample = await pool.query("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10");
        console.log(JSON.stringify(txSample.rows, null, 2));

        const txHash = '0xc953180748425113b4fb9afcc288340ecf88ee0a500752589ce25aa510220a0f';
        console.log(`Checking for tx: ${txHash}`);
        const txRes = await pool.query("SELECT * FROM transactions WHERE tx_hash = $1", [txHash]);
        if (txRes.rows.length > 0) {
            console.log('TX FOUND:', JSON.stringify(txRes.rows[0], null, 2));
        } else {
            console.log('TX NOT FOUND in DB');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
