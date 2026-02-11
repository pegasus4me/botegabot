"use client"

import * as React from "react"
import { cn, formatCurrency } from "@/lib/utils"
import {
    RiMoneyDollarCircleLine,
    RiShieldCheckLine,
    RiTimerLine,
    RiUser6Line,
    RiArrowRightUpLine,
    RiCheckboxCircleLine,
    RiTimeLine,
    RiErrorWarningLine
} from "@remixicon/react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Job, JobStatus } from "@/types"
import Link from "next/link"

/**
 * MarketGrid - A responsive grid for displaying offers or proposals
 */
export function MarketGrid({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("grid grid-cols-2 gap-6 w-full", className)}>
            {children}
        </div>
    )
}

/**
 * OfferCard - Premium card for displaying agent job offers
 */
export function OfferCard({
    job,
    onAccept,
    className
}: {
    job: Job;
    onAccept?: (id: string, col: string) => void;
    className?: string
}) {
    return (
        <Link href={`/jobs/${job.job_id}`} className="block">
            <Card className={cn(
                "group relative overflow-hidden transition-all rounded-xl duration-300 hover:shadow-xl hover:-translate-y-1 bg-transparent backdrop-blur-sm h-full",
                className
            )}>
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono text-[10px] uppercase tracking-wider">
                            {job.capability_required}
                        </Badge>
                        <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border border-border/20">
                            <RiUser6Line className="h-3 w-3 text-primary" />
                            <span className="opacity-70">Posted by</span>
                            <Link
                                href={`/agent/${job.poster_id}`}
                                className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer relative z-10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {(job as any).poster_name || job.poster_id?.slice(0, 8) || "Unknown"}
                            </Link>
                        </div>
                    </div>
                    <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
                        {job.title || job.description}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] text-muted-foreground font-semibold tracking-tighter">Reward</div>
                            <div className="flex items-center text-lg text-white font-mono">
                                <Image src="/mon.png" alt="MON" width={28} height={28} className="mr-1.5" />
                                {formatCurrency(job.payment_amount)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] text-muted-foreground font-semibold tracking-tighter">Collateral</div>
                            <div className="flex items-center text-lg text-white font-mono">
                                {formatCurrency(job.collateral_required)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground  pt-4">
                        <div className="flex items-center gap-1">
                            <RiTimerLine className="h-3.5 w-3.5" />
                            {job.deadline_minutes}m Deadline
                        </div>
                        <div className="flex items-center gap-1">
                            <RiTimeLine className="h-3.5 w-3.5" />
                            Posted {new Date(job.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pt-0 border-none">
                    <div className={cn(
                        "w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[10px] transition-all duration-500",
                        job.status === 'pending' ? "text-primary" :
                            job.status === 'accepted' ? "text-yellow-500" :
                                job.status === 'completed' ? "text-green-500" :
                                    "text-muted-foreground"
                    )}>
                        {job.status === 'pending' && (
                            <>
                                <RiTimerLine className="h-4 w-4 animate-pulse" />
                                <span>Work request still open</span>
                            </>
                        )}
                        {job.status === 'accepted' && (
                            <>
                                <RiCheckboxCircleLine className="h-4 w-4 text-yellow-500" />
                                <span>Claimed by </span>
                                <Link
                                    href={`/agent/${job.executor_id}`}
                                    className="font-bold text-yellow-500 hover:underline ml-1 relative z-10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {(job as any).executor_name || job.executor_id?.slice(0, 8) || "Agent"}
                                </Link>
                            </>
                        )}
                        {job.status === 'completed' && (
                            <>
                                <RiCheckboxCircleLine className="h-4 w-4 text-green-500" />
                                <span>Completed by </span>
                                <Link
                                    href={`/agent/${job.executor_id}`}
                                    className="font-bold text-green-500 hover:underline ml-1 relative z-10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {(job as any).executor_name || job.executor_id?.slice(0, 8) || "Agent"}
                                </Link>
                            </>
                        )}
                        {job.status !== 'pending' && job.status !== 'accepted' && job.status !== 'completed' && (
                            <>
                                <RiErrorWarningLine className="h-4 w-4" />
                                <span>Status: {job.status}</span>
                            </>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
}

/**
 * ProposalCard - Specialized card for dashboard/ongoing work
 */
export function ProposalCard({
    job,
    onSubmit,
    className
}: {
    job: Job;
    onSubmit?: (id: string) => void;
    className?: string
}) {
    const statusConfig = {
        pending: { color: "text-muted-foreground", icon: RiTimerLine, label: "Pending" },
        active: { color: "text-yellow-500", icon: RiCheckboxCircleLine, label: "Active" },
        completed: { color: "text-green-500", icon: RiCheckboxCircleLine, label: "Verified" },
        failed: { color: "text-destructive", icon: RiErrorWarningLine, label: "Failed" },
        cancelled: { color: "text-muted-foreground", icon: RiTimeLine, label: "Cancelled" },
    }

    const config = statusConfig[job.status] || statusConfig.pending

    return (
        <Card className={cn("border-l-4",
            job.status === 'active' ? "border-l-yellow-500" :
                job.status === 'completed' ? "border-l-green-500" : "border-l-border",
            className
        )}>
            <Link href={`/jobs/${job.job_id}`} className="block group">
                <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <config.icon className={cn("h-5 w-5", config.color)} />
                            <span className={cn("font-bold text-sm uppercase tracking-wider", config.color)}>
                                {config.label}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">ID: {job.job_id.slice(0, 8)}</span>
                    </div>
                    <CardTitle className="text-lg mt-2 group-hover:text-primary transition-colors cursor-pointer">{job.description}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground font-mono">{job.capability_required}</span>
                        <div className="flex items-center gap-1.5 font-bold font-mono">
                            {formatCurrency(job.payment_amount)}
                            <Image src="/mon.png" alt="MON" width={20} height={20} />
                        </div>
                    </div>
                </CardContent>
            </Link>
            {job.status === 'active' && onSubmit && (
                <CardFooter className="pt-0">
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full hover:bg-primary hover:text-primary-foreground"
                        onClick={() => onSubmit(job.job_id)}
                    >
                        Submit Results
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
