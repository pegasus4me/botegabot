const WebSocket = require('ws');
const db = require('../config/database');
const config = require('../config/env');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Map of agentId -> WebSocket connection
    }

    /**
     * Initialize WebSocket server
     */
    initialize(server) {
        this.wss = new WebSocket.Server({
            server,
            path: '/v1/ws'
        });

        this.wss.on('connection', (ws, req) => {
            console.log('New WebSocket connection');

            // Store connection temporarily until authenticated
            ws.isAuthenticated = false;
            ws.agentId = null;
            ws.capabilities = [];

            // Set up message handler
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    await this.handleMessage(ws, data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            // Handle disconnection
            ws.on('close', () => {
                if (ws.agentId) {
                    this.clients.delete(ws.agentId);
                    console.log(`Agent ${ws.agentId} disconnected`);
                }
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to Botegabot WebSocket. Please authenticate.'
            }));
        });

        console.log(`🔌 WebSocket server running on ws://localhost:${config.websocket.port}/v1/ws`);
    }

    /**
     * Handle incoming WebSocket messages
     */
    async handleMessage(ws, data) {
        const { type, api_key, events } = data;

        switch (type) {
            case 'auth':
                await this.authenticateClient(ws, api_key);
                break;

            case 'subscribe':
                if (!ws.isAuthenticated) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Not authenticated'
                    }));
                    return;
                }
                this.subscribeToEvents(ws, events);
                break;

            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;

            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }

    /**
     * Authenticate WebSocket client with API key
     */
    async authenticateClient(ws, apiKey) {
        try {
            if (!apiKey) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'API key required'
                }));
                return;
            }

            // Query database for API key
            const result = await db.query(
                `SELECT ak.agent_id, ak.is_revoked, a.capabilities
         FROM api_keys ak
         JOIN agents a ON ak.agent_id = a.agent_id
         WHERE ak.api_key = $1`,
                [apiKey]
            );

            if (result.rows.length === 0) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid API key'
                }));
                ws.close();
                return;
            }

            const { agent_id, is_revoked, capabilities } = result.rows[0];

            if (is_revoked) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'API key has been revoked'
                }));
                ws.close();
                return;
            }

            // Authenticate the connection
            ws.isAuthenticated = true;
            ws.agentId = agent_id;
            ws.capabilities = capabilities || [];
            ws.subscribedEvents = [];

            // Store in clients map
            this.clients.set(agent_id, ws);

            // Update last used timestamp
            await db.query(
                'UPDATE api_keys SET last_used_at = NOW() WHERE api_key = $1',
                [apiKey]
            );

            // Send success response
            ws.send(JSON.stringify({
                type: 'authenticated',
                agent_id: agent_id,
                capabilities: capabilities,
                message: 'Successfully authenticated'
            }));

            console.log(`Agent ${agent_id} authenticated via WebSocket`);

        } catch (error) {
            console.error('Authentication error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Authentication failed'
            }));
        }
    }

    /**
     * Subscribe client to specific events
     */
    subscribeToEvents(ws, events) {
        if (!Array.isArray(events)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Events must be an array'
            }));
            return;
        }

        ws.subscribedEvents = events;

        ws.send(JSON.stringify({
            type: 'subscribed',
            events: events,
            message: `Subscribed to ${events.length} event(s)`
        }));

        console.log(`Agent ${ws.agentId} subscribed to:`, events);
    }

    /**
     * Broadcast job_posted event to relevant agents
     */
    broadcastJobPosted(job) {
        const message = {
            type: 'job_posted',
            job: {
                job_id: job.job_id,
                poster: job.poster_id,
                capability_required: job.capability_required,
                description: job.description,
                payment_amount: job.payment_amount,
                collateral_required: job.collateral_required,
                deadline_minutes: job.deadline_minutes,
                created_at: job.created_at
            }
        };

        // Send to agents with matching capability who subscribed to job_posted
        this.clients.forEach((ws, agentId) => {
            // Don't send to the poster
            if (agentId === job.poster_id) return;

            // Check if subscribed to job_posted events
            if (!ws.subscribedEvents.includes('job_posted')) return;

            // Check if agent has the required capability
            if (ws.capabilities.includes(job.capability_required)) {
                this.sendToClient(ws, message);
            }
        });

        console.log(`Broadcasted job_posted: ${job.job_id} to relevant agents`);
    }

    /**
     * Notify poster that their job was accepted
     */
    notifyJobAccepted(job, executorId) {
        const message = {
            type: 'job_accepted',
            job_id: job.job_id,
            executor: executorId,
            collateral: job.collateral_required,
            deadline: job.deadline,
            message: `Your job was accepted`
        };

        this.sendToAgent(job.poster_id, message, 'job_accepted');
        console.log(`Notified ${job.poster_id} of job acceptance`);
    }

    /**
     * Notify executor that they received payment
     */
    notifyPaymentReceived(job, amount, verified) {
        const message = {
            type: 'payment_received',
            job_id: job.job_id,
            amount: amount,
            verified: verified,
            message: verified
                ? `✅ Payment received: ${amount} AUSD`
                : `❌ Job failed: collateral slashed`
        };

        this.sendToAgent(job.executor_id, message, 'payment_received');
        console.log(`Notified ${job.executor_id} of payment`);
    }

    /**
     * Notify poster that job was completed
     */
    notifyJobCompleted(job, verified) {
        const message = {
            type: 'job_completed',
            job_id: job.job_id,
            executor: job.executor_id,
            verified: verified,
            status: verified ? 'completed' : 'failed',
            message: verified
                ? `✅ Job completed successfully`
                : `❌ Job failed: hash mismatch`
        };

        this.sendToAgent(job.poster_id, message, 'job_completed');
        console.log(`Notified ${job.poster_id} of job completion`);
    }

    /**
     * Send message to specific agent
     */
    sendToAgent(agentId, message, eventType) {
        const ws = this.clients.get(agentId);

        if (!ws) {
            console.log(`Agent ${agentId} not connected`);
            return;
        }

        // Check if subscribed to this event type
        if (eventType && !ws.subscribedEvents.includes(eventType)) {
            return;
        }

        this.sendToClient(ws, message);
    }

    /**
     * Send message to WebSocket client
     */
    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Broadcast to all connected clients
     */
    broadcast(message) {
        this.clients.forEach((ws) => {
            this.sendToClient(ws, message);
        });
    }

    /**
     * Get number of connected clients
     */
    getConnectedCount() {
        return this.clients.size;
    }
}

// Singleton instance
const wsService = new WebSocketService();

module.exports = wsService;
