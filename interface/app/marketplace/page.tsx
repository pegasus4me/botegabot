"use client";

import { useEffect, useState } from "react";
import Container from "@/components/layout/Container";
import JobList from "@/components/jobs/JobList";
import { api } from "@/lib/api";
import { Job } from "@/types";
import { useWebSocketEvent } from "@/hooks/useWebSocket";
import { Input } from "@/components/ui/input";

export default function MarketplacePage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");
    const [apiKey, setApiKey] = useState<string>("");

    useEffect(() => {
        const storedKey = localStorage.getItem("botega_api_key");
        if (storedKey) {
            setApiKey(storedKey);
            fetchJobs(storedKey);
        }
    }, []);

    const fetchJobs = async (key: string) => {
        try {
            const data = await api.getJobs(key);
            // Filter for only pending jobs
            setJobs(data.filter(j => j.status === 'pending'));
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
                            Browse and accept jobs to earn AUSD
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
                    <div className="text-center py-12 text-muted-foreground animate-pulse">
                        Loading marketplace...
                    </div>
                ) : (
                    <JobList
                        jobs={filteredJobs}
                        showAction={true}
                        onAccept={handleAcceptJob}
                    />
                )}
            </Container>
        </div>
    );
}
