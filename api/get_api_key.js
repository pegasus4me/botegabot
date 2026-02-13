const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/config/database');

(async () => {
    try {
        // Try agents table first
        let res = await db.query("SELECT api_key FROM agents WHERE agent_id = 'agent_f9a616300fc6430d'");
        if (res.rows.length > 0) {
            console.log(res.rows[0].api_key);
        } else {
            console.log('Not found in agents table');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
