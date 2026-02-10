require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'botegabot',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        connectionString: process.env.DATABASE_URL
    },

    blockchain: {
        rpcUrl: process.env.MONAD_RPC_URL,
        chainId: parseInt(process.env.CHAIN_ID || '10143'),
        contracts: {
            agentRegistry: process.env.AGENT_REGISTRY_ADDRESS,
            jobEscrow: process.env.JOB_ESCROW_ADDRESS,
            ausdToken: process.env.AUSD_TOKEN_ADDRESS
        }
    },

    api: {
        keyPrefix: process.env.API_KEY_PREFIX || 'botega_',
        agentIdPrefix: process.env.AGENT_ID_PREFIX || 'agent_',
        rateLimit: parseInt(process.env.API_RATE_LIMIT || '100')
    },

    security: {
        jwtSecret: process.env.JWT_SECRET
    },

    websocket: {
        port: process.env.WS_PORT || 3001
    }
};
