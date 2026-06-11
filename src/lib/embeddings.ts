import { EMBEDDING_DIMENSIONS, VOYAGE_MODEL } from "./constants";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MAX_BATCH_SIZE = 128;

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
}

/**
 * Embed a batch of texts with Voyage AI.
 * `inputType` should be "document" when indexing content and "query" when
 * embedding a user's journal entry / request for retrieval.
 */
export async function embed(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: batch,
        input_type: inputType,
        output_dimension: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Voyage API error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as VoyageResponse;
    const ordered = [...json.data].sort((a, b) => a.index - b.index);
    results.push(...ordered.map((d) => d.embedding));
  }
  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "query");
  return vector;
}
