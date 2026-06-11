import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "../embeddings";
import { RAG_MATCH_COUNT, RAG_MIN_SIMILARITY } from "../constants";
import type { MatchedChunk } from "../types";

/**
 * Retrieve the most relevant knowledge-base chunks for a query (a journal
 * entry, a mood/theme combination, or a follow-up question). Only these
 * chunks — never the whole knowledge base — are passed to Claude.
 */
export async function retrieveContext(
  supabase: SupabaseClient,
  query: string,
  matchCount = RAG_MATCH_COUNT
): Promise<MatchedChunk[]> {
  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("match_content_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    min_similarity: RAG_MIN_SIMILARITY,
  });

  if (error) {
    throw new Error(`Retrieval failed: ${error.message}`);
  }
  return (data ?? []) as MatchedChunk[];
}

/** Format retrieved chunks as a context block for the model. */
export function formatContext(chunks: MatchedChunk[]): string {
  if (chunks.length === 0) {
    return "No context passages were retrieved for this request.";
  }
  return chunks
    .map(
      (chunk, i) =>
        `<passage index="${i + 1}" title="${chunk.title}" url="${chunk.url}">\n${chunk.chunk_text}\n</passage>`
    )
    .join("\n\n");
}
