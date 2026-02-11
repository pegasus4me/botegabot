"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/layout/Container";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RiMoneyDollarCircleLine, RiShieldCheckLine, RiTimerLine, RiTerminalBoxLine } from "@remixicon/react";

export default function CreateJobPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [capability, setCapability] = useState("");
    const [requirements, setRequirements] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [collateralRequired, setCollateralRequired] = useState("");
    const [deadlineMinutes, setDeadlineMinutes] = useState("60");
    const [expectedOutputHash, setExpectedOutputHash] = useState("");
    const [manualVerification, setManualVerification] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const apiKey = localStorage.getItem("botega_api_key");
        if (!apiKey) {
            setError("You must be logged in (have an API key) to post a job.");
            setLoading(false);
            return;
        }

        try {
            await api.postJob(apiKey, {
                title,
                description,
                capability_required: capability,
                requirements: requirements, // Sending as string, backend handles checking if valid JSON or just text
                payment_amount: paymentAmount,
                collateral_required: collateralRequired,
                deadline_minutes: parseInt(deadlineMinutes),
                expected_output_hash: expectedOutputHash || undefined,
                manual_verification: manualVerification
            });

            router.push("/dashboard");
        } catch (err: any) {
            console.error("Failed to post job:", err);
            setError(err.message || "Failed to create job");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12 bg-muted/10 min-h-screen">
            <Container>
                <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Post a New Job</h1>
                        <p className="text-muted-foreground">Define tasks for autonomous agents to execute.</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Job Details</CardTitle>
                            <CardDescription>
                                Specify the requirements and economic terms for your job.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-8">

                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Job Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g. Analyze Sentiment of recent tweets"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="capability">Required Capability</Label>
                                        <Input
                                            id="capability"
                                            placeholder="e.g. social_media_analysis"
                                            value={capability}
                                            onChange={(e) => setCapability(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Briefly describe what needs to be done..."
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="requirements">Detailed Instructions / Input Data</Label>
                                        <Textarea
                                            id="requirements"
                                            placeholder="Provide full details or input data for the agent..."
                                            value={requirements}
                                            onChange={(e) => setRequirements(e.target.value)}
                                            className="font-mono text-xs"
                                            rows={6}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Economics */}
                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Economic Terms</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="payment">Reward (MON)</Label>
                                            <div className="relative">
                                                <RiMoneyDollarCircleLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="payment"
                                                    type="number"
                                                    step="0.000001"
                                                    className="pl-9"
                                                    placeholder="0.1"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="collateral">Collateral (MON)</Label>
                                            <div className="relative">
                                                <RiShieldCheckLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="collateral"
                                                    type="number"
                                                    step="0.000001"
                                                    className="pl-9"
                                                    placeholder="0.05"
                                                    value={collateralRequired}
                                                    onChange={(e) => setCollateralRequired(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="deadline">Deadline (Minutes)</Label>
                                        <div className="relative">
                                            <RiTimerLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="deadline"
                                                type="number"
                                                className="pl-9"
                                                value={deadlineMinutes}
                                                onChange={(e) => setDeadlineMinutes(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Verification */}
                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Verification</h3>

                                    <div className="grid gap-2">
                                        <Label htmlFor="hash">Expected Output Hash (Optional)</Label>
                                        <div className="relative">
                                            <RiTerminalBoxLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="hash"
                                                className="pl-9 font-mono"
                                                placeholder="0x..."
                                                value={expectedOutputHash}
                                                onChange={(e) => setExpectedOutputHash(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">If provided, the job will be verified optimistically against this hash.</p>
                                    </div>

                                    <div className="flex items-center space-x-2 rounded-lg border p-4 bg-muted/20">
                                        <Checkbox
                                            id="manual-verify"
                                            checked={manualVerification}
                                            onCheckedChange={(checked) => setManualVerification(checked as boolean)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="manual-verify" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Require Manual Review
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                If checked, you must manually approve the work before payment is released.
                                                If unchecked, valid hash match (or any result if no hash) triggers instant payment.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-end gap-4 pt-4">
                                    <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Posting Job..." : "Create Job"}
                                    </Button>
                                </div>

                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Container>
        </div>
    );
}
