/**
 * One-time (and re-runnable) crawl of all-about-psychology.com into the
 * knowledge base. Honors the spec's include/exclude rules and skips pages
 * without substantive educational text. Re-running is cheap: unchanged pages
 * are detected and not re-embedded.
 *
 * Usage:
 *   npx tsx scripts/crawl-website.ts [--max-pages 2000]
 *
 * Requires in env (.env.local is loaded automatically):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY
 */
import { loadEnv, requireEnv } from "./lib/env";

loadEnv();
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VOYAGE_API_KEY",
]);

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { crawlWebsite } = await import("../src/lib/ingestion/crawl");

  const maxPagesArg = process.argv.indexOf("--max-pages");
  const maxPages =
    maxPagesArg !== -1 ? parseInt(process.argv[maxPagesArg + 1], 10) : 2000;

  console.log(`Crawling all-about-psychology.com (max ${maxPages} pages)...`);
  const stats = await crawlWebsite(createAdminClient(), { maxPages });

  console.log(
    `\nDone. Visited ${stats.visited} pages: ${stats.ingested} ingested, ` +
      `${stats.skipped} unchanged, ${stats.excluded} excluded (thin/non-educational), ` +
      `${stats.failed} failed.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
