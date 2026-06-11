import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerFollowUp } from "@/lib/ai/journal";
import { getTierStatus } from "@/lib/subscription";

export const maxDuration = 60;

/** Answer a follow-up question about the concept behind a prompt/reflection. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const tier = await getTierStatus(supabase, user.id);
  if (!tier.paid) {
    return NextResponse.json(
      { error: "upgrade_required", message: "Follow-up questions are part of the full insight layer." },
      { status: 402 }
    );
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "A question is required" }, { status: 400 });
  }

  try {
    const answer = await answerFollowUp(supabase, {
      question,
      conceptName: body?.conceptName ?? null,
    });
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("follow-up failed:", err);
    return NextResponse.json(
      { error: "Could not answer that right now" },
      { status: 500 }
    );
  }
}
