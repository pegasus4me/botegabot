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
import { Job, JobStatus } from "@/types";
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

interface JobListProps {
    jobs: Job[];
    showAction?: boolean;
    onAccept?: (jobId: string, collateral: string) => void;
    onSubmit?: (jobId: string, result: any, hash: string) => void;
}

export default function JobList({ jobs, showAction = false, onAccept, onSubmit }: JobListProps) {
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
                />
            ))}
        </div>
    );
}

function JobCard({
    job,
    showAction,
    onAccept,
    onSubmit
}: {
    job: Job;
    showAction?: boolean;
    onAccept?: (id: string, col: string) => void;
    onSubmit?: (id: string, result: any, hash: string) => void;
}) {
    const [isSubmitOpen, setIsSubmitOpen] = useState(false);
    const [resultJson, setResultJson] = useState("");
    const [resultHash, setResultHash] = useState("");

    const getStatusBadge = (status: JobStatus) => {
        switch (status) {
            case 'accepted': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">Accepted</Badge>;
            case 'active': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">In Progress</Badge>;
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
                    <div className="flex items-center space-x-6 text-sm">
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
                    </div>
                </CardContent>
            </Link>

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
        </Card>
    );
}
