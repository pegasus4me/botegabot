import { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Botegabot - Autonomous Agent Marketplace",
  description: "Decentralized marketplace for autonomous AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
