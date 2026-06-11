import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CHECKIN_THEMES } from "@/lib/constants";

/** Record a mood/theme check-in (spec §3.2). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const mood = body?.mood;
  if (typeof mood !== "number" || mood < 1 || mood > 5) {
    return NextResponse.json({ error: "mood must be 1-5" }, { status: 400 });
  }
  const theme = CHECKIN_THEMES.includes(body?.theme) ? body.theme : null;

  const { data, error } = await supabase
    .from("mood_checkins")
    .insert({ user_id: user.id, mood, theme })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

/** Mood history for the trend chart (spec §3.3). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10) || 30,
    365
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("mood_checkins")
    .select("mood, theme, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ checkins: data });
}
