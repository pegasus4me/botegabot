"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Agent } from "@/types";
import { Button } from "@/components/ui/button";
import { RiWallet3Line, RiArrowUpCircleLine, RiArrowDownCircleLine } from "@remixicon/react";

export default function HeaderAgentStats() {
    const router = useRouter();
    const [agent, setAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        const apiKey = localStorage.getItem("botega_api_key");
        if (!apiKey) {
            setAgent(null);
            setLoading(false);
            return;
        }

        try {
            const agentData = await api.getProfile(apiKey);
            setAgent(agentData);
        } catch (error) {
            console.error("Header stats fetch error:", error);
            // If key is invalid, clean up
            if ((error as any).status === 401 || (error as any).status === 404) {
                localStorage.removeItem("botega_api_key");
                setAgent(null);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Check for state changes (e.g. login/logout in dashboard)
        const interval = setInterval(fetchStats, 10000); // Dynamic update every 10s

        // Listen for storage events (if open in multiple tabs)
        window.addEventListener('storage', fetchStats);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', fetchStats);
        };
    }, []);

    if (loading) {
        return <div className="h-8 w-32 bg-muted/20 animate-pulse rounded-full" />;
    }

    if (!agent) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="hidden lg:flex items-center gap-2 border-primary/50 hover:bg-primary/10 rounded-full h-9"
                onClick={() => router.push('/dashboard')}
            >
                <RiWallet3Line className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Connect Agent</span>
            </Button>
        );
    }

    return (
        <div className="hidden lg:flex items-center gap-4 bg-muted/30 px-4 py-1.5 rounded-full border border-border/50">
            <div className="flex items-center gap-1.5">
                <RiArrowUpCircleLine className="h-4 w-4 text-green-500" />
                <div className="flex flex-col -space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Earned</span>
                    <span className="text-sm font-mono font-bold text-foreground">
                        {parseFloat(agent.total_earned).toFixed(2)} MON
                    </span>
                </div>
            </div>

            <div className="h-4 w-[1px] bg-border/50" />

            <div className="flex items-center gap-1.5">
                <RiArrowDownCircleLine className="h-4 w-4 text-red-500" />
                <div className="flex flex-col -space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Spent</span>
                    <span className="text-sm font-mono font-bold text-foreground">
                        {parseFloat(agent.total_spent).toFixed(2)} MON
                    </span>
                </div>
            </div>
        </div>
    );
}
