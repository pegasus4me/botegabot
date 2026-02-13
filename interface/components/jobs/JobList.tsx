import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Job, JobStatus } from "../../types";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
interface JobListProps {
    jobs: Job[];
    showAction?: boolean;
    onAccept?: (jobId: string, collateral: string) => void;
    onSubmit?: (jobId: string, result: any, hash: string) => void;
    onValidate?: (jobId: string, approved: boolean) => void;
}

export default function JobList({ jobs, showAction = false, onAccept, onSubmit, onValidate }: JobListProps) {
    if (jobs.length === 0) {
        return (
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <p>No jobs found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4">
            {jobs.map((job) => (
                <JobCard
                    key={job.job_id}
                    job={job}
                    showAction={showAction}
                    onAccept={onAccept}
                    onSubmit={onSubmit}
                    onValidate={onValidate}
                />
            ))}
        </div>
    );
}

// accept job function
function acceptJobTrigger(apiKey: string, jobId: string) {
    api.validateJob(apiKey, jobId, true);
}

function JobCard({
    job,
    showAction,
    onAccept,
    onSubmit,
    onValidate
}: {
    job: Job;
    showAction?: boolean;
    onAccept?: (id: string, col: string) => void;
    onSubmit?: (id: string, result: any, hash: string) => void;
    onValidate?: (id: string, approved: boolean) => void;
}) {
    const [isSubmitOpen, setIsSubmitOpen] = useState(false);
    const [resultJson, setResultJson] = useState("");
    const [resultHash, setResultHash] = useState("");

    const getStatusBadge = (status: JobStatus) => {
        switch (status) {
            case 'accepted': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">Accepted</Badge>;
            case 'active': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">In Progress</Badge>;
            case 'pending_review': return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200">Pending Review</Badge>;
            case 'completed': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">Completed</Badge>;
            case 'failed': return <Badge variant="destructive">Failed</Badge>;
            default: return <Badge variant="secondary">Pending</Badge>;
        }
    };

    const handleSubmit = () => {
        if (onSubmit && resultJson && resultHash) {
            try {
                const parsed = JSON.parse(resultJson);
                onSubmit(job.job_id, parsed, resultHash);
                setIsSubmitOpen(false);
            } catch (e) {
                alert("Invalid JSON result");
            }
        }
    };

    return (
        <Card className="group hover:border-primary/50 transition-all duration-200 overflow-hidden">
            <Link href={`/jobs/${job.job_id}`} className="block">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between group-hover:text-primary transition-colors">
                        <div className="flex items-center space-x-3">
                            <CardTitle className="text-lg font-semibold">
                                {job.title || job.capability_required}
                            </CardTitle>
                            {getStatusBadge(job.status)}
                        </div>
                        {job.chain_job_id && (
                            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                #{job.chain_job_id}
                            </span>
                        )}
                    </div>
                    <CardDescription className="line-clamp-2 mt-2">
                        {job.description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pb-3">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center text-green-600 font-medium">
                            <span className="mr-2">💰</span>
                            {formatCurrency(job.payment_amount)}
                        </div>
                        <div className="flex items-center text-yellow-600 font-medium">
                            <span className="mr-2">🔒</span>
                            {formatCurrency(job.collateral_required)} Collateral
                        </div>
                        <div className="flex items-center text-muted-foreground">
                            <span className="mr-2">⏰</span>
                            {job.deadline_minutes} mins
                        </div>
                        {(job.escrow_tx_hash || job.collateral_tx_hash || job.payment_tx_hash) && (
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Proof of Work:</span>
                                <div className="flex gap-1">
                                    {job.escrow_tx_hash && (
                                        <a
                                            href={`https://monad-testnet.socialscan.io/tx/${job.escrow_tx_hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-5 h-5 flex items-center justify-center rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors tooltip"
                                            title="View Escrow"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            📜
                                        </a>
                                    )}
                                    {job.collateral_tx_hash && (
                                        <a
                                            href={`https://monad-testnet.socialscan.io/tx/${job.collateral_tx_hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-5 h-5 flex items-center justify-center rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 transition-colors"
                                            title="View Acceptance"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            🤝
                                        </a>
                                    )}
                                    {job.payment_tx_hash && (
                                        <a
                                            href={`https://monad-testnet.socialscan.io/tx/${job.payment_tx_hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-5 h-5 flex items-center justify-center rounded bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors"
                                            title="View Payout"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            ✅
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Link>

            {job.submitted_result && (
                <CardContent className="pt-0 pb-3">
                    <div className="bg-muted/30 rounded-lg p-3 border border-muted-foreground/10">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Agent Submission
                        </div>
                        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                            {typeof job.submitted_result === 'string'
                                ? job.submitted_result
                                : JSON.stringify(job.submitted_result, null, 2)}
                        </pre>
                    </div>
                </CardContent>
            )}

            {/* Accept Job Action */}
            {showAction && job.status === 'pending' && onAccept && (
                <CardFooter className="pt-3 border-t bg-muted/20">
                    <Button
                        className="w-full sm:w-auto ml-auto"
                        onClick={() => onAccept(job.job_id, job.collateral_required)}
                    >
                        Accept Job
                    </Button>
                </CardFooter>
            )}

            {/* Submit Result Action (for active jobs where we have an onSubmit handler) */}
            {job.status === 'active' && onSubmit && (
                <CardFooter className="pt-3 border-t bg-muted/20">
                    <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto ml-auto" variant="default">
                                Submit Result
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Submit Job Result</DialogTitle>
                                <DialogDescription>
                                    Provide the JSON result and the computed hash.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Result JSON</Label>
                                    <Textarea
                                        placeholder='{"data": "..."}'
                                        value={resultJson}
                                        onChange={(e) => setResultJson(e.target.value)}
                                        className="font-mono text-xs"
                                        rows={5}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Result Hash (0x...)</Label>
                                    <Input
                                        placeholder="0x..."
                                        value={resultHash}
                                        onChange={(e) => setResultHash(e.target.value)}
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSubmit}>Submit to Chain</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            )}

            {/* Validate Job Action (for posters) */}
            {job.status === 'pending_review' && onValidate && (
                <CardFooter className="pt-3 border-t bg-muted/20 flex gap-2">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onValidate(job.job_id, false)}
                    >
                        Reject
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 ml-auto"
                        onClick={() => onValidate(job.job_id, true)}
                    >
                        Approve & Pay
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
