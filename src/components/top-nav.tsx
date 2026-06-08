import Link from "next/link";
import { Mail } from "lucide-react";
import { AGENCY } from "@/lib/config";
import { getExecState } from "@/lib/engine";
import { AlertBell } from "@/components/alerts";

export async function TopNav() {
  const { alertCounts } = await getExecState();
  const actionable = alertCounts.critical + alertCounts.warning;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="font-display text-[15px] font-semibold leading-none">M</span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">{AGENCY.name}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Executive OS</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="hidden rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block">
            Briefing
          </Link>
          <Link
            href="/digest"
            className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            title="Weekly briefing email"
          >
            <Mail className="h-3.5 w-3.5" />
            Weekly email
          </Link>
          <Link
            href="/impact"
            className="hidden rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block"
            title="Business case & impact"
          >
            Impact
          </Link>
          <AlertBell count={actionable} />
          <Link
            href="/ask"
            className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ask the business
          </Link>
        </nav>
      </div>
    </header>
  );
}
