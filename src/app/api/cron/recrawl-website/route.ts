import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlWebsite } from "@/lib/ingestion/crawl";

export const maxDuration = 300;

/**
 * Weekly cron (see vercel.json): re-crawls all-about-psychology.com with a
 * page budget that fits the function time limit. Unchanged pages are detected
 * by text comparison and not re-embedded, so the budget is spent on
 * discovering new/updated pages. The full-site crawl is
 * scripts/crawl-website.ts, run at build time.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await crawlWebsite(createAdminClient(), {
      maxPages: 150,
      delayMs: 250,
      log: () => {},
    });
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
