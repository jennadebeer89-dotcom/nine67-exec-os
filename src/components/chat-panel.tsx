"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "What should I focus on this week?",
  "Which clients are most at risk, and why?",
  "Which projects are over budget?",
  "What revenue is at risk this quarter?",
  "Which teams are overloaded?",
  "Why is Helix Health high risk?",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"live" | "fallback" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const headerMode = res.headers.get("X-AI-Mode");
      if (headerMode === "live" || headerMode === "fallback") setMode(headerMode);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        }
      }
      if (!acc) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: "Sorry — I couldn't generate an answer just now." };
          return copy;
        });
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Something went wrong reaching the model." };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-10rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Ask the business</p>
            <p className="text-[11px] text-muted-foreground">Answers grounded in the live data snapshot</p>
          </div>
        </div>
        {mode && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              mode === "live"
                ? "border-primary/25 bg-accent text-accent-foreground"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {mode === "live" ? "Live · GPT-4o" : "Cached fallback"}
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {empty && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-display text-lg text-foreground">What would you like to know?</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ask about clients, projects, revenue, capacity, or risk. I&apos;ll answer from the same data the
              briefing is built on — and flag where it&apos;s messy.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} msg={m} streaming={busy && i === messages.length - 1 && m.role === "assistant"} />
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about the business…"
            className="max-h-32 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatBubble({ msg, streaming }: { msg: Msg; streaming: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          isUser ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {msg.content ? (
          <FormattedText text={msg.content} />
        ) : streaming ? (
          <span className="inline-flex gap-1">
            <Dot /> <Dot /> <Dot />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Lightweight renderer: preserves line breaks and renders • / - bullet lines. */
function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed === "") return <div key={i} className="h-1.5" />;
        if (/^[•\-*]\s/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="select-none opacity-60">•</span>
              <span>{boldify(trimmed.replace(/^[•\-*]\s/, ""))}</span>
            </div>
          );
        }
        return <p key={i}>{boldify(trimmed)}</p>;
      })}
    </div>
  );
}

function boldify(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />;
}
