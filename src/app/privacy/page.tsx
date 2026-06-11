import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10">
      <Link href="/" className="text-sm text-ink-soft underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-navy-900">
        Privacy policy
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Plain English, because that&apos;s how privacy policies should be written.
      </p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink">
        <section>
          <h2 className="font-semibold text-navy-900">Your journal is yours</h2>
          <p className="mt-1">
            Journal entries are deeply personal, and we treat them that way.
            Your entries are stored securely and protected by database-level
            access rules so that only your account can read them. The people
            who run {APP_NAME} — including David Webb and the app team —
            cannot read your entries.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-navy-900">
            AI processing, in the open
          </h2>
          <p className="mt-1">
            When you ask for a prompt or finish an entry, we send three things
            to Anthropic (the AI provider): the app&apos;s instructions, a few
            short passages from David&apos;s published psychology writing, and
            the entry you just wrote. Nothing from your historical entries is
            included unless you explicitly choose to include it. Your entries
            are never used to train AI models — by us or by Anthropic.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-navy-900">What we store</h2>
          <p className="mt-1">
            Your email address (to sign you in), your journal entries, mood
            check-ins, saved concepts, and weekly insights. If you subscribe,
            payment is handled entirely by Stripe — we never see or store your
            card details.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-navy-900">No third parties</h2>
          <p className="mt-1">
            We don&apos;t sell, share, or send your journal content to anyone.
            There are no ads and no advertising trackers in {APP_NAME}, ever.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-navy-900">
            Your rights (GDPR and beyond)
          </h2>
          <p className="mt-1">
            From Settings you can export everything we hold about you as a
            single file, at any time. You can also permanently delete your
            account, which immediately and irreversibly removes all of your
            data — entries, check-ins, insights, everything. These rights
            apply to everyone, not just users in the EU/UK.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-navy-900">Not a medical service</h2>
          <p className="mt-1">
            {APP_NAME} is a reflection and self-discovery tool. It does not
            provide diagnosis, treatment, or clinical advice, and it is not a
            substitute for professional mental health care. If you&apos;re
            struggling, please speak to a GP, a therapist, or a crisis line
            such as 988 (US) or Samaritans 116 123 (UK).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-navy-900">Questions</h2>
          <p className="mt-1">
            Contact us through{" "}
            <a
              href="https://www.all-about-psychology.com/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              all-about-psychology.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
