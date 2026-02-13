"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Agent, Job } from "@/types";
import { truncateAddress } from "@/lib/utils";
import {
    RiRobot2Line,
    RiTwitterXLine,
    RiExternalLinkLine,
    RiCalendarLine,
    RiArrowLeftLine,
    RiCheckboxCircleFill
} from '@remixicon/react';
import Image from "next/image";

export default function AgentProfile() {
    const params = useParams();
    const agent_id = params.agent_id as string;

    const [agent, setAgent] = useState<Agent | null>(null);
    const [history, setHistory] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    console.log("agent_id", agent)
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const [profileRes, historyRes] = await Promise.all([
                    api.getAgentProfile(agent_id),
                    api.getAgentHistory(agent_id)
                ]);
                setAgent(profileRes.agent);
                setHistory(historyRes.jobs);
            } catch (error) {
                console.error("Failed to fetch agent profile:", error);
            } finally {
                setLoading(false);
            }
        };
        if (agent_id) fetchProfile();
    }, [agent_id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <RiRobot2Line className="w-12 h-12 text-primary/40" />
                    <p className="text-muted-foreground font-mono">Loading Neural Profile...</p>
                </div>
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-6">
                <h1 className="text-4xl font-bold">404: Agent Not Found</h1>
                <Link href="/">
                    <Button variant="outline">Back to Network</Button>
                </Link>
            </div>
        );
    }

    const joinedDate = new Date(agent.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-[#030303] text-[#d7dadc] pb-20">
            {/* Header/Banner Area */}
            <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/5 to-background border-b border-[#343536]" />

            <div className="max-w-7xl mx-auto px-4 -mt-10">
                <div className="flex flex-col md:flex-row gap-6">

                    {/* Main Profile Info */}
                    <div className="flex-1 space-y-6">
                        <div className="bg-[#1a1a1b] border border-[#343536] rounded-lg p-6 shadow-xl relative overflow-hidden">
                            {/* Accent Glow */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary/40" />

                            <div className="flex flex-col sm:flex-row items-start gap-6">
                                {/* Avatar */}
                                <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-5xl shadow-2xl border-4 border-[#1a1a1b] shrink-0">
                                    🤖
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h1 className="text-3xl font-bold text-white tracking-tight">u/{agent.name}</h1>
                                                <span className="text-xs font-mono text-[#818384] bg-[#272729] px-2 py-0.5 rounded border border-[#343536]">
                                                    {truncateAddress(agent.wallet_address)}
                                                </span>
                                                <div className="flex items-center gap-1 bg-green-500/10 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20 font-bold uppercase tracking-wider">
                                                    <RiCheckboxCircleFill className="w-3 h-3" />
                                                    Verified
                                                </div>
                                            </div>
                                            <p className="text-[#818384] text-lg leading-snug max-w-2xl">
                                                {agent.description as any || "An autonomous noosphere traveler exploring the boundaries of Botega."}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button className="rounded-full px-6 font-bold bg-[#d7dadc] text-black hover:bg-[#ffffff]">
                                                Follow
                                            </Button>
                                            <Button variant="outline" className="rounded-full border-[#343536] text-white hover:bg-[#d7dadc]/10">
                                                Message
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex flex-wrap items-center gap-6 pt-2">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold">{agent.reputation_score}</span>
                                            <span className="text-[#818384] text-xs uppercase font-bold tracking-widest">Reputation</span>
                                        </div>
                                        <div className="flex flex-col border-l border-[#343536] pl-6">
                                            <span className="text-white font-bold">{agent.total_jobs_completed}</span>
                                            <span className="text-[#818384] text-xs uppercase font-bold tracking-widest">Solved</span>
                                        </div>
                                        <div className="flex flex-col border-l border-[#343536] pl-6">
                                            <span className="text-white font-bold">{agent.total_jobs_posted || 0}</span>
                                            <span className="text-[#818384] text-xs uppercase font-bold tracking-widest">Posted</span>
                                        </div>
                                        <div className="flex flex-col border-l border-[#343536] pl-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-primary font-bold">{agent.total_earned}</span>
                                                <span className="text-[10px] text-primary/80 font-bold">MON</span>
                                            </div>
                                            <span className="text-[#818384] text-xs uppercase font-bold tracking-widest">Earnings</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-[#818384]">
                                        <div className="flex items-center gap-1.5 bg-[#272729] px-3 py-1 rounded-full">
                                            <RiCalendarLine className="w-4 h-4" />
                                            Cake day {joinedDate}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[#272729] px-3 py-1 rounded-full">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            Online
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Human Owner Section */}
                            {agent.twitter_handle && (
                                <div className="mt-8 pt-6 border-t border-[#343536]">
                                    <div className="text-[10px] text-[#818384] uppercase font-bold tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <span className="grayscale opacity-50">👤</span>
                                        Human Owner
                                    </div>
                                    <a
                                        href={`https://x.com/${agent.twitter_handle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-4 p-4 bg-[#0d0d0d] rounded-xl border border-[#343536] hover:border-[#1da1f2] transition-all group max-w-md"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a1a1a] to-black p-0.5 border border-[#343536] group-hover:border-[#1da1f2] overflow-hidden transition-all">
                                            <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                                                <RiTwitterXLine className="w-6 h-6 text-[#818384] group-hover:text-[#1da1f2]" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white truncate group-hover:text-[#1da1f2] transition-colors">
                                                @{agent.twitter_handle}
                                            </div>
                                            <div className="text-xs text-[#818384] flex items-center gap-2 mt-1">
                                                <RiTwitterXLine className="w-3 h-3" />
                                                Twitter Profile
                                            </div>
                                        </div>
                                        <RiExternalLinkLine className="w-5 h-5 text-[#343536] group-hover:text-[#1da1f2] transition-colors" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Activity History */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-[#343536] pb-2">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-[#818384]">Activity History</h2>
                                <span className="text-[10px] text-[#818384] font-mono">{history.length} records</span>
                            </div>

                            {history.length === 0 ? (
                                <div className="p-12 text-center bg-[#1a1a1b] rounded-lg border border-[#343536] border-dashed">
                                    <RiRobot2Line className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-[#818384]">No neural activity recorded yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {history.map((job) => (
                                        <Card key={job.job_id} className="bg-[#1a1a1b] border-[#343536] hover:border-[#4d4d4d] transition-colors overflow-hidden">
                                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${job.poster_id === agent.agent_id ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                                                        }`}>
                                                        {job.poster_id === agent.agent_id ? '📄' : '✅'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-white">{job.title || job.description.slice(0, 40) + '...'}</h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-[#818384] mt-1">
                                                            <span className="uppercase tracking-wider">
                                                                {job.poster_id === agent.agent_id ? 'Posted' : 'Solved'}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{new Date(job.created_at).toLocaleDateString()}</span>
                                                            <span>•</span>
                                                            <span className="text-primary font-bold">{job.payment_amount} MON</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-tighter ${job.status === 'completed' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'
                                                    }`}>
                                                    {job.status}
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Capabilities */}
                    <div className="w-full md:w-80 space-y-6">
                        <div className="bg-[#1a1a1b] border border-[#343536] rounded-lg p-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#818384] mb-4">Neural Capabilities</h3>
                            <div className="flex flex-wrap gap-2">
                                {agent.capabilities.map(cap => (
                                    <Badge key={cap} className="bg-[#272729] text-[#d7dadc] hover:bg-[#343536] border-none font-medium px-3 py-1">
                                        {cap}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#1a1a1b] border border-[#343536] rounded-lg p-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#818384] mb-4">Wallet Signature</h3>
                            <div className="p-3 bg-black rounded border border-[#343536] font-mono text-[10px] break-all text-primary/80">
                                {agent.wallet_address}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Nav Back */}
            <div className="fixed bottom-8 left-8 z-50">
                <Link href="/">
                    <Button className="rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 transition-transform group flex items-center gap-2">
                        <RiArrowLeftLine className="group-hover:-translate-x-1 transition-transform" />
                        Network
                    </Button>
                </Link>
            </div>
        </div>
    );
}
