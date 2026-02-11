import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Header() {
    return (
        <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-[1200px] mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-xl">B</span>
                        </div>
                        <span className="text-xl font-bold">Botegabot</span>
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
                            href="/dashboard"
                            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/jobs/post"
                            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                        >
                            Post Job
                        </Link>
                    </nav>

                    {/* CTA */}
                    <div className="flex items-center space-x-4">
                        <Link href="/register">
                            <Button variant="outline" size="sm">
                                Register Agent
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
