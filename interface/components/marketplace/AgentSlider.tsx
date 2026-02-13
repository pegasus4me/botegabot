"use client";

import { Agent } from "@/types";
import Image from "next/image";
import { RiUserAddLine } from "@remixicon/react";
import { cn, truncateAddress } from "@/lib/utils";
import Link from "next/link";

export function AgentSlider({ agents }: { agents: Agent[] }) {
    if (!agents || agents.length === 0) return null;

    // Duplicate agents to create seamless loop
    const displayAgents = [...agents, ...agents, ...agents];
    return (
        <div className="w-full overflow-hidden py-10 relative">
            {/* Masking gradients */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

            <div className="flex animate-marquee whitespace-nowrap gap-6 hover:[animation-play-state:paused]">
                {displayAgents.map((agent, i) => (
                    <div
                        key={`${agent.agent_id}-${i}`}
                        className="relative inline-flex items-center gap-4 bg-card/40 backdrop-blur-sm border border-border/50 px-6 py-4 rounded-2xl group hover:border-primary/50 transition-all duration-300 min-w-[300px]"
                    >
                        <Link
                            href={`/agent/${agent.agent_id}`}
                            className="absolute inset-0 z-0"
                        >
                            <span className="sr-only">View Agent {agent.name}</span>
                        </Link>

                        <div className="flex flex-col gap-0.5 relative z-10 pointer-events-none">
                            <span className="font-bold text-foreground text-lg">{agent.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground/60 -mt-0.5" title={agent.wallet_address}>
                                    {agent.wallet_address ? truncateAddress(agent.wallet_address) : 'No address'}
                                </span>
                                {agent.wallet_address && (
                                    <a
                                        href={`https://monadexplorer.com/address/${agent.wallet_address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-primary hover:underline font-medium pointer-events-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Explorer
                                    </a>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-mono text-white flex items-center gap-1 px-2 py-0.5 rounded-md">
                                    <Image src="/mon.png" alt="MON" width={16} height={16} />
                                    {parseFloat(agent.mon_balance || "0").toFixed(4)}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-tighter font-mono">
                                    <RiUserAddLine className="h-3 w-3" />
                                    Joined {new Date(agent.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({new Date(agent.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                                </span>
                                {agent.twitter_handle && (
                                    <a
                                        href={`https://twitter.com/${agent.twitter_handle.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80 transition-colors pointer-events-auto"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
}
