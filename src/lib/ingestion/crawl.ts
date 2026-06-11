import * as cheerio from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";
import { htmlToText, normalizeWhitespace } from "./html";
import { ingestContentItem } from "./ingest";
import { CONTENT_SOURCES } from "../constants";

const HOST = "www.all-about-psychology.com";

/**
 * Spec §2.1 exclusions: memes, GIFs, cartoons, jokes, guestbook,
 * disclosure/privacy policy, contact form, partner/sponsor pages, store
 * links, and pages whose primary content is images or entertainment.
 */
const EXCLUDE_PATTERNS: RegExp[] = [
  /meme/i,
  /\bgif\b|gifs/i,
  /cartoon/i,
  /joke|funny|humou?r/i,
  /guestbook|guest-book/i,
  /privacy|disclosure|disclaimer|terms/i,
  /contact/i,
  /partner|sponsor|advertis/i,
  /amazon|store|shop|merch/i,
  /newsletter-signup|subscribe/i,
  /sitemap|search-results/i,
  /t-?shirt|mug|poster/i,
];

/** Minimum plain-text length for a page to count as substantive content. */
const MIN_TEXT_CHARS = 1500;

export function isExcludedUrl(url: string): boolean {
  return EXCLUDE_PATTERNS.some((re) => re.test(url));
}

export function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.hostname !== HOST && url.hostname !== "all-about-psychology.com") {
      return null;
    }
    url.hostname = HOST;
    url.protocol = "https:";
    url.hash = "";
    url.search = "";
    let normalized = url.toString();
    if (normalized.endsWith("/") && url.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return null;
  }
}

export async function fetchPage(
  url: string
): Promise<{ html: string } | { error: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MyPsychBot/1.0 (content sync for MyPsych app; owner: David Webb)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return { error: "not HTML" };
    return { html: await res.text() };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  links: string[];
}

export function parsePage(url: string, html: string): CrawledPage {
  const $ = cheerio.load(html);

  const title =
    normalizeWhitespace($("h1").first().text()) ||
    normalizeWhitespace($("title").text()) ||
    url;

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const normalized = normalizeUrl($(el).attr("href")!, url);
    if (normalized && !isExcludedUrl(normalized)) links.push(normalized);
  });

  // Strip site chrome before extracting article text.
  $("nav, header, footer, aside, .navbar, #nav, .menu, .breadcrumb").remove();
  const text = htmlToText($.html());

  return { url, title, text, links: [...new Set(links)] };
}

export interface CrawlOptions {
  maxPages?: number;
  delayMs?: number;
  seedUrls?: string[];
  log?: (message: string) => void;
}

export interface CrawlStats {
  visited: number;
  ingested: number;
  skipped: number;
  excluded: number;
  failed: number;
}

/**
 * BFS crawl of all-about-psychology.com, ingesting every substantive
 * educational page into the knowledge base. Used by the one-time build crawl
 * (scripts/crawl-website.ts) and, with a small page budget, by the weekly
 * re-crawl cron.
 */
export async function crawlWebsite(
  supabase: SupabaseClient,
  options: CrawlOptions = {}
): Promise<CrawlStats> {
  const {
    maxPages = 2000,
    delayMs = 500,
    seedUrls = [CONTENT_SOURCES.websiteBase],
    log = console.log,
  } = options;

  const queue: string[] = seedUrls
    .map((u) => normalizeUrl(u, CONTENT_SOURCES.websiteBase))
    .filter((u): u is string => !!u);
  const seen = new Set(queue);
  const stats: CrawlStats = {
    visited: 0,
    ingested: 0,
    skipped: 0,
    excluded: 0,
    failed: 0,
  };

  while (queue.length > 0 && stats.visited < maxPages) {
    const url = queue.shift()!;
    stats.visited++;

    const result = await fetchPage(url);
    if ("error" in result) {
      stats.failed++;
      log(`  ✗ ${url}: ${result.error}`);
      continue;
    }

    const page = parsePage(url, result.html);

    for (const link of page.links) {
      if (!seen.has(link)) {
        seen.add(link);
        queue.push(link);
      }
    }

    if (page.text.length < MIN_TEXT_CHARS) {
      stats.excluded++;
    } else {
      try {
        const ingestResult = await ingestContentItem(supabase, {
          source: "website",
          sourceId: new URL(url).pathname || "/",
          url,
          title: page.title,
          fullText: page.text,
        });
        if (ingestResult.skipped) {
          stats.skipped++;
        } else {
          stats.ingested++;
          log(`  ✓ ${page.title} (${ingestResult.chunks} chunks)`);
        }
      } catch (err) {
        stats.failed++;
        log(`  ✗ ${url}: ${(err as Error).message}`);
      }
    }

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  return stats;
}
