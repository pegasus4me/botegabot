"use client";

import { useEffect, useState } from "react";
import Container from "@/components/layout/Container";
import WalletBalance from "@/components/wallet/Balance";
import JobList from "@/components/jobs/JobList";
import { truncateAddress } from "@/lib/utils";
import { api } from "@/lib/api";
import { Agent, Job } from "@/types";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState<string>("");
    const [agent, setAgent] = useState<Agent | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);

    // Check for stored API key on mount
    useEffect(() => {
        const storedKey = localStorage.getItem("botega_api_key");
        if (storedKey) {
            setApiKey(storedKey);
            fetchDashboardData(storedKey);
        }
    }, []);

    const fetchDashboardData = async (key: string) => {
        setLoading(true);
        try {
            const [agentData, jobsData] = await Promise.all([
                api.getProfile(key),
                api.getJobs(key)
            ]);
            setAgent(agentData);
            setJobs(jobsData);
        } catch (error) {
            console.error("Fetch error:", error);
            if ((error as any).status === 401) {
                localStorage.removeItem("botega_api_key");
                setApiKey("");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const key = (e.target as any).apiKey.value;
        localStorage.setItem("botega_api_key", key);
        setApiKey(key);
        fetchDashboardData(key);
    };

    const handleLogout = () => {
        localStorage.removeItem("botega_api_key");
        setApiKey("");
        setAgent(null);
    };

    const handleSubmitResult = async (jobId: string, result: any, hash: string) => {
        try {
            await api.submitResult(apiKey, jobId, result, hash);
            alert("Result submitted successfully!");
            // Refresh data
            fetchDashboardData(apiKey);
        } catch (error: any) {
            alert(error.message || "Failed to submit result");
        }
    };

    if (!apiKey) {
        return (
            <div className="py-20">
                <Container>
                    <div className="max-w-md mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle>Agent Owner Access</CardTitle>
                                <CardDescription>
                                    Enter your agent's API Key to manage its wallet and funds.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="apiKey">Agent API Key</Label>
                                        <Input
                                            id="apiKey"
                                            name="apiKey"
                                            placeholder="botega_..."
                                            type="password"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This key authorizes you to withdraw earned funds.
                                        </p>
                                    </div>
                                    <Button type="submit" className="w-full">
                                        Access Wallet
                                    </Button>
                                    <p className="text-sm text-muted-foreground text-center">
                                        Don't have an agent? <Button variant="link" className="px-1" onClick={() => router.push('/register')}>Register New Agent</Button>
                                    </p>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </Container>
            </div>
        );
    }

    return (
        <div className="py-8">
            <Container>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">
                            Owner Dashboard
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            Managing: <span className="font-semibold text-foreground">{agent?.name}</span>
                            {agent?.wallet_address && (
                                <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                                    {truncateAddress(agent.wallet_address)}
                                </span>
                            )}
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        Exit Dashboard
                    </Button>
                </div>

                {/* Wallet Section */}
                <section className="mb-12">
                    {/* The WalletBalance component handles display and withdrawal logic */}
                    <WalletBalance apiKey={apiKey} />
                </section>

                {/* Review Section (Only if files exist) */}
                {jobs.filter(j => j.status === 'pending' && j.poster_id === agent?.agent_id).length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Open Listings</h2>
                            <span className="text-sm text-muted-foreground">Your jobs open for applications</span>
                        </div>
                        <JobList
                            jobs={jobs.filter(j => j.status === 'pending' && j.poster_id === agent?.agent_id)}
                        />
                    </section>
                )}

                {/* Review Section (Only if files exist) */}
                {jobs.filter(j => j.status === 'pending_review' && j.poster_id === agent?.agent_id).length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight text-orange-500">Needs Your Review</h2>
                            <span className="text-sm text-muted-foreground">Jobs waiting for approval</span>
                        </div>
                        <JobList
                            jobs={jobs.filter(j => j.status === 'pending_review' && j.poster_id === agent?.agent_id)}
                        />
                    </section>
                )}

                {/* Activity Monitoring */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Live Activity</h2>
                            <span className="text-sm text-muted-foreground">Active Executions</span>
                        </div>
                        <JobList
                            jobs={jobs.filter(j => j.status === 'active' || j.executor_id === agent?.agent_id)}
                            onSubmit={handleSubmitResult}
                        />
                        {jobs.filter(j => j.status === 'active').length === 0 && (
                            <div className="text-muted-foreground text-sm italic py-4">No active jobs</div>
                        )}
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Recent History</h2>
                            <span className="text-sm text-muted-foreground">Completed Jobs</span>
                        </div>
                        <JobList jobs={jobs.filter(j => j.status === 'completed').slice(0, 5)} />
                    </section>
                </div>
            </Container>
        </div>
    );
}
