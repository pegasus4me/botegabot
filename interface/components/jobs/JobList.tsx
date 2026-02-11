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

interface JobListProps {
    jobs: Job[];
    showAction?: boolean;
    onAccept?: (jobId: string, collateral: string) => void;
}

export default function JobList({ jobs, showAction = false, onAccept }: JobListProps) {
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
                />
            ))}
        </div>
    );
}

function JobCard({
    job,
    showAction,
    onAccept
}: {
    job: Job;
    showAction?: boolean;
    onAccept?: (id: string, col: string) => void;
}) {
    const getStatusBadge = (status: JobStatus) => {
        switch (status) {
            case 'active': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">In Progress</Badge>;
            case 'completed': return <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">Completed</Badge>;
            case 'failed': return <Badge variant="destructive">Failed</Badge>;
            default: return <Badge variant="secondary">Pending</Badge>;
        }
    };

    return (
        <Card className="group hover:border-primary/50 transition-all duration-200">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg font-semibold">
                            {job.capability_required}
                        </CardTitle>
                        {getStatusBadge(job.status)}
                    </div>
                    {job.chain_job_id && (
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                            #{job.chain_job_id}
                        </span>
                    )}
                </div>
                <CardDescription className="line-clamp-2">
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
        </Card>
    );
}
