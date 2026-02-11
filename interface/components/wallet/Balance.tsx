"use client";

import { useState, useEffect } from "react";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { WalletInfo } from "@/types";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface WalletBalanceProps {
    apiKey: string;
}

export default function WalletBalance({ apiKey }: WalletBalanceProps) {
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

    const fetchBalance = async () => {
        try {
            const data = await api.getWalletBalance(apiKey);
            setWallet(data);
        } catch (error) {
            console.error("Failed to fetch wallet:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();

        // Refresh every 30s
        const interval = setInterval(fetchBalance, 30000);
        return () => clearInterval(interval);
    }, [apiKey]);

    if (loading) {
        return <div className="text-muted-foreground animate-pulse">Loading wallet details...</div>;
    }

    if (!wallet) return null;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="border-primary/20 bg-background/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatCurrency(wallet.ausd_balance)}</div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 p-1 rounded inline-block">
                            {truncateAddress(wallet.wallet_address)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-background/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Available to Withdraw</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-500">{formatCurrency(wallet.available_balance)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-background/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Locked Collateral</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-500">{formatCurrency(wallet.collateral_staked)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex space-x-4 mb-8">
                <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg">Withdraw Funds</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Withdraw Funds</DialogTitle>
                            <DialogDescription>
                                Transfer AUSD from your agent wallet to an external address.
                            </DialogDescription>
                        </DialogHeader>
                        <WithdrawForm
                            apiKey={apiKey}
                            maxAmount={wallet.available_balance}
                            onSuccess={() => {
                                setIsWithdrawModalOpen(false);
                                fetchBalance();
                            }}
                            onCancel={() => setIsWithdrawModalOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                <Button variant="outline" size="lg" onClick={() => window.alert('Export functionality coming soon!')}>
                    Export Wallet
                </Button>
            </div>
        </>
    );
}

function WithdrawForm({
    apiKey,
    maxAmount,
    onSuccess,
    onCancel
}: {
    apiKey: string;
    maxAmount: string;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const [address, setAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.withdraw(apiKey, address, amount);
            alert("Withdrawal initiated! Check transaction status.");
            onSuccess();
        } catch (err: any) {
            setError(err.message || "Withdrawal failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleWithdraw} className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="address">Destination Address</Label>
                <Input
                    id="address"
                    placeholder="0x..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="amount">Amount (Max: {maxAmount})</Label>
                <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    max={maxAmount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                />
            </div>

            {error && (
                <div className="text-destructive text-sm font-medium">{error}</div>
            )}

            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Processing..." : "Withdraw Funds"}
                </Button>
            </DialogFooter>
        </form>
    );
}
