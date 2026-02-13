const pool = require('./src/config/database');

const config = require('./src/config/env');
console.log('DB Config:', {
    host: config.database.host,
    database: config.database.database,
    user: config.database.user,
    hasPassword: !!config.database.password
});

async function check() {
    try {
        const txHash = '0xc953180748425113b4fb9afcc288340ecf88ee0a500752589ce25aa510220a0f';
        console.log(`Checking for tx: ${txHash}`);
        const res = await pool.query("SELECT * FROM transactions WHERE tx_hash = $1", [txHash]);
        console.log('Rows found:', res.rows.length);
        if (res.rows.length > 0) {
            console.log(JSON.stringify(res.rows[0], null, 2));
        } else {
            console.log('Transaction NOT found in DB.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        // process.exit(0); 
    }
}

check();
