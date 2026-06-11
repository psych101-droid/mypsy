"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRICE_ANNUAL_USD, PRICE_MONTHLY_USD } from "@/lib/constants";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-full border border-navy-100 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50 transition-colors"
    >
      Sign out
    </button>
  );
}

export function UpgradeButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function checkout(plan: "monthly" | "annual") {
    setBusy(plan);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "failed");
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout — please try again.");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => checkout("monthly")}
          disabled={busy !== null}
          className="flex-1 rounded-xl bg-navy-900 px-4 py-3 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
        >
          {busy === "monthly" ? "Opening…" : `$${PRICE_MONTHLY_USD}/month`}
        </button>
        <button
          onClick={() => checkout("annual")}
          disabled={busy !== null}
          className="flex-1 rounded-xl border border-navy-600 bg-white px-4 py-3 text-sm font-medium text-navy-900 hover:bg-navy-50 disabled:opacity-50 transition-colors"
        >
          {busy === "annual"
            ? "Opening…"
            : `$${PRICE_ANNUAL_USD}/year (save 34%)`}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        setBusy(true);
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else setBusy(false);
      }}
      disabled={busy}
      className="rounded-full border border-navy-100 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50 disabled:opacity-50 transition-colors"
    >
      {busy ? "Opening…" : "Manage billing"}
    </button>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-red-600 underline"
      >
        Delete my account and all data
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-800">
        This permanently deletes your account, every journal entry, check-in,
        and insight. There is no undo and we keep no copy.
      </p>
      <div className="mt-3 flex gap-3">
        <button
          onClick={async () => {
            setBusy(true);
            const res = await fetch("/api/account/delete", { method: "POST" });
            if (res.ok) {
              router.push("/");
              router.refresh();
            } else {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Yes, delete everything"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-full border border-navy-100 bg-white px-4 py-2 text-sm font-medium text-navy-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
