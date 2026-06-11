import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, isPaid } from "@/lib/subscription";
import {
  DeleteAccountButton,
  ManageBillingButton,
  SignOutButton,
  UpgradeButtons,
} from "@/components/SettingsControls";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subscription = await getSubscription(supabase, user!.id);
  const paid = isPaid(subscription);

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-navy-900">Settings</h1>
      </header>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-sm font-medium text-navy-900">Account</h2>
        <p className="mt-1 text-sm text-ink-soft">{user!.email}</p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-sm font-medium text-navy-900">Subscription</h2>
        {paid ? (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              You&apos;re on the{" "}
              <span className="font-medium text-ink">
                {subscription?.plan === "annual" ? "annual" : "monthly"} plan
              </span>
              {subscription?.current_period_end &&
                ` — renews ${new Date(subscription.current_period_end).toLocaleDateString()}`}
              . Thank you for supporting independent psychology writing.
            </p>
            <div className="mt-4">
              <ManageBillingButton />
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-soft">
              You&apos;re on the free plan: 8 entries a month, basic prompts,
              and the concepts library. Upgrade for unlimited journaling, AI
              reflections, pattern tracking, and full article access.
            </p>
            <div className="mt-4">
              <UpgradeButtons />
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-sm font-medium text-navy-900">Your data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Your journal is yours. Entries are never used to train AI models and
          can&apos;t be read by anyone but you — see the{" "}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <a
            href="/api/account/export"
            className="rounded-full border border-navy-100 bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:bg-navy-50 transition-colors"
          >
            Export all my data (JSON)
          </a>
        </div>
        <div className="mt-6 border-t border-navy-100 pt-4">
          <DeleteAccountButton />
        </div>
      </section>
    </main>
  );
}
