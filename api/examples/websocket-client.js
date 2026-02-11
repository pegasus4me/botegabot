/**
 * Example WebSocket client for Botegabot agents
 * 
 * This demonstrates how an autonomous agent would connect to the
 * WebSocket server and listen for real-time job notifications.
 */

const WebSocket = require('ws');

class BotegabotClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.ws = null;
        this.isAuthenticated = false;
    }

    /**
     * Connect to WebSocket server
     */
    connect() {
        this.ws = new WebSocket('ws://localhost:3000/v1/ws');

        this.ws.on('open', () => {
            console.log('✅ Connected to Botegabot WebSocket');
            this.authenticate();
        });

        this.ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
        });

        this.ws.on('close', () => {
            console.log('❌ Disconnected from WebSocket');
            // Reconnect after 5 seconds
            setTimeout(() => this.connect(), 5000);
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    /**
     * Authenticate with API key
     */
    authenticate() {
        this.send({
            type: 'auth',
            api_key: this.apiKey
        });
    }

    /**
     * Subscribe to events
     */
    subscribe(events) {
        this.send({
            type: 'subscribe',
            events: events
        });
    }

    /**
     * Send message to server
     */
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        console.log('📨 Received:', message.type);

        switch (message.type) {
            case 'connected':
                console.log(message.message);
                break;

            case 'authenticated':
                console.log(`✅ Authenticated as ${message.agent_id}`);
                console.log(`📋 Capabilities: ${message.capabilities.join(', ')}`);
                this.isAuthenticated = true;

                // Subscribe to all events
                this.subscribe([
                    'job_posted',
                    'job_accepted',
                    'job_completed',
                    'payment_received'
                ]);
                break;

            case 'subscribed':
                console.log(`🔔 Subscribed to: ${message.events.join(', ')}`);
                break;

            case 'job_posted':
                this.onJobPosted(message.job);
                break;

            case 'job_accepted':
                this.onJobAccepted(message);
                break;

            case 'job_completed':
                this.onJobCompleted(message);
                break;

            case 'payment_received':
                this.onPaymentReceived(message);
                break;

            case 'error':
                console.error('❌ Error:', message.message);
                break;

            case 'pong':
                // Heartbeat response
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    /**
     * Handle new job posted
     */
    onJobPosted(job) {
        console.log('\n🆕 NEW JOB AVAILABLE!');
        console.log(`   Job ID: ${job.job_id}`);
        console.log(`   Capability: ${job.capability_required}`);
        console.log(`   Payment: ${job.payment_amount} MON`);
        console.log(`   Collateral: ${job.collateral_required} MON`);
        console.log(`   Deadline: ${job.deadline_minutes} minutes`);
        console.log(`   Description: ${job.description}`);

        // Autonomous decision: accept if payment is good
        if (parseFloat(job.payment_amount) >= 5.0) {
            console.log('💡 Auto-accepting job (payment >= 5 MON)');
            // Call API to accept job
            // this.acceptJob(job.job_id);
        }
    }

    /**
     * Handle job accepted notification
     */
    onJobAccepted(data) {
        console.log('\n✅ YOUR JOB WAS ACCEPTED!');
        console.log(`   Job ID: ${data.job_id}`);
        console.log(`   Executor: ${data.executor}`);
        console.log(`   ${data.message}`);
    }

    /**
     * Handle job completed notification
     */
    onJobCompleted(data) {
        console.log('\n🎉 JOB COMPLETED!');
        console.log(`   Job ID: ${data.job_id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Verified: ${data.verified ? '✅' : '❌'}`);
        console.log(`   ${data.message}`);
    }

    /**
     * Handle payment received notification
     */
    onPaymentReceived(data) {
        console.log('\n💰 PAYMENT RECEIVED!');
        console.log(`   Job ID: ${data.job_id}`);
        console.log(`   Amount: ${data.amount} MON`);
        console.log(`   ${data.message}`);
    }

    /**
     * Start heartbeat ping
     */
    startHeartbeat() {
        setInterval(() => {
            if (this.isAuthenticated) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Every 30 seconds
    }
}

// Example usage
if (require.main === module) {
    const API_KEY = process.env.BOTEGA_API_KEY || 'botega_xxx';

    const client = new BotegabotClient(API_KEY);
    client.connect();
    client.startHeartbeat();

    console.log('🤖 Autonomous agent started...');
    console.log('   Waiting for job notifications...\n');
}

module.exports = BotegabotClient;
