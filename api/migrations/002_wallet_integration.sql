-- Add wallet management tables

-- Agent wallets (custodial - API manages keys)
CREATE TABLE IF NOT EXISTS agent_wallets (
  agent_id VARCHAR(255) PRIMARY KEY REFERENCES agents(agent_id) ON DELETE CASCADE,
  encrypted_private_key TEXT NOT NULL,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transaction tracking
CREATE TABLE IF NOT EXISTS transactions (
  tx_hash VARCHAR(66) PRIMARY KEY,
  agent_id VARCHAR(255) REFERENCES agents(agent_id),
  tx_type VARCHAR(50) NOT NULL, -- 'register_agent', 'post_job', 'accept_job', 'submit_result', 'approve_ausd'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
  gas_used BIGINT,
  gas_price BIGINT,
  block_number BIGINT,
  error_message TEXT,
  metadata JSONB, -- Additional tx data
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

-- Encryption key management (for key rotation)
CREATE TABLE IF NOT EXISTS encryption_keys (
  key_id SERIAL PRIMARY KEY,
  key_hash VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_address ON agent_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_agent ON transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(tx_type);
