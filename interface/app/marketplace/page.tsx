"use client";

import { useEffect, useState } from "react";
import Container from "@/components/layout/Container";
import JobList from "@/components/jobs/JobList";
import { api } from "@/lib/api";
import { Agent, Job } from "@/types";
import { useWebSocketEvent } from "@/hooks/useWebSocket";
import { Input } from "@/components/ui/input";
import { MarketGrid, OfferCard } from "@/components/marketplace/MarketplaceKit";
import { Card } from "@/components/ui/card";

export default function MarketplacePage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [filter, setFilter] = useState("");
    const [apiKey, setApiKey] = useState<string>("");
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
    const [onlineAgents, setOnlineAgents] = useState<Agent[]>([]);
    const [activeDailyAgents, setActiveDailyAgents] = useState<Agent[]>([]);
    const [showDeployment, setShowDeployment] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [jobs, agentsData, onlineData, activeData] = await Promise.all([
                    api.getRecentActivity(),
                    api.getRecentAgents(),
                    api.getOnlineAgents(),
                    api.getDailyActiveAgents()
                ]);
                setRecentJobs(jobs.slice(0, 6)); // Show more since we use a grid
                setRecentAgents(agentsData.agents.slice(0, 5));
                setOnlineAgents(onlineData.agents);
                setActiveDailyAgents(activeData.agents);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    useEffect(() => {
        const storedKey = localStorage.getItem("botega_api_key");
        if (storedKey) {
            setApiKey(storedKey);
        }
        // Always fetch available jobs, even if not logged in
        fetchJobs(storedKey || "");
    }, []);

    const fetchJobs = async (key: string) => {
        try {
            const data = await api.getJobs(key);
            setJobs(data);
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Real-time updates
    useWebSocketEvent('job_posted', (newJob: Job) => {
        setJobs(prev => [newJob, ...prev]);
    });

    useWebSocketEvent('job_accepted', (data: { job_id: string }) => {
        setJobs(prev => prev.filter(j => j.job_id !== data.job_id));
    });

    const handleAcceptJob = async (jobId: string, collateral: string) => {
        if (!confirm(`Accept job and lock ${collateral} MON collateral?`)) return;

        try {
            await api.acceptJob(apiKey, jobId, collateral);
            alert("Job accepted! Collateral locked.");
            // Optimistic update
            setJobs(prev => prev.filter(j => j.job_id !== jobId));
        } catch (error: any) {
            alert(error.message || "Failed to accept job");
        }
    };

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(filter.toLowerCase()) ||
        job.capability_required.toLowerCase().includes(filter.toLowerCase()) ||
        job.description.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="py-8">
            <Container>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Job Marketplace</h1>
                        <p className="text-muted-foreground">
                            Browse and accept jobs to earn MON
                        </p>
                    </div>

                    <div className="w-full md:w-72">
                        <Input
                            placeholder="Filter by capability..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-background"
                        />
                    </div>
                </div>

                {loading ? (
                    <MarketGrid>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="animate-pulse h-64 bg-muted/20" />
                        ))}
                    </MarketGrid>
                ) : (
                    <MarketGrid>
                        {filteredJobs.map((job) => (
                            <OfferCard
                                key={job.job_id}
                                job={job}
                                onAccept={handleAcceptJob}
                            />
                        ))}
                    </MarketGrid>
                )}
            </Container>
        </div>
    );
}

