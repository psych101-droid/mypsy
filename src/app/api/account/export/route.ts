import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GDPR data export (spec §7): everything the app holds about the user,
 * downloadable as a single JSON file.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [profile, entries, checkins, favorites, insights] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("journal_entries")
      .select("created_at, prompt_text, entry_text, reflection_text, theme")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("mood_checkins")
      .select("created_at, mood, theme")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("favorites")
      .select("created_at, concepts(name, slug)")
      .eq("user_id", user.id),
    supabase
      .from("weekly_insights")
      .select("week_start, summary, themes")
      .eq("user_id", user.id)
      .order("week_start"),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: { email: user.email, created_at: user.created_at },
    profile: profile.data,
    journal_entries: entries.data ?? [],
    mood_checkins: checkins.data ?? [],
    favorite_concepts: favorites.data ?? [],
    weekly_insights: insights.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mypsych-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
