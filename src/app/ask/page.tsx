import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";

export const metadata = { title: "Ask the business · Meridian Executive OS" };

export default function AskPage() {
  return (
    <div className="reveal mx-auto max-w-4xl px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to briefing
      </Link>
      <div className="mt-4 mb-5">
        <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Ask the business</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          A conversational read on the whole operation. Every answer is grounded in the same data the briefing is
          built on — including where that data is messy.
        </p>
      </div>
      <ChatPanel />
    </div>
  );
}
