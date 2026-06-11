/**
 * Build the psychology concepts library from the ingested knowledge base.
 *
 * For each content item, asks Claude to extract the named psychological
 * concepts the article substantively explains (0–3 per article), each with a
 * plain-English explanation grounded in the article text and written in
 * David's voice. Concepts are deduplicated by slug — the first substantive
 * source wins.
 *
 * Usage:
 *   npx tsx scripts/extract-concepts.ts [--source substack|website] [--limit N]
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */
import { loadEnv, requireEnv } from "./lib/env";

loadEnv();
requireEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
]);

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "The concept's standard name, e.g. 'Cognitive dissonance'",
          },
          slug: {
            type: "string",
            description:
              "URL-safe lowercase slug, e.g. 'cognitive-dissonance'",
          },
          explanation: {
            type: "string",
            description:
              "2-4 sentence plain-English explanation drawn from the article, in the author's warm, non-clinical voice",
          },
          theme: {
            type: "string",
            enum: [
              "Cognitive",
              "Social",
              "Developmental",
              "Clinical",
              "Personality",
              "Biological",
              "Emotion & Wellbeing",
            ],
          },
        },
        required: ["name", "slug", "explanation", "theme"],
        additionalProperties: false,
      },
    },
  },
  required: ["concepts"],
  additionalProperties: false,
} as const;

interface ExtractedConcept {
  name: string;
  slug: string;
  explanation: string;
  theme: string;
}

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { getAnthropicClient } = await import("../src/lib/ai/client");
  const { CLAUDE_MODEL } = await import("../src/lib/constants");

  const supabase = createAdminClient();
  const anthropic = getAnthropicClient();

  const sourceArg = process.argv.indexOf("--source");
  const limitArg = process.argv.indexOf("--limit");
  const source = sourceArg !== -1 ? process.argv[sourceArg + 1] : null;
  const limit = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : null;

  let query = supabase
    .from("content_items")
    .select("id, title, url, full_text")
    .order("published_at", { ascending: false });
  if (source) query = query.eq("source", source);
  if (limit) query = query.limit(limit);

  const { data: items, error } = await query;
  if (error) throw new Error(error.message);

  const { data: existingConcepts } = await supabase
    .from("concepts")
    .select("slug");
  const knownSlugs = new Set((existingConcepts ?? []).map((c) => c.slug));

  console.log(
    `Extracting concepts from ${items!.length} articles (${knownSlugs.size} concepts already in library)...`
  );

  let added = 0;
  for (const item of items!) {
    const articleText = item.full_text.slice(0, 24_000);

    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system:
          "You extract named psychological concepts from articles by David Webb " +
          "(All About Psychology). Only extract concepts the article substantively " +
          "explains — established psychological terms, theories, effects, or " +
          "frameworks (e.g. 'fundamental attribution error', 'self-determination " +
          "theory'). Do not invent concepts, and do not extract topics that are " +
          "merely mentioned in passing. If the article explains no clear " +
          "psychological concept, return an empty list. Write each explanation in " +
          "the author's voice: warm, curious, plain English, no clinical jargon — " +
          "like a knowledgeable friend, drawing only on what the article itself says.",
        messages: [
          {
            role: "user",
            content: `Article title: ${item.title}\n\nArticle text:\n${articleText}`,
          },
        ],
        output_config: {
          format: { type: "json_schema", schema: EXTRACTION_SCHEMA },
        },
      });

      const text = response.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") continue;
      const { concepts } = JSON.parse(text.text) as {
        concepts: ExtractedConcept[];
      };

      for (const concept of concepts) {
        if (knownSlugs.has(concept.slug)) continue;
        const { error: insertError } = await supabase.from("concepts").insert({
          slug: concept.slug,
          name: concept.name,
          explanation: concept.explanation,
          theme: concept.theme,
          source_item_id: item.id,
          source_url: item.url,
        });
        if (!insertError) {
          knownSlugs.add(concept.slug);
          added++;
          console.log(`  + ${concept.name} [${concept.theme}] ← ${item.title}`);
        }
      }
    } catch (err) {
      console.error(`  ✗ ${item.title}: ${(err as Error).message}`);
    }
  }

  console.log(`\nDone. Added ${added} concepts (library total ≈ ${knownSlugs.size}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
