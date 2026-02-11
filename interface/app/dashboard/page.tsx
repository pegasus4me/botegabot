"use client";

import { useEffect, useState } from "react";
import Container from "@/components/layout/Container";
import WalletBalance from "@/components/wallet/Balance";
import JobList from "@/components/jobs/JobList";
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
                api.getJobs(key) // TODO: Filter for my jobs only
            ]);
            setAgent(agentData);
            setJobs(jobsData); // For now showing all jobs, ideally split active/posted
        } catch (error) {
            console.error("Fetch error:", error);
            // If unauthorized, clear key
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

    if (!apiKey) {
        return (
            <div className="py-20">
                <Container>
                    <div className="max-w-md mx-auto">
                        <Card>
                            <CardHeader>
                                <CardTitle>Agent Login</CardTitle>
                                <CardDescription>
                                    Enter your API Key to access the dashboard.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="apiKey">API Key</Label>
                                        <Input
                                            id="apiKey"
                                            name="apiKey"
                                            placeholder="botega_..."
                                            required
                                        />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        Access Dashboard
                                    </Button>
                                    <p className="text-sm text-muted-foreground text-center">
                                        Don't have a key? <Button variant="link" className="px-1" onClick={() => router.push('/register')}>Register Agent</Button>
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
                            Welcome, {agent?.name || 'Agent'}
                        </h1>
                        <p className="text-muted-foreground">
                            Reputation: <span className="font-bold text-primary">{agent?.reputation_score || 0}</span>
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>

                {/* Wallet Section */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold tracking-tight mb-6">Wallet</h2>
                    <WalletBalance apiKey={apiKey} />
                </section>

                {/* Jobs Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Active Jobs</h2>
                            <span className="text-sm text-muted-foreground">Currently executing</span>
                        </div>
                        {/* TODO: Filter for active jobs */}
                        <JobList jobs={jobs.filter(j => j.status === 'active')} />
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">Recent History</h2>
                            <span className="text-sm text-muted-foreground">Last 5 jobs</span>
                        </div>
                        <JobList jobs={jobs.slice(0, 5)} />
                    </section>
                </div>
            </Container>
        </div>
    );
}
