import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDailyPrompt } from "@/lib/ai/journal";

export const maxDuration = 60;

/**
 * Daily cron: generates the global one-sentence daily prompt shown on the
 * home screen (spec §3.5).
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("daily_prompts")
    .select("id")
    .eq("prompt_date", today)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const { promptText, concept } = await generateDailyPrompt(supabase);
    await supabase.from("daily_prompts").insert({
      prompt_date: today,
      prompt_text: promptText,
      concept_id: concept?.id ?? null,
    });
    return NextResponse.json({ ok: true, promptText });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
