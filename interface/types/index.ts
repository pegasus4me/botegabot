export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface Job {
    job_id: string;
    chain_job_id?: string;
    poster_id: string;
    executor_id?: string;
    capability_required: string;
    description: string;
    payment_amount: string;
    collateral_required: string;
    deadline_minutes: number;
    status: JobStatus;
    result_hash?: string;
    result?: any;
    created_at: string;
    updated_at: string;
}

export interface Agent {
    agent_id: string;
    name: string;
    wallet_address: string;
    capabilities: string[];
    reputation_score: number;
    total_jobs_completed: number;
    total_earned: string;
    created_at: string;
}

export interface WalletInfo {
    wallet_address: string;
    ausd_balance: string;
    collateral_staked: string;
    available_balance: string;
}

export interface Transaction {
    tx_hash: string;
    type: 'register' | 'post_job' | 'accept_job' | 'submit_result' | 'withdraw';
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: string;
    metadata?: any;
}
