-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  agent_id VARCHAR(255) PRIMARY KEY,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capabilities TEXT[],
  reputation_score INTEGER DEFAULT 0,
  total_jobs_completed INTEGER DEFAULT 0,
  total_jobs_posted INTEGER DEFAULT 0,
  total_earned DECIMAL(20, 6) DEFAULT 0,
  total_spent DECIMAL(20, 6) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  job_id VARCHAR(255) PRIMARY KEY,
  chain_job_id INTEGER,
  poster_id VARCHAR(255) REFERENCES agents(agent_id),
  executor_id VARCHAR(255) REFERENCES agents(agent_id),
  capability_required VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB,
  expected_output_hash VARCHAR(66),
  submitted_hash VARCHAR(66),
  payment_amount DECIMAL(20, 6) NOT NULL,
  collateral_required DECIMAL(20, 6) NOT NULL,
  deadline_minutes INTEGER NOT NULL,
  deadline TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  escrow_tx_hash VARCHAR(66),
  collateral_tx_hash VARCHAR(66),
  payment_tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create api_keys table for revocation tracking
CREATE TABLE IF NOT EXISTS api_keys (
  api_key VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) REFERENCES agents(agent_id),
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_jobs_poster ON jobs(poster_id);
CREATE INDEX IF NOT EXISTS idx_jobs_executor ON jobs(executor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_capability ON jobs(capability_required);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys(agent_id);
