import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJournalPrompt } from "@/lib/ai/journal";
import { getTierStatus } from "@/lib/subscription";
import { CHECKIN_THEMES } from "@/lib/constants";
import type { CheckinTheme } from "@/lib/types";

export const maxDuration = 60;

/**
 * Generate a journaling prompt for the current session.
 * Paid users get a fully personalised prompt (mood + theme + recent entries);
 * free users get a concept-grounded prompt personalised by mood/theme only.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const mood =
    typeof body.mood === "number" && body.mood >= 1 && body.mood <= 5
      ? body.mood
      : undefined;
  const theme = CHECKIN_THEMES.includes(body.theme)
    ? (body.theme as CheckinTheme)
    : undefined;

  try {
    const tier = await getTierStatus(supabase, user.id);

    // Pattern-aware personalisation is part of the paid insight layer.
    let recentEntrySummary: string | undefined;
    if (tier.paid) {
      const { data: recent } = await supabase
        .from("journal_entries")
        .select("theme")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      const themes = [
        ...new Set((recent ?? []).map((e) => e.theme).filter(Boolean)),
      ];
      if (themes.length > 0) recentEntrySummary = themes.join(", ");
    }

    const result = await generateJournalPrompt(supabase, {
      mood,
      theme,
      recentEntrySummary,
    });

    return NextResponse.json({
      promptText: result.promptText,
      conceptName: result.conceptName,
      conceptSlug: result.concept?.slug ?? null,
    });
  } catch (err) {
    console.error("prompt generation failed:", err);
    return NextResponse.json(
      { error: "Could not generate a prompt right now" },
      { status: 500 }
    );
  }
}
