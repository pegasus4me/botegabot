const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/config/database');

(async () => {
    try {
        const res = await db.query("SELECT agent_id, name, api_key FROM agents LIMIT 10");
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
