"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";

const TOTAL_STEPS = 4;

function MoodIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" strokeLinecap="round" />
      <circle cx="9" cy="10" r="0.5" fill="currentColor" />
      <circle cx="15" cy="10" r="0.5" fill="currentColor" />
    </svg>
  );
}

function PromptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
      <path d="M10 20h4" strokeLinecap="round" />
    </svg>
  );
}

function WriteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4 11.5-11.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function StepCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="flex items-start gap-4 rounded-2xl border border-navy-100 bg-white p-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-900">
        {icon}
      </span>
      <span>
        <span className="block font-medium text-navy-900">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{text}</span>
      </span>
    </li>
  );
}

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  async function finish(dest: string) {
    setBusy(true);
    const supabase = createClient();
    // If this fails (e.g. offline), the user just sees onboarding once more.
    await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    // Full navigation so the server layout re-reads the fresh user metadata.
    window.location.assign(dest);
  }

  const screens = [
    // 1 — Welcome
    <div key="welcome">
      <h1 className="text-2xl font-semibold text-navy-900">
        Welcome to {APP_NAME}
      </h1>
      <p className="mt-4 leading-relaxed text-ink-soft">
        {APP_NAME} is your personal psychology companion, built on the writing
        of David Webb — creator of All About Psychology, one of the world&apos;s
        most visited psychology websites. It&apos;s a quiet place to check in
        with yourself, write, and understand your own mind a little better.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        {APP_NAME} is a tool for self-understanding and reflection. It is not a
        therapy service, and it doesn&apos;t replace professional support.
      </p>
    </div>,

    // 2 — How it works
    <div key="how">
      <h1 className="text-2xl font-semibold text-navy-900">
        How {APP_NAME} works
      </h1>
      <ul className="mt-6 space-y-3">
        <StepCard
          icon={<MoodIcon />}
          title="Check in with your mood"
          text="A quick, gentle check-in — no streaks, no scores."
        />
        <StepCard
          icon={<PromptIcon />}
          title="Receive a prompt grounded in real psychology"
          text="Drawn from published writing, matched to how you're feeling."
        />
        <StepCard
          icon={<WriteIcon />}
          title="Write freely and receive a reflection back"
          text="Your words stay private. The reflection helps you see patterns."
        />
      </ul>
    </div>,

    // 3 — Knowledge base
    <div key="knowledge">
      <h1 className="text-2xl font-semibold text-navy-900">
        Grounded in real psychology
      </h1>
      <p className="mt-4 leading-relaxed text-ink-soft">
        Every prompt, concept, and insight in {APP_NAME} is drawn from 18 years
        of David Webb&apos;s published content across All About Psychology —
        real psychological ideas with real sources, not generic wellness
        advice.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        Explore the original writing any time:
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        <li>
          <a
            href="https://allaboutpsychology.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-navy-700 underline"
          >
            allaboutpsychology.substack.com
          </a>
        </li>
        <li>
          <a
            href="https://www.all-about-psychology.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-navy-700 underline"
          >
            all-about-psychology.com
          </a>
        </li>
      </ul>
    </div>,

    // 4 — Get started
    <div key="ready" className="text-center">
      <h1 className="text-2xl font-semibold text-navy-900">
        You&apos;re ready
      </h1>
      <p className="mt-3 text-ink-soft">
        A few quiet minutes is all it takes.
      </p>
      <button
        onClick={() => finish("/journal")}
        disabled={busy}
        className="mt-8 w-full rounded-full bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
      >
        Start your first journal entry
      </button>
      <button
        onClick={() => finish("/concepts")}
        disabled={busy}
        className="mt-4 text-sm font-medium text-navy-700 underline disabled:opacity-50"
      >
        Browse the concepts library
      </button>
    </div>,
  ];

  return (
    <main className="flex min-h-screen flex-col bg-paper-warm">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-12">
        <div className="flex flex-1 flex-col justify-center">{screens[step]}</div>

        <div className="mt-10 flex items-center justify-between">
          <div className="flex gap-2" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-navy-900" : "w-2 bg-navy-100"
                }`}
              />
            ))}
          </div>
          {step < TOTAL_STEPS - 1 && (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-navy-800 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
