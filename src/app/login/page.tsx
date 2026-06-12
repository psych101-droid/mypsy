"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "confirm_email">(
    "idle"
  );
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setError("");

    const supabase = createClient();
    const next = searchParams.get("next") ?? "/home";
    const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/home";

    if (mode === "signin") {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setStatus("idle");
        setError(authError.message);
        return;
      }
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) {
        setStatus("idle");
        setError(authError.message);
        return;
      }
      // With "Confirm email" enabled in Supabase, signUp returns no session
      // until the user clicks the confirmation link.
      if (!data.session) {
        setStatus("confirm_email");
        return;
      }
    }

    // Full navigation so the server sees the new auth cookies.
    window.location.assign(dest);
  }

  if (status === "confirm_email") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-navy-900">Check your email</h1>
        <p className="mt-3 text-ink-soft">
          We sent a confirmation link to{" "}
          <span className="font-medium">{email}</span>. Confirm your address,
          then sign in.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-center text-2xl font-semibold text-navy-900">
        {mode === "signin" ? `Sign in to ${APP_NAME}` : `Create your ${APP_NAME} account`}
      </h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-ink outline-none focus:border-navy-600"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-ink outline-none focus:border-navy-600"
        />
        <button
          type="submit"
          disabled={status === "busy"}
          className="w-full rounded-xl bg-navy-900 px-4 py-3 font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
        >
          {status === "busy"
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className="font-medium underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              className="font-medium underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
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
