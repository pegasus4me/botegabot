"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Job } from "@/types"
import { cn, formatCurrency, truncateAddress } from "@/lib/utils"
import {
    RiMoneyDollarCircleLine,
    RiShieldCheckLine,
    RiTimerLine,
    RiUser6Line,
    RiCheckboxCircleLine,
    RiTimeLine,
    RiErrorWarningLine,
    RiArrowLeftLine,
    RiExternalLinkLine,
    RiTerminalBoxLine,
    RiInformationLine,
    RiCheckLine,
    RiCloseLine,
    RiHourglassLine
} from "@remixicon/react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

const DescriptionFormatter = ({ text }: { text: string }) => {
    if (!text) return null;

    // Detect JSON pattern { ... }
    const parts = text.split(/(\{[\s\S]*\})/g);

    return (
        <div className="space-y-4">
            {parts.map((part, i) => {
                if (part.startsWith('{') && part.endsWith('}')) {
                    try {
                        // Validate it is indeed JSON
                        const json = JSON.parse(part);
                        return (
                            <div key={i} className="relative group">
                                <div className="absolute -top-3 left-4 bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border/50 z-10">
                                    Expected JSON Schema
                                </div>
                                <pre className="p-6 bg-black/60 rounded-2xl border border-primary/20 font-mono text-sm overflow-x-auto text-primary/90 shadow-2xl backdrop-blur-md">
                                    {JSON.stringify(json, null, 2)}
                                </pre>
                            </div>
                        );
                    } catch (e) {
                        // Fallback to text if parsing fails
                        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
                    }
                }
                return <span key={i} className="whitespace-pre-wrap leading-relaxed block text-foreground/80">{part}</span>;
            })}
        </div>
    );
};

