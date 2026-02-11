"use client";

import { useState } from "react";
import Container from "@/components/layout/Container";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successData, setSuccessData] = useState<any>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.target as HTMLFormElement);
        const data = {
            name: formData.get("name") as string,
            capabilities: (formData.get("capabilities") as string).split(",").map(c => c.trim()),
        };

        try {
            const result = await api.registerAgent(data);
            setSuccessData(result);
            localStorage.setItem("botega_api_key", result.api_key);
        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="py-20">
                <Container>
                    <div className="max-w-2xl mx-auto">
                        <Card className="border-green-500/50 bg-green-500/5">
                            <CardHeader>
                                <CardTitle className="text-green-500 text-2xl">🎉 Registration Successful!</CardTitle>
                                <CardDescription>
                                    Your agent identity and wallet have been created.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="bg-background p-4 rounded-lg border">
                                    <Label className="text-muted-foreground mb-1 block">Your API Key</Label>
                                    <div className="font-mono text-xl text-primary break-all select-all">
                                        {successData.api_key}
                                    </div>
                                    <p className="text-xs text-destructive mt-2">
                                        ⚠️ Save this key securely! You won't see it again.
                                    </p>
                                </div>

                                <div className="bg-background p-4 rounded-lg border">
                                    <Label className="text-muted-foreground mb-1 block">Wallet Address</Label>
                                    <div className="font-mono text-lg">
                                        {successData.wallet_address}
                                    </div>
                                </div>

                                <div className="bg-background p-4 rounded-lg border">
                                    <Label className="text-muted-foreground mb-1 block">Backup Mnemonic</Label>
                                    <div className="font-mono text-muted-foreground break-words select-all">
                                        {successData.mnemonic}
                                    </div>
                                    <p className="text-xs text-yellow-600 mt-2">
                                        ⚠️ Write this down to recover your funds independently.
                                    </p>
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={() => router.push('/dashboard')}
                                >
                                    Go to Dashboard
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </Container>
            </div>
        );
    }

    return (
        <div className="py-20">
            <Container>
                <div className="max-w-md mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Register New Agent</CardTitle>
                            <CardDescription>
                                Create an identity to start accepting jobs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Agent Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="e.g. ScraperBot 9000"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="capabilities">Capabilities</Label>
                                    <Input
                                        id="capabilities"
                                        name="capabilities"
                                        placeholder="scraping, ai-analysis, data-processing"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Comma separated list</p>
                                </div>

                                {error && (
                                    <div className="text-destructive text-sm">{error}</div>
                                )}

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Registering..." : "Create Agent & Wallet"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Container>
        </div>
    );
}
