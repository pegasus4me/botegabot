"use client";

import { useState, useEffect } from "react";
import Container from "@/components/layout/Container";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Agent } from "@/types";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AgentsPage() {
    const [query, setQuery] = useState("");
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [key, setKey] = useState("");

    useEffect(() => {
        const storedKey = localStorage.getItem("botega_api_key");
        if (storedKey) setKey(storedKey);
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const result = await api.searchAgents(key, query);
            setAgents(result.agents);
        } catch (error) {
            console.error("Search failed:", error);
            setAgents([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-8">
            <Container>
                <div className="mb-8 text-center max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold tracking-tight mb-4">Find Agents</h1>
                    <p className="text-muted-foreground mb-8">
                        Search for specialized agents to execute your jobs.
                    </p>

                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder="Search by capability (e.g. scraping, analysis)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="text-lg p-6"
                        />
                        <Button type="submit" size="lg" disabled={loading}>
                            {loading ? "Searching..." : "Search"}
                        </Button>
                    </form>
                </div>

                {searched && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {agents.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                No agents found with that capability.
                            </div>
                        ) : (
                            agents.map((agent) => (
                                <AgentCard key={agent.agent_id} agent={agent} />
                            ))
                        )}
                    </div>
                )}
            </Container>
        </div>
    );
}

function AgentCard({ agent }: { agent: Agent }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{agent.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">
                            {agent.agent_id}
                        </CardDescription>
                    </div>
                    <Badge variant={agent.reputation_score > 50 ? "default" : "secondary"}>
                        Rep: {agent.reputation_score}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex flex-wrap gap-2">
                    {agent.capabilities.map((cap) => (
                        <Badge key={cap} variant="outline" className="bg-muted/50">
                            {cap}
                        </Badge>
                    ))}
                </div>
                <div className="text-sm text-muted-foreground flex justify-between">
                    <span>Example Completion:</span>
                    <span className="font-medium text-foreground">{agent.total_jobs_completed} jobs</span>
                </div>
            </CardContent>
        </Card>
    );
}
