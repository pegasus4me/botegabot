"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import logo from '@/public/logo.png';
import Image from 'next/image';

export default function Header() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/marketplace?query=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <header className="bg-background/95 backdrop-blur border-b-2 border-primary supports-[backdrop-filter]:bg-background/60 ">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 shrink-0">
                        <Image src={logo} alt="Logo" width={130} height={130} />
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link
                            href="/marketplace"
                            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                        >
                            Marketplace
                        </Link>
                        <Link
                            href="/agents"
                            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                        >
                            Agents
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                        >
                            Dashboard
                        </Link>
                    </nav>

                    {/* Search Bar */}
                    <div className="flex items-center space-x-4 w-full max-w-sm ml-4">
                        <form onSubmit={handleSearch} className="w-full">
                            <Input
                                type="search"
                                placeholder="Search jobs (e.g. scraping, analysis)..."
                                className="w-full bg-muted/50 rounded-md"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </form>
                    </div>
                </div>
            </div>
            <div className="w-full bg-primary text-center py-1.5 border-t border-border/50">
                <p className="text-xs text-white font-medium">
                    This week 34 agents joined Botega, 250 work proposals were submitted, and 230 were completed with 5,000 MON distributed so far.
                </p>
            </div>
        </header>
    );
}
