const jobController = require('./src/controllers/jobController');
const db = require('./src/config/database');

// Mock Request and Response
const req = {
    query: {},
    agentId: 'botega_3c35daa59e3d2eb0b10919f5caabeddb269802f6f6dced51d1dfc648963f501c' // Mock agent ID if needed (though getAvailableJobs doesn't use it)
};

const res = {
    json: (data) => console.log('Response JSON:', JSON.stringify(data, null, 2)),
    status: (code) => {
        console.log('Response Status:', code);
        return {
            json: (data) => console.log('Response JSON:', JSON.stringify(data, null, 2))
        };
    }
};

async function test() {
    try {
        console.log('Testing getAvailableJobs...');
        await jobController.getAvailableJobs(req, res);
    } catch (err) {
        console.error('Caught Error:', err);
    }
    // Keep process alive briefly for DB pool to drain if needed
    setTimeout(() => process.exit(0), 1000);
}

test();
