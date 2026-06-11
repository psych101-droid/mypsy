import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSubstackFeed } from "@/lib/ingestion/rss";

export const maxDuration = 300;

/**
 * Daily cron (see vercel.json): polls the Substack RSS feed and ingests new
 * articles automatically — no manual action required.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await syncSubstackFeed(createAdminClient());
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
