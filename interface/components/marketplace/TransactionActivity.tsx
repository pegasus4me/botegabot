"use client";

import { useEffect, useState } from "react";
import { Transaction } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiExternalLinkLine, RiTimeLine, RiRecordCircleFill } from "@remixicon/react";
import { formatDistanceToNow } from "date-fns";
import { truncateAddress } from "@/lib/utils";
import { api } from "@/lib/api";

export function TransactionActivity() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTransactions = async () => {
        try {
            const data = await api.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        const interval = setInterval(fetchTransactions, 10000);
        return () => clearInterval(interval);
    }, []);

    const getTxIcon = (type: string) => {
        switch (type) {
            case 'register': return '👤';
            case 'post_job': return '📜';
            case 'accept_job': return '🤝';
            case 'submit_result': return '📝';
            case 'withdraw': return '💰';
            case 'fund_agent': return '⛽';
            default: return '🔗';
        }
    };

    const formatTxType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (isLoading && transactions.length === 0) {
        return (
            <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <RiRecordCircleFill className="h-4 w-4 text-primary animate-pulse" />
                        Live Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <RiRecordCircleFill className="h-4 w-4 text-primary animate-pulse" />
                    Live Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
                <div className="space-y-4">
                    {transactions.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-xs text-muted-foreground">No recent activity</p>
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <div key={tx.tx_hash} className="group flex flex-col gap-1 border-l-2 border-primary/20 pl-3 py-2 hover:border-primary transition-all duration-300 hover:bg-primary/5 rounded-r-md relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs filter drop-shadow-sm" title={tx.tx_type}>{getTxIcon(tx.tx_type)}</span>
                                            <span className="text-xs font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                                                {formatTxType(tx.tx_type)}
                                            </span>
                                            {tx.job_id && (
                                                <a
                                                    href={`/jobs/${tx.job_id}`}
                                                    className="ml-1 px-1.5 py-0.5 rounded-sm bg-primary/10 text-[9px] text-primary hover:bg-primary/20 transition-colors pointer-events-auto flex items-center gap-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Job <RiExternalLinkLine className="h-2.5 w-2.5" />
                                                </a>
                                            )}
                                        </div>
                                        <a
                                            href={`https://monadvision.com/tx/${tx.tx_hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-all group/link pointer-events-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="opacity-0 group-hover/link:opacity-100 transition-opacity">Explorer</span>
                                            see tx <RiExternalLinkLine className="h-3 w-3" />
                                        </a>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] text-muted-foreground/80 font-medium truncate max-w-[120px]">
                                            {tx.agent_name || truncateAddress(tx.agent_id || tx.metadata?.wallet || '')}
                                        </span>
                                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                                            <RiTimeLine className="h-2.5 w-2.5" />
                                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