export default function JobDetailPage() {
    const params = useParams()
    const router = useRouter()
    const jobId = params.id as string

    const [job, setJob] = React.useState<Job | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [accepting, setAccepting] = React.useState(false)
    const [apiKey, setApiKey] = React.useState<string | null>(null)
    const [currentAgentId, setCurrentAgentId] = React.useState<string | null>(null)
    const [rated, setRated] = React.useState(false)

    React.useEffect(() => {
        const key = typeof window !== 'undefined' ? localStorage.getItem('botega_api_key') : null
        setApiKey(key)

        const fetchJob = async () => {
            try {
                const data = await api.getJob(key, jobId)
                setJob(data.job as any)
            } catch (err: any) {
                console.error("Failed to fetch job:", err)
                if (err.status === 401) {
                    setError("Please register or login to view job details.")
                } else {
                    setError(err.message || "Failed to load job details")
                }
            } finally {
                setLoading(false)
            }
        }

        if (jobId) {
            fetchJob()
        }

        if (key) {
            api.getProfile(key).then(agent => setCurrentAgentId(agent.agent_id)).catch(console.error)
        }
    }, [jobId])

    const handleAcceptJob = async () => {
        if (!apiKey || !job) return

        setAccepting(true)
        try {
            await api.acceptJob(apiKey, job.job_id, job.collateral_required)
            alert("Job accepted successfully!")
            router.push('/dashboard')
        } catch (err: any) {
            alert(`Failed to accept job: ${err.message}`)
        } finally {
            setAccepting(false)
        }
    }


    const handleRateJob = async (rating: 'positive' | 'negative') => {
        if (!apiKey || !job) return

        try {
            await api.rateJob(apiKey, job.job_id, rating)
            setRated(true)
            if (rating === 'negative') {
                alert("Report submitted. Agent reputation has been slashed.")
            } else {
                alert("Thank you for your feedback!")
            }
        } catch (err: any) {
            alert(`Failed to submit rating: ${err.message}`)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="space-y-4 text-center">
                    <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground animate-pulse font-mono uppercase tracking-widest text-xs">Accessing Escrow Data...</p>
                </div>
            </div>
        )
    }

    if (error || !job) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
                    <CardHeader className="text-center">
                        <RiErrorWarningLine className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <CardTitle className="text-destructive">Access Denied</CardTitle>
                        <CardDescription>{error || "Job not found in the registry."}</CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button variant="outline" onClick={() => router.push('/')}>Return to Marketplace</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const isPending = job.status === 'pending'
    const isAccepted = job.status === 'accepted'
    const isCompleted = job.status === 'completed'
    const isPoster = currentAgentId && job.poster_id === currentAgentId


    return (
        <div className="min-h-screen bg-background pb-20 pt-10 px-4">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Navigation & Status Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="w-fit text-muted-foreground hover:text-foreground -ml-2"
                    >
                        <RiArrowLeftLine className="mr-2 h-4 w-4" />
                        Back to Marketplace
                    </Button>

                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn(
                            "px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-widest",
                            isPending ? "bg-primary/10 text-primary border-primary/20" :
                                isAccepted ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                                    isCompleted ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                        "bg-muted text-muted-foreground"
                        )}>
                            {job.status}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">ID: {job.job_id}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                                {job.title || "Autonomous Work Proposal"}
                            </h1>
                            <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/20">
                                    <RiUser6Line className="h-4 w-4 text-primary" />
                                    <span className="opacity-70">Posted by</span>
                                    <span className="font-bold text-foreground">{(job as any).poster_name || job.poster_id?.slice(0, 8)}</span>
                                </div>
                                {job.executor_id && (
                                    <div className="flex items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/20">
                                        <RiCheckboxCircleLine className="h-4 w-4 text-green-500" />
                                        <span className="opacity-70">Claimed by</span>
                                        <span className="font-bold text-foreground">{(job as any).executor_name || job.executor_id?.slice(0, 8)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 bg-card/20 p-8 rounded-3xl border border-border/50 relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <RiInformationLine className="h-32 w-32 -mr-16 -mt-16" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest text-primary font-bold">Project Brief & Objectives</Label>
                                <DescriptionFormatter text={job.description} />
                            </div>
                        </div>

                        {/* COMPLETED RESULT SECTION */}
                        {isCompleted && (job as any).submitted_result && (
                            <Card className="bg-green-500/5 border-green-500/20">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                                        <RiCheckboxCircleLine className="h-5 w-5" />
                                        Autonomous Submission
                                    </CardTitle>
                                    <CardDescription>
                                        The agent has securely submitted the following result on-chain.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-foreground/90 font-mono text-sm whitespace-pre-wrap rounded-2xl bg-black/40 p-6 border border-green-500/20 shadow-inner overflow-x-auto">
                                        {typeof (job as any).submitted_result === 'string'
                                            ? (job as any).submitted_result
                                            : JSON.stringify((job as any).submitted_result, null, 2)}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <RiInformationLine className="h-5 w-5 text-primary" />
                                    Technical Requirements
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Target Capability</Label>
                                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 font-mono text-primary font-bold">
                                        {job.capability_required}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest text-primary font-bold">Detailed Input / Instructions</Label>
                                    <div className="text-foreground/80 leading-relaxed font-mono text-sm whitespace-pre-wrap rounded-2xl bg-black/40 p-6 border border-border/20 shadow-inner">
                                        {typeof job.requirements === 'string' ? job.requirements : JSON.stringify(job.requirements, null, 2)}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/40">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Verification Mode</Label>
                                        <div className={cn(
                                            "p-3 rounded-xl border font-mono text-[10px] break-all",
                                            (!job.expected_output_hash || job.expected_output_hash === '0x')
                                                ? "bg-primary/5 border-primary/20 text-primary uppercase tracking-tighter"
                                                : "bg-black/40 border-border/20 text-secondary"
                                        )}>
                                            {(!job.expected_output_hash || job.expected_output_hash === '0x')
                                                ? "Optimistic (Pay First, Rate Later)"
                                                : job.expected_output_hash}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Deadline Constraints</Label>
                                        <div className="p-3 bg-muted/30 rounded-xl border border-border/20 flex items-center justify-between">
                                            <span className="text-sm font-medium">{job.deadline_minutes} Minutes</span>
                                            <RiTimerLine className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* On-chain context */}
                        {(job as any).escrow_tx_hash && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Blockchain Transactions</h3>
                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border border-border/40 group hover:border-primary/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                                <RiTerminalBoxLine className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-foreground">Escrow Creation</p>
                                                <p className="text-[10px] font-mono text-muted-foreground">{truncateAddress((job as any).escrow_tx_hash)}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" asChild>
                                            <a href={`https://monadvision.com/tx/${(job as any).escrow_tx_hash}`} target="_blank" rel="noopener noreferrer">
                                                <RiExternalLinkLine className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                    {(job as any).collateral_tx_hash && (
                                        <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border border-border/40 group hover:border-primary/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
                                                    <RiShieldCheckLine className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">Agent Stake (Collateral)</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground">{truncateAddress((job as any).collateral_tx_hash)}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href={`https://monadvision.com/tx/${(job as any).collateral_tx_hash}`} target="_blank" rel="noopener noreferrer">
                                                    <RiExternalLinkLine className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                    {(job as any).payment_tx_hash && (
                                        <div className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border border-border/40 group hover:border-primary/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                                                    <RiMoneyDollarCircleLine className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">Payment Settlement</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground">{truncateAddress((job as any).payment_tx_hash)}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" asChild>
                                                <a href={`https://monadvision.com/tx/${(job as any).payment_tx_hash}`} target="_blank" rel="noopener noreferrer">
                                                    <RiExternalLinkLine className="h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Actions Area */}
                    <div className="space-y-6">
                        <Card className="bg-primary/5 border-primary/20 sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-sm uppercase tracking-widest font-bold text-muted-foreground">Economic Terms</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground font-semibold tracking-tighter">Reward Amount</div>
                                    <div className="flex items-center text-4xl font-extrabold text-white font-mono tracking-tighter">
                                        <Image src="/mon.png" alt="MON" width={32} height={32} className="mr-2" />
                                        {formatCurrency(job.payment_amount)}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground opacity-70">
                                        {(!job.expected_output_hash || job.expected_output_hash === '0x')
                                            ? "Paid instantly upon submission"
                                            : "Paid upon successful hash verification"}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[10px] text-muted-foreground font-semibold tracking-tighter">Required Collateral</div>
                                    <div className="flex items-center text-2xl font-bold text-white font-mono tracking-tight">
                                        {formatCurrency(job.collateral_required)}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground opacity-70 italic leading-tight">
                                        {(!job.expected_output_hash || job.expected_output_hash === '0x')
                                            ? "Slashed only if job is not completed"
                                            : "Slashed if output hash mismatch or timeout"}
                                    </p>
                                </div>

                                <Separator className="bg-primary/10" />

                                <div className="space-y-4">
                                    {isPending ? (
                                        <>
                                            <Button
                                                className="w-full rounded-2xl py-8 text-xl font-bold transition-all hover:scale-[1.02] shadow-xl shadow-primary/20"
                                                onClick={handleAcceptJob}
                                                disabled={accepting}
                                            >
                                                {accepting ? "Staking MON..." : "Accept & Start Work"}
                                            </Button>
                                            <p className="text-[10px] text-center text-muted-foreground px-4">
                                                By accepting, your agent will stake <span className="text-foreground font-bold">{job.collateral_required} MON</span> as guarantee.
                                            </p>
                                        </>
                                    ) : isAccepted ? (
                                        <div className="text-center space-y-3 py-4">
                                            <div className="h-12 w-12 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mx-auto">
                                                <RiTimeLine className="h-6 w-6 animate-pulse" />
                                            </div>
                                            <p className="text-sm font-bold text-yellow-500 uppercase tracking-widest">In Progress</p>
                                            <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                                                {(!job.expected_output_hash || job.expected_output_hash === '0x')
                                                    ? "Agent is currently processing. Any valid result will be accepted."
                                                    : "Agent is currently processing the data to generate the objective output."}
                                            </p>
                                        </div>
                                    ) : isCompleted ? (
                                        <div className="text-center space-y-4 py-4">
                                            <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto">
                                                <RiCheckboxCircleLine className="h-6 w-6" />
                                            </div>
                                            <p className="text-sm font-bold text-green-500 uppercase tracking-widest">
                                                {(job as any).payment_tx_hash ? "Verified & Paid" : "Settlement Initiated"}
                                            </p>
                                            <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                                                {(job as any).payment_tx_hash
                                                    ? "Funds were distributed to the executor."
                                                    : "Settlement transaction is confirming on-chain..."}
                                            </p>

                                            {(job as any).payment_tx_hash && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs border-green-500/20 text-green-600 bg-green-500/5" asChild>
                                                    <a href={`https://monadvision.com/tx/${(job as any).payment_tx_hash}`} target="_blank" rel="noopener noreferrer">
                                                        View Proof <RiExternalLinkLine className="ml-1 h-3 w-3" />
                                                    </a>
                                                </Button>
                                            )}

                                            {isPoster && !rated && (
                                                <div className="pt-4 border-t border-border/20">
                                                    <p className="text-[10px] font-bold text-muted-foreground mb-2">WAS THIS WORK SATISFACTORY?</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-500/10 border-red-500/20" onClick={() => handleRateJob('negative')}>
                                                            <RiCloseLine className="mr-1 h-3 w-3" /> Report
                                                        </Button>
                                                        <Button variant="outline" size="sm" className="text-green-500 hover:bg-green-500/10 border-green-500/20" onClick={() => handleRateJob('positive')}>
                                                            <RiCheckLine className="mr-1 h-3 w-3" /> Satisfied
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-3 py-4 opacity-50">
                                            <RiErrorWarningLine className="h-6 w-6 mx-auto" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Status: {job.status}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
