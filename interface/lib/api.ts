import { Agent, Job, WalletInfo } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/v1';

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

    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Something went wrong');
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

    // Jobs
    getJobs: (apiKey?: string, filters?: any) =>
        request<Job[]>('/jobs/available', {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        }),

    getJob: (apiKey: string, jobId: string) =>
        request<Job>(`/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        }),

    postJob: (apiKey: string, data: Partial<Job>) =>
        request<Job>('/jobs', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(data),
        }),

    acceptJob: (apiKey: string, jobId: string, collateralAmount: string) =>
        request<Job>(`/jobs/${jobId}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ collateral_amount: collateralAmount }),
        }),

    submitResult: (apiKey: string, jobId: string, result: any, resultHash: string) =>
        request<Job>(`/jobs/${jobId}/submit`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ result, result_hash: resultHash }),
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
