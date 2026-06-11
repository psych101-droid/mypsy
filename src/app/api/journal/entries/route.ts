import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReflection } from "@/lib/ai/journal";
import { getTierStatus } from "@/lib/subscription";

export const maxDuration = 60;

/**
 * Create a journal entry. The AI reflection (paid insight layer) is generated
 * inline and stored with the entry. Per the privacy spec, the Claude call
 * contains only the system prompt, retrieved knowledge-base chunks, and this
 * entry — no historical entries.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const entryText = typeof body?.entryText === "string" ? body.entryText.trim() : "";
  if (!entryText) {
    return NextResponse.json({ error: "Entry text is required" }, { status: 400 });
  }

  const tier = await getTierStatus(supabase, user.id);
  if (!tier.canCreateEntry) {
    return NextResponse.json(
      {
        error: "free_limit_reached",
        message: `You've used your ${tier.entriesLimit} free entries this month. Upgrade for unlimited journaling.`,
      },
      { status: 402 }
    );
  }

  // The AI insight layer is a paid feature (spec §1.4).
  let reflection: Awaited<ReturnType<typeof generateReflection>> | null = null;
  if (tier.paid) {
    try {
      reflection = await generateReflection(supabase, {
        entryText,
        promptText: body?.promptText ?? null,
      });
    } catch (err) {
      // Never lose a user's writing because the reflection failed.
      console.error("reflection generation failed:", err);
    }
  }

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      entry_text: entryText,
      prompt_text: body?.promptText ?? null,
      mood_checkin_id: body?.moodCheckinId ?? null,
      theme: body?.theme ?? null,
      reflection_text: reflection
        ? `${reflection.reflectionText}\n\n${reflection.followUpQuestion}`
        : null,
      reflection_concept_id: reflection?.concept?.id ?? null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: entry.id,
    createdAt: entry.created_at,
    reflection: reflection
      ? {
          text: reflection.reflectionText,
          followUpQuestion: reflection.followUpQuestion,
          conceptName: reflection.conceptName,
          conceptSlug: reflection.concept?.slug ?? null,
        }
      : null,
    paid: tier.paid,
  });
}

/** List the user's entries (most recent first). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10) || 20,
    100
  );

  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      "id, created_at, prompt_text, entry_text, reflection_text, theme"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data });
}
