"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    const supabase = createClient();
    const next = searchParams.get("next") ?? "/home";
    // The email template links to /auth/confirm itself (token_hash flow);
    // this URL is passed through as {{ .RedirectTo }} so the confirm route
    // knows where to land after sign-in. It must be in the Supabase
    // redirect URL allow-list.
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${next.startsWith("/") ? next : "/home"}`,
      },
    });

    if (authError) {
      setStatus("error");
      setError(authError.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-navy-900">Check your email</h1>
        <p className="mt-3 text-ink-soft">
          We sent a sign-in link to <span className="font-medium">{email}</span>.
          Open it to continue.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold text-navy-900">
        Sign in to {APP_NAME}
      </h1>
      <p className="mt-2 text-center text-sm text-ink-soft">
        No password needed — we&apos;ll email you a sign-in link.
      </p>
      {searchParams.get("error") === "invalid_link" && (
        <p className="mt-4 text-center text-sm text-red-600">
          That sign-in link is invalid or has expired. Please request a new one.
        </p>
      )}
      <form onSubmit={sendMagicLink} className="mt-8 space-y-4">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-ink outline-none focus:border-navy-600"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-xl bg-navy-900 px-4 py-3 font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
        >
          {status === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-paper-warm px-6 py-16">
      <div className="w-full max-w-sm">
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-8 text-center text-xs text-ink-soft/70">
          <Link href="/" className="underline">
            ← Back
          </Link>
        </p>
      </div>
    </main>
  );
}
