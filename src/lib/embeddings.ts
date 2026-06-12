import { EMBEDDING_DIMENSIONS, VOYAGE_MODEL } from "./constants";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MAX_BATCH_SIZE = 128;
// Free-tier Voyage accounts are capped at 3 requests / 10K tokens per minute,
// so keep each request under the token cap and wait out 429s rather than
// failing the caller.
const MAX_BATCH_TOKENS = 8000;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 25_000;

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { total_tokens: number };
}

// Same rough heuristic as chunking (~4 chars per token); only used for
// sizing batches, so precision doesn't matter.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestEmbeddings(
  batch: string[],
  inputType: "document" | "query"
): Promise<VoyageResponse> {
  for (let attempt = 0; ; attempt++) {
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

    if (res.ok) return (await res.json()) as VoyageResponse;

    const body = await res.text();
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : RETRY_DELAY_MS;
      await sleep(waitMs);
      continue;
    }
    throw new Error(`Voyage API error ${res.status}: ${body}`);
  }
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
  let batch: string[] = [];
  let batchTokens = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const json = await requestEmbeddings(batch, inputType);
    const ordered = [...json.data].sort((a, b) => a.index - b.index);
    results.push(...ordered.map((d) => d.embedding));
    batch = [];
    batchTokens = 0;
  };

  for (const text of texts) {
    const tokens = estimateTokens(text);
    if (
      batch.length > 0 &&
      (batch.length >= MAX_BATCH_SIZE || batchTokens + tokens > MAX_BATCH_TOKENS)
    ) {
      await flush();
    }
    batch.push(text);
    batchTokens += tokens;
  }
  await flush();

  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "query");
  return vector;
}
