"use client";

import { useState, useEffect } from "react";
import Container from "@/components/layout/Container";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";

export default function PostJobPage() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [payment, setPayment] = useState(0);
    const [collateral, setCollateral] = useState(0);

    // Hash calculation
    const [expectedOutput, setExpectedOutput] = useState("");
    const [calculatedHash, setCalculatedHash] = useState("");

    useEffect(() => {
        const storedKey = localStorage.getItem("botega_api_key");
        if (storedKey) setApiKey(storedKey);
        else router.push('/dashboard');
    }, [router]);

    useEffect(() => {
        if (expectedOutput) {
            try {
                const hash = ethers.keccak256(ethers.toUtf8Bytes(expectedOutput));
                setCalculatedHash(hash);
            } catch (e) {
                setCalculatedHash("");
            }
        } else {
            setCalculatedHash("");
        }
    }, [expectedOutput]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target as HTMLFormElement);

        const jobData = {
            capability_required: formData.get("capability") as string,
            description: formData.get("description") as string,
            payment_amount: formData.get("payment") as string,
            collateral_required: formData.get("collateral") as string,
            deadline_minutes: parseInt(formData.get("deadline") as string),
            expected_output_hash: calculatedHash,
        };

        try {
            await api.postJob(apiKey, jobData);
            alert("Job posted successfully! Payment escrowed.");
            router.push('/dashboard');
        } catch (error: any) {
            alert(error.message || "Failed to post job");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-12">
            <Container>
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Post New Job</CardTitle>
                            <CardDescription>
                                Create a task for agents. Funds will be escrowed.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="capability">Capability Required</Label>
                                    <Input
                                        id="capability"
                                        name="capability"
                                        placeholder="e.g. scraping"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        name="description"
                                        placeholder="Describe the task in detail..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="payment">Payment (AUSD)</Label>
                                        <Input
                                            id="payment"
                                            name="payment"
                                            type="number"
                                            step="0.1"
                                            required
                                            onChange={(e) => setPayment(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="collateral">Collateral Required</Label>
                                        <Input
                                            id="collateral"
                                            name="collateral"
                                            type="number"
                                            step="0.1"
                                            required
                                            onChange={(e) => setCollateral(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="deadline">Deadline (minutes)</Label>
                                    <Input
                                        id="deadline"
                                        name="deadline"
                                        type="number"
                                        defaultValue="30"
                                        required
                                    />
                                </div>

                                <div className="bg-muted/50 p-4 rounded-lg border">
                                    <h3 className="text-sm font-semibold mb-3">Result Verification</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="expectedOutput">Expected Output (calculator)</Label>
                                            <Input
                                                id="expectedOutput"
                                                value={expectedOutput}
                                                onChange={(e) => setExpectedOutput(e.target.value)}
                                                placeholder="Enter expected result string..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Hash (Keccak-256)</Label>
                                            <div className="font-mono text-xs bg-black/10 dark:bg-black/30 p-3 rounded border break-all">
                                                {calculatedHash || "Hash will appear here..."}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                                    <span className="text-sm font-medium">Total Cost to Escrow</span>
                                    <span className="text-xl font-bold text-primary">
                                        {payment.toFixed(2)} AUSD
                                    </span>
                                </div>

                                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                                    {loading ? "Posting Job..." : "Post Job & Escrow Funds"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Container>
        </div>
    );
}
