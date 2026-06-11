import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTierStatus } from "@/lib/subscription";
import { MoodChart } from "@/components/MoodChart";

export const metadata = { title: "Insights" };

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = thirtyDaysAgoIso();
  const [tier, { data: checkins }, { data: insights }, { data: entries }] =
    await Promise.all([
      getTierStatus(supabase, user!.id),
      supabase
        .from("mood_checkins")
        .select("mood, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", since)
        .order("created_at", { ascending: true }),
      supabase
        .from("weekly_insights")
        .select("week_start, summary, themes")
        .eq("user_id", user!.id)
        .order("week_start", { ascending: false })
        .limit(4),
      supabase
        .from("journal_entries")
        .select("theme")
        .eq("user_id", user!.id)
        .gte("created_at", since),
    ]);

  // Recurring themes from the last 30 days of entries.
  const themeCounts = new Map<string, number>();
  for (const entry of entries ?? []) {
    if (entry.theme) {
      themeCounts.set(entry.theme, (themeCounts.get(entry.theme) ?? 0) + 1);
    }
  }
  const recurringThemes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-navy-900">Insights</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Patterns worth being curious about — not scores, not assessments.
        </p>
      </header>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-sm font-medium text-navy-900">
          Mood over the last 30 days
        </h2>
        <div className="mt-3">
          <MoodChart points={checkins ?? []} />
        </div>
      </section>

      {recurringThemes.length > 0 && (
        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-sm font-medium text-navy-900">
            What you&apos;ve been writing about
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recurringThemes.map(([theme, count]) => (
              <span
                key={theme}
                className="rounded-full bg-navy-50 px-3 py-1.5 text-xs text-navy-800"
              >
                {theme} · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">
          Weekly reflections
        </h2>
        {!tier.paid ? (
          <div className="rounded-2xl border border-navy-100 bg-white p-5">
            <p className="text-sm text-ink-soft">
              Weekly AI summaries and pattern tracking are part of the full
              insight layer.{" "}
              <Link href="/settings" className="font-medium text-navy-700 underline">
                Upgrade to unlock them
              </Link>
              .
            </p>
          </div>
        ) : !insights || insights.length === 0 ? (
          <div className="rounded-2xl border border-navy-100 bg-white p-5">
            <p className="text-sm text-ink-soft">
              Journal a few times this week and your first weekly reflection
              will arrive on Monday.
            </p>
          </div>
        ) : (
          insights.map((insight) => (
            <article
              key={insight.week_start}
              className="rounded-2xl border border-amber-100 bg-amber-100/40 p-5"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-amber-600">
                Week of{" "}
                {new Date(insight.week_start).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">
                {insight.summary}
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
