import { XMLParser } from "fast-xml-parser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { htmlToText } from "./html";
import { ingestContentItem } from "./ingest";
import { CONTENT_SOURCES } from "../constants";

interface RssItem {
  title?: string;
  description?: string;
  link?: string;
  guid?: string | { "#text": string };
  pubDate?: string;
  "content:encoded"?: string;
}

export interface RssSyncStats {
  feedItems: number;
  ingested: number;
  skipped: number;
  failed: number;
}

/**
 * Poll the Substack RSS feed and ingest any new or updated articles.
 * Substack feeds carry full article HTML in <content:encoded> for free posts
 * and an excerpt for paid posts — both are ingested (the full archive of paid
 * posts came from the one-time export).
 */
export async function syncSubstackFeed(
  supabase: SupabaseClient
): Promise<RssSyncStats> {
  const res = await fetch(CONTENT_SOURCES.substackFeed, {
    headers: {
      "User-Agent": "MyPsychBot/1.0 (content sync for MyPsych app; owner: David Webb)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Feed fetch failed: HTTP ${res.status}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item ?? [];
  const items: RssItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];

  const stats: RssSyncStats = {
    feedItems: items.length,
    ingested: 0,
    skipped: 0,
    failed: 0,
  };

  for (const item of items) {
    const link = item.link ?? "";
    const guid =
      typeof item.guid === "object" ? item.guid["#text"] : item.guid;
    const slug = link.split("/p/")[1]?.replace(/\/$/, "");

    // The archive importer keys posts as "{postid}.{slug}", which RSS items
    // don't carry — so first match any existing item by URL and reuse its
    // source_id to avoid duplicating archive posts.
    let sourceId: string | undefined = guid ? String(guid) : slug || link;
    if (link) {
      const { data: existing } = await supabase
        .from("content_items")
        .select("source_id")
        .eq("source", "substack")
        .eq("url", link)
        .maybeSingle();
      if (existing) sourceId = existing.source_id;
    }
    if (!sourceId) continue;

    const html = item["content:encoded"] ?? item.description ?? "";
    const fullText = htmlToText(String(html));
    if (fullText.length < 200) {
      stats.skipped++;
      continue;
    }

    try {
      const result = await ingestContentItem(supabase, {
        source: "substack",
        sourceId: String(sourceId),
        url: link,
        title: item.title ?? slug ?? "Untitled",
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        fullText,
      });
      if (result.skipped) stats.skipped++;
      else stats.ingested++;
    } catch {
      stats.failed++;
    }
  }

  return stats;
}
