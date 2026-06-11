import type { SupabaseClient } from "@supabase/supabase-js";
import { embed } from "../embeddings";
import { countWords } from "./html";
import { chunkText } from "./chunk";
import type { Audience, ContentSource } from "../types";

export interface IngestInput {
  source: ContentSource;
  sourceId: string;
  url: string;
  title: string;
  subtitle?: string | null;
  audience?: Audience;
  publishedAt?: string | null;
  fullText: string;
}

/**
 * Upsert a content item, then (re)build its chunks and embeddings.
 * Skips re-embedding when the text is unchanged since the last ingest.
 * Requires a service-role client (writes bypass RLS).
 */
export async function ingestContentItem(
  supabase: SupabaseClient,
  input: IngestInput
): Promise<{ itemId: string; chunks: number; skipped: boolean }> {
  const { data: existing } = await supabase
    .from("content_items")
    .select("id, full_text")
    .eq("source", input.source)
    .eq("source_id", input.sourceId)
    .maybeSingle();

  if (existing && existing.full_text === input.fullText) {
    return { itemId: existing.id, chunks: 0, skipped: true };
  }

  const { data: item, error: upsertError } = await supabase
    .from("content_items")
    .upsert(
      {
        source: input.source,
        source_id: input.sourceId,
        url: input.url,
        title: input.title,
        subtitle: input.subtitle ?? null,
        audience: input.audience ?? "everyone",
        published_at: input.publishedAt ?? null,
        full_text: input.fullText,
        word_count: countWords(input.fullText),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source,source_id" }
    )
    .select("id")
    .single();

  if (upsertError || !item) {
    throw new Error(
      `Failed to upsert content item ${input.sourceId}: ${upsertError?.message}`
    );
  }

  // Rebuild chunks from scratch for this item.
  const { error: deleteError } = await supabase
    .from("content_chunks")
    .delete()
    .eq("content_item_id", item.id);
  if (deleteError) {
    throw new Error(`Failed to clear old chunks: ${deleteError.message}`);
  }

  // Prefix each chunk with the article title so retrieval has context even
  // for mid-article chunks.
  const chunks = chunkText(input.fullText);
  const texts = chunks.map((c) => `${input.title}\n\n${c.text}`);
  const embeddings = await embed(texts, "document");

  const rows = chunks.map((chunk, i) => ({
    content_item_id: item.id,
    chunk_index: i,
    text: texts[i],
    token_count: chunk.tokenCount,
    embedding: embeddings[i],
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const { error: insertError } = await supabase
      .from("content_chunks")
      .insert(rows.slice(i, i + 100));
    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }
  }

  return { itemId: item.id, chunks: rows.length, skipped: false };
}
