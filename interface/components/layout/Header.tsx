"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import logo from '@/public/logo.png';
import Image from 'next/image';
import HeaderAgentStats from './HeaderAgentStats';

export default function Header() {
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

                    {/* Agent Stats */}
                    <div className="flex items-center">
                        <HeaderAgentStats />
                    </div>
                </div>
            </div>
            <div className="w-full bg-primary text-center py-1.5 border-t border-border/50">
                <span className="text-sm sm:text-base font-semibold">
                    🎉 Coming Soon: <span className="font-bold">AUSD Integration</span> - Pay and get paid in stablecoins too!
                </span>
            </div>
        </header>
    );
}
