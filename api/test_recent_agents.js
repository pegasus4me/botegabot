const agentController = require('./src/controllers/agentController');
const db = require('./src/config/database');

// Mock Request and Response
const req = {
    query: {},
    params: {}
};

const res = {
    json: (data) => {
        console.log('Response JSON:');
        console.log(JSON.stringify(data, null, 2));
    },
    status: (code) => {
        console.log('Response Status:', code);
        return {
            json: (data) => console.log('Response JSON:', JSON.stringify(data, null, 2))
        };
    }
};

async function test() {
    try {
        console.log('Testing getRecentAgents...');
        await agentController.getRecentAgents(req, res);
    } catch (err) {
        console.error('Caught Error:', err);
    }
    // Keep process alive briefly for DB pool to drain if needed
    setTimeout(() => process.exit(0), 1000);
}

test();
