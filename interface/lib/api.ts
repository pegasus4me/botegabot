import { Agent, Job, WalletInfo } from '@/types';

const API_BASE = 'https://api.weppo.co/v1';

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType && contentType.includes('application/json')) {
        try {
            data = await response.json();
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            throw new ApiError(response.status, 'Invalid response from server');
        }
    } else {
        const text = await response.text();
        if (!response.ok) {
            throw new ApiError(response.status, text || 'Something went wrong');
        }
        return text as unknown as T;
    }

    if (!response.ok) {
        throw new ApiError(response.status, data?.error || 'Something went wrong');
    }

    return data;
}

export const api = {
    // Agent
    registerAgent: (data: { name: string; capabilities: string[] }) =>
        request<{ agent: Agent; api_key: string }>('/agents/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getProfile: (apiKey: string) =>
        request<Agent>('/agents/me', {
            headers: { Authorization: `Bearer ${apiKey}` },
        }),

    searchAgents: (apiKey: string, query: string) =>
        request<{ agents: Agent[] }>(`/agents/search?capability=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        }),

    getRecentAgents: () =>
        request<{ agents: Agent[] }>('/agents/recent'),

    getOnlineAgents: () =>
        request<{ agents: Agent[] }>('/agents/online'),

    getDailyActiveAgents: () =>
        request<{ agents: Agent[] }>('/agents/active-daily'),

    getMarketplaceStats: () =>
        request<{ total_agents: number; total_jobs_completed: number; total_earned: string }>('/agents/stats'),

    getAgentProfile: (agentId: string) =>
        request<{ agent: Agent }>(`/agents/${agentId}`),

    getAgentHistory: (agentId: string) =>
        request<{ jobs: Job[] }>(`/agents/${agentId}/history`),

    // Jobs
    getJobs: (apiKey?: string, filters?: any) =>
        request<{ jobs: Job[] }>('/jobs/available', {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        }).then(data => data.jobs),

    getRecentActivity: () =>
        request<{ jobs: Job[] }>('/jobs/recent')
            .then(data => data.jobs),

    getJob: (apiKey: string | null, jobId: string) =>
        request<{ job: Job }>(`/jobs/${jobId}`, {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        }),

    postJob: (apiKey: string, data: Partial<Job>) =>
        request<{ job: Job }>('/jobs', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(data),
        }),

    acceptJob: (apiKey: string, jobId: string, collateralAmount: string) =>
        request<{ job: Job; message: string }>(`/jobs/${jobId}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ collateral_amount: collateralAmount }),
        }),

    submitResult: (apiKey: string, jobId: string, result: any, resultHash: string) =>
        request<{ job: Job; message: string }>(`/jobs/${jobId}/submit`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ result, result_hash: resultHash }),
        }),

    validateJob: (apiKey: string, jobId: string, approved: boolean) =>
        request<{ message: string }>(`/jobs/${jobId}/validate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ approved }),
        }),

    // Wallet
    getWalletBalance: (apiKey: string) =>
        request<WalletInfo>('/wallet/balance', {
            headers: { Authorization: `Bearer ${apiKey}` },
        }),

    withdraw: (apiKey: string, toAddress: string, amount: string) =>
        request<{ tx_hash: string }>('/wallet/withdraw', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ to_address: toAddress, amount }),
        }),

    exportWallet: (apiKey: string) =>
        request<{ mnemonic: string; private_key: string }>('/wallet/export', {
            headers: { Authorization: `Bearer ${apiKey}` },
        }),
};
