"use client";

import { useState } from "react";
import Link from "next/link";
import { CHECKIN_THEMES } from "@/lib/constants";
import type { CheckinTheme } from "@/lib/types";

const MOODS = [
  { value: 1, emoji: "😞", label: "Struggling" },
  { value: 2, emoji: "😕", label: "A bit low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

type Stage = "checkin" | "loading-prompt" | "writing" | "saving" | "reflection";

interface Reflection {
  text: string;
  followUpQuestion: string;
  conceptName: string;
  conceptSlug: string | null;
}

/** Render the prompt's **bold concept** without a markdown dependency. */
function PromptText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p className="leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-navy-900">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export default function JournalPage() {
  const [stage, setStage] = useState<Stage>("checkin");
  const [mood, setMood] = useState<number | null>(null);
  const [theme, setTheme] = useState<CheckinTheme | null>(null);
  const [moodCheckinId, setMoodCheckinId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [entryText, setEntryText] = useState("");
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [isPaid, setIsPaid] = useState(true);
  const [error, setError] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpBusy, setFollowUpBusy] = useState(false);

  async function startSession() {
    setStage("loading-prompt");
    setError("");
    try {
      if (mood !== null) {
        const checkinRes = await fetch("/api/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood, theme }),
        });
        if (checkinRes.ok) {
          const { id } = await checkinRes.json();
          setMoodCheckinId(id);
        }
      }

      const res = await fetch("/api/journal/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, theme }),
      });
      if (!res.ok) throw new Error("prompt failed");
      const data = await res.json();
      setPrompt(data.promptText);
      setStage("writing");
    } catch {
      // Never block writing on the AI: fall through with no prompt.
      setPrompt(null);
      setStage("writing");
    }
  }

  async function submitEntry() {
    if (!entryText.trim()) return;
    setStage("saving");
    setError("");
    try {
      const res = await fetch("/api/journal/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryText,
          promptText: prompt,
          moodCheckinId,
          theme,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setError(data.message ?? "Free limit reached.");
        setStage("writing");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "save failed");
      setReflection(data.reflection);
      setIsPaid(data.paid);
      setStage("reflection");
    } catch {
      setError("Couldn't save your entry — please try again.");
      setStage("writing");
    }
  }

  async function askFollowUp() {
    if (!followUp.trim() || !reflection) return;
    setFollowUpBusy(true);
    try {
      const res = await fetch("/api/journal/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: followUp,
          conceptName: reflection.conceptName,
        }),
      });
      const data = await res.json();
      setFollowUpAnswer(res.ok ? data.answer : data.message ?? "Not available.");
    } finally {
      setFollowUpBusy(false);
    }
  }

  if (stage === "checkin") {
    return (
      <main className="space-y-8">
        <header>
          <h1 className="text-2xl font-semibold text-navy-900">
            How are you arriving today?
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            This helps shape your prompt. There&apos;s no wrong answer.
          </p>
        </header>

        <section>
          <div className="flex justify-between gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3 transition-colors ${
                  mood === m.value
                    ? "border-navy-600 bg-navy-50"
                    : "border-navy-100 bg-white hover:bg-navy-50/50"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-ink-soft">{m.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-ink-soft">
            Anything on your mind? <span className="font-normal">(optional)</span>
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHECKIN_THEMES.map((t) => (
              <button
                key={t}
                onClick={() => setTheme(theme === t ? null : t)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  theme === t
                    ? "border-navy-600 bg-navy-900 text-white"
                    : "border-navy-100 bg-white text-ink hover:bg-navy-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={startSession}
          className="w-full rounded-xl bg-navy-900 px-4 py-3.5 font-medium text-white hover:bg-navy-800 transition-colors"
        >
          Get my prompt
        </button>
      </main>
    );
  }

  if (stage === "loading-prompt") {
    return (
      <main className="flex flex-col items-center justify-center py-24 text-center">
        <p className="animate-pulse text-ink-soft">
          Finding the right question for you…
        </p>
      </main>
    );
  }

  if (stage === "writing" || stage === "saving") {
    return (
      <main className="flex min-h-[70vh] flex-col">
        {prompt && (
          <div className="rounded-2xl border border-navy-100 bg-white p-4 text-[15px] text-ink">
            <PromptText text={prompt} />
          </div>
        )}
        <textarea
          autoFocus
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          placeholder="Write freely. No minimum, no maximum — this is just for you."
          className="journal-surface mt-4 w-full flex-1 resize-none rounded-2xl border border-navy-100 bg-white p-5 text-ink outline-none focus:border-navy-600"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={submitEntry}
          disabled={stage === "saving" || !entryText.trim()}
          className="mt-4 w-full rounded-xl bg-navy-900 px-4 py-3.5 font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
        >
          {stage === "saving" ? "Reflecting…" : "Finish entry"}
        </button>
      </main>
    );
  }

  // stage === "reflection"
  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-navy-900">Entry saved</h1>
      </header>

      {reflection ? (
        <section className="rounded-2xl border border-amber-100 bg-amber-100/40 p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-600">
            A reflection
          </p>
          <p className="mt-2 leading-relaxed text-ink">{reflection.text}</p>
          <p className="mt-3 text-sm italic text-ink-soft">
            {reflection.followUpQuestion}
          </p>
          {reflection.conceptSlug && (
            <Link
              href={`/concepts/${reflection.conceptSlug}`}
              className="mt-3 inline-block text-sm font-medium text-navy-700 underline"
            >
              Learn more about {reflection.conceptName} →
            </Link>
          )}
        </section>
      ) : !isPaid ? (
        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <p className="text-sm text-ink-soft">
            Your entry is saved. AI reflections are part of the full insight
            layer —{" "}
            <Link href="/settings" className="font-medium text-navy-700 underline">
              upgrade to unlock them
            </Link>
            .
          </p>
        </section>
      ) : null}

      {reflection && (
        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-sm font-medium text-navy-900">
            Curious about {reflection.conceptName}?
          </h2>
          <div className="mt-3 flex gap-2">
            <input
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="Ask a follow-up question…"
              className="flex-1 rounded-xl border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-600"
            />
            <button
              onClick={askFollowUp}
              disabled={followUpBusy || !followUp.trim()}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {followUpBusy ? "…" : "Ask"}
            </button>
          </div>
          {followUpAnswer && (
            <p className="mt-3 text-sm leading-relaxed text-ink">
              {followUpAnswer}
            </p>
          )}
        </section>
      )}

      <Link
        href="/home"
        className="inline-block rounded-full border border-navy-100 bg-white px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50 transition-colors"
      >
        Back to home
      </Link>
    </main>
  );
}
