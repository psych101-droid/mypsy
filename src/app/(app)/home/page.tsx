import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTierStatus } from "@/lib/subscription";

export const metadata = { title: "Home" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: dailyPrompt }, { data: recentEntries }, { data: insight }, tier] =
    await Promise.all([
      supabase
        .from("daily_prompts")
        .select("prompt_text, concept_id, concepts(slug, name)")
        .eq("prompt_date", today)
        .maybeSingle(),
      supabase
        .from("journal_entries")
        .select("id, created_at, entry_text, theme")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("weekly_insights")
        .select("summary, week_start")
        .eq("user_id", user!.id)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getTierStatus(supabase, user!.id),
    ]);

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-navy-900">{greeting()}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A few quiet minutes with your own mind.
        </p>
      </header>

      {dailyPrompt && (
        <section className="rounded-2xl bg-navy-900 p-5 text-white">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-100/90">
            Something to think about today
          </p>
          <p className="journal-surface mt-2 text-white/95">
            {dailyPrompt.prompt_text}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="font-medium text-navy-900">Ready to reflect?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Check in with your mood and get a prompt grounded in real psychology.
        </p>
        <Link
          href="/journal"
          className="mt-4 inline-block rounded-full bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-800 transition-colors"
        >
          Start today&apos;s entry
        </Link>
        {!tier.paid && tier.entriesLimit !== null && (
          <p className="mt-3 text-xs text-ink-soft/70">
            {Math.max(tier.entriesLimit - tier.entriesThisMonth, 0)} of{" "}
            {tier.entriesLimit} free entries left this month.
          </p>
        )}
      </section>

      {insight && (
        <section className="rounded-2xl border border-amber-100 bg-amber-100/40 p-5">
          <h2 className="text-xs font-medium uppercase tracking-widest text-amber-600">
            Your week in review
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
            {insight.summary}
          </p>
          <Link
            href="/insights"
            className="mt-3 inline-block text-sm font-medium text-navy-700 underline"
          >
            See all insights
          </Link>
        </section>
      )}

      {recentEntries && recentEntries.length > 0 && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">
            Recent entries
          </h2>
          <ul className="mt-3 space-y-3">
            {recentEntries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-navy-100 bg-white p-4"
              >
                <p className="text-xs text-ink-soft">
                  {new Date(entry.created_at).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                  {entry.theme ? ` · ${entry.theme}` : ""}
                </p>
                <p className="journal-surface mt-1 line-clamp-2 text-[15px] text-ink">
                  {entry.entry_text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
