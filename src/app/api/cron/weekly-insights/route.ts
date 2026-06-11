import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyInsight } from "@/lib/ai/journal";
import { isPaid } from "@/lib/subscription";
import type { Subscription } from "@/lib/types";

export const maxDuration = 300;

/**
 * Weekly cron (Monday mornings): generates the weekly summary + "this week
 * in psychology" for every paid user who journaled in the past week.
 * Pattern tracking is part of the paid insight layer (spec §1.4).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // The week being summarized: the 7 days ending yesterday (cron runs Monday).
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setUTCHours(0, 0, 0, 0);
  const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: entries, error } = await supabase
    .from("journal_entries")
    .select("user_id, created_at, entry_text, theme")
    .gte("created_at", weekStart.toISOString())
    .lt("created_at", weekEnd.toISOString());

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const byUser = new Map<string, typeof entries>();
  for (const entry of entries ?? []) {
    const list = byUser.get(entry.user_id) ?? [];
    list.push(entry);
    byUser.set(entry.user_id, list);
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [userId, userEntries] of byUser) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!isPaid(sub as Subscription | null)) {
      skipped++;
      continue;
    }

    const weekStartDate = weekStart.toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("weekly_insights")
      .select("id")
      .eq("user_id", userId)
      .eq("week_start", weekStartDate)
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }

    try {
      const insight = await generateWeeklyInsight(supabase, {
        entries: userEntries!,
      });
      await supabase.from("weekly_insights").insert({
        user_id: userId,
        week_start: weekStartDate,
        summary: `${insight.summary}\n\nThis week in psychology: ${insight.conceptName} — ${insight.conceptConnection}`,
        themes: insight.themes,
        concept_id: insight.concept?.id ?? null,
      });
      generated++;
    } catch (err) {
      console.error(`weekly insight failed for user ${userId}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    usersWithEntries: byUser.size,
    generated,
    skipped,
    failed,
  });
}
