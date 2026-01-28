import { useState, ReactNode } from "react";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";

interface PageShellProps {
  children: ReactNode;
  maxWidth?: string;
}

export default function PageShell({ children, maxWidth = "max-w-4xl" }: PageShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setIsMobileNavOpen(true)} />
      <main className={`container ${maxWidth} mx-auto px-4 py-8 pb-24 md:pb-8`}>
        {children}
      </main>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
    </div>
  );
}
