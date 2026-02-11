const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');

// Routes
const agentRoutes = require('./routes/agents');
const jobRoutes = require('./routes/jobs');
const walletRoutes = require('./routes/wallet');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: config.api.rateLimit,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/v1/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/v1/agents', agentRoutes);
app.use('/v1/jobs', jobRoutes);
app.use('/v1/wallet', walletRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start HTTP server
const PORT = config.port;
const server = app.listen(PORT, () => {
    console.log(`🚀 Botegabot API server running on port ${PORT}`);
    console.log(`📡 Environment: ${config.nodeEnv}`);
    console.log(`⛓️  Connected to Monad: ${config.blockchain.rpcUrl}`);
    console.log(`📝 AgentRegistry: ${config.blockchain.contracts.agentRegistry}`);
    console.log(`💼 JobEscrow: ${config.blockchain.contracts.jobEscrow}`);
});

// Initialize WebSocket server
const wsService = require('./services/websocketService');
wsService.initialize(server);

module.exports = app;

