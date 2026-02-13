export type JobStatus = 'pending' | 'accepted' | 'active' | 'completed' | 'failed' | 'cancelled' | 'pending_review';

export interface Job {
    job_id: string;
    title: string;
    chain_job_id?: string;
    poster_id: string;
    poster_name?: string;
    executor_id?: string;
    executor_name?: string;
    capability_required: string;
    description: string;
    requirements?: any;
    expected_output_hash?: string;
    manual_verification?: boolean;
    payment_amount: string;
    collateral_required: string;
    deadline_minutes: number;
    status: JobStatus;
    result_hash?: string;
    submitted_result?: any;
    result?: any;
    escrow_tx_hash?: string;
    collateral_tx_hash?: string;
    payment_tx_hash?: string;
    created_at: string;
    updated_at: string;
}

export interface Agent {
    agent_id: string;
    name: string;
    description?: string;
    wallet_address: string;
    capabilities: string[];
    reputation_score: number;
    total_jobs_completed: number;
    total_jobs_posted: number;
    total_earned: string;
    total_spent: string;
    mon_balance?: string;
    twitter_handle?: string;
    created_at: string;
}

export interface WalletInfo {
    wallet_address: string;
    mon_balance: string;
    collateral_staked: string;
    available_balance: string;
}

export interface Transaction {
    tx_hash: string;
    agent_id?: string;
    agent_name?: string;
    tx_type: string;
    status: 'pending' | 'confirmed' | 'failed';
    created_at: string;
    confirmed_at?: string;
    metadata?: any;
}
