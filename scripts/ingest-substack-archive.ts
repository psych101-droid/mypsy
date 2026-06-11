/**
 * One-time import of the full Substack archive export into the knowledge base.
 *
 * Reads data/substack-export/ (199 article HTML files + posts.csv metadata),
 * cleans each article to plain text, chunks it, embeds the chunks with Voyage,
 * and stores everything in Supabase.
 *
 * Usage:
 *   npx tsx scripts/ingest-substack-archive.ts
 *
 * Requires in env (.env.local is loaded automatically):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOYAGE_API_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv, requireEnv } from "./lib/env";

loadEnv();
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VOYAGE_API_KEY",
]);

const EXPORT_DIR = path.join(process.cwd(), "data", "substack-export");
const SUBSTACK_BASE = "https://allaboutpsychology.substack.com/p/";

interface PostMeta {
  post_id: string;
  post_date: string;
  is_published: string;
  type: string;
  audience: string;
  title: string;
  subtitle: string;
}

function parseCsv(csv: string): PostMeta[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }

  const header = rows[0];
  return rows.slice(1).map((r) => {
    const record = {} as Record<string, string>;
    header.forEach((key, i) => (record[key] = r[i] ?? ""));
    return record as unknown as PostMeta;
  });
}

async function main() {
  // Imported lazily so env vars are loaded before module init.
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { htmlToText } = await import("../src/lib/ingestion/html");
  const { ingestContentItem } = await import("../src/lib/ingestion/ingest");

  const supabase = createAdminClient();

  const csv = fs.readFileSync(path.join(EXPORT_DIR, "posts.csv"), "utf-8");
  const posts = parseCsv(csv).filter(
    (p) =>
      p.is_published === "true" &&
      // Newsletters and standalone pages are content; skip ad-hoc emails
      // (thank-you notes, admin announcements) and podcast stubs.
      (p.type === "newsletter" || p.type === "page")
  );

  console.log(`Found ${posts.length} published posts to ingest.`);

  let ingested = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    const htmlPath = path.join(EXPORT_DIR, `${post.post_id}.html`);
    if (!fs.existsSync(htmlPath)) {
      console.warn(`  ! Missing HTML for ${post.post_id}, skipping`);
      failed++;
      continue;
    }

    const html = fs.readFileSync(htmlPath, "utf-8");
    const fullText = htmlToText(html);

    if (fullText.length < 200) {
      console.warn(`  ! ${post.title || post.post_id}: too little text, skipping`);
      skipped++;
      continue;
    }

    const slug = post.post_id.split(".").slice(1).join(".") || post.post_id;
    try {
      const result = await ingestContentItem(supabase, {
        source: "substack",
        sourceId: post.post_id,
        url: `${SUBSTACK_BASE}${slug}`,
        title: post.title || slug,
        subtitle: post.subtitle || null,
        audience: post.audience === "only_paid" ? "only_paid" : "everyone",
        publishedAt: post.post_date || null,
        fullText,
      });
      if (result.skipped) {
        skipped++;
      } else {
        ingested++;
        console.log(`  ✓ ${post.title || slug} (${result.chunks} chunks)`);
      }
    } catch (err) {
      failed++;
      console.error(`  ✗ ${post.title || slug}: ${(err as Error).message}`);
    }
  }

  console.log(
    `\nDone. Ingested ${ingested}, skipped ${skipped} (unchanged/too short), failed ${failed}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
