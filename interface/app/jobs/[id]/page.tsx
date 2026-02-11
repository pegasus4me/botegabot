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


    const handleValidateJob = async (approved: boolean) => {
        if (!apiKey || !job) return

        try {
            await api.validateJob(apiKey, job.job_id, approved)
            alert(approved ? "Job approved and settled!" : "Job rejected.")
            // Refresh
            const data = await api.getJob(apiKey, job.job_id)
            setJob(data.job as any)
        } catch (err: any) {
            alert(`Failed to ${approved ? 'approve' : 'reject'} job: ${err.message}`)
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
    const isPendingReview = job.status === 'pending_review'
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
                                        isPendingReview ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
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
                            <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                                {job.title || job.description}
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

                        <div className="space-y-4">
                            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Job Description</Label>
                            <p className="text-xl text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {job.description}
                            </p>
                        </div>

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
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Detailed Input / Instructions</Label>
                                    <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap rounded-xl bg-muted/20 p-4 border border-border/10">
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
                                                ? "Optimistic (Any Submission)"
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
                                            <a href={`https://testnet.monadexplorer.com/tx/${(job as any).escrow_tx_hash}`} target="_blank" rel="noopener noreferrer">
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
                                                <a href={`https://testnet.monadexplorer.com/tx/${(job as any).collateral_tx_hash}`} target="_blank" rel="noopener noreferrer">
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
                                        <div className="text-center space-y-3 py-4">
                                            <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto">
                                                <RiCheckboxCircleLine className="h-6 w-6" />
                                            </div>
                                            <p className="text-sm font-bold text-green-500 uppercase tracking-widest">Verified & Paid</p>
                                            <p className="text-xs text-muted-foreground px-4 leading-relaxed">This contract has been settled. Funds were distributed to the executor.</p>
                                        </div>
                                    ) : isPendingReview ? (
                                        <div className="text-center space-y-4 py-4">
                                            <div className="h-12 w-12 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 mx-auto">
                                                <RiHourglassLine className="h-6 w-6 animate-pulse" />
                                            </div>
                                            <p className="text-sm font-bold text-orange-500 uppercase tracking-widest">Pending Review</p>
                                            <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                                                Executor has submitted work. Waiting for manual approval from poster.
                                            </p>

                                            {/* We need to know if current user is poster to show buttons */}
                                            {/* For now, I'll allow clicking and let API fail if not poster, or just show them if apiKey is set? */}
                                            {/* Use a simple improvement: Fetch `me` to check. I'll add that logic in a separate tool call to `JobDetail`. */}
                                            {/* For this chunk, I will render buttons but conditional on a new state `isPoster` which I will add next. */}
                                            {isPoster && (
                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <Button variant="outline" className="border-red-500/20 hover:bg-red-500/10 text-red-500" onClick={() => handleValidateJob(false)}>
                                                        <RiCloseLine className="mr-2 h-4 w-4" /> Reject
                                                    </Button>
                                                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleValidateJob(true)}>
                                                        <RiCheckLine className="mr-2 h-4 w-4" /> Approve
                                                    </Button>
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
