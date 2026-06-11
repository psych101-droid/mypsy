import { CHUNK_OVERLAP_TOKENS, CHUNK_TARGET_TOKENS } from "../constants";

export interface TextChunk {
  text: string;
  tokenCount: number;
}

// Rough heuristic: ~4 characters per token for English prose. Good enough for
// sizing chunks; embeddings don't need exact counts.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split article text into chunks of roughly CHUNK_TARGET_TOKENS (spec:
 * 400–600) with CHUNK_OVERLAP_TOKENS of overlap, breaking on paragraph
 * boundaries where possible so chunks stay coherent.
 */
export function chunkText(
  text: string,
  targetTokens = CHUNK_TARGET_TOKENS,
  overlapTokens = CHUNK_OVERLAP_TOKENS
): TextChunk[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: TextChunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) return;
    const chunkText = current.join("\n\n");
    chunks.push({ text: chunkText, tokenCount: estimateTokens(chunkText) });

    // Carry the tail paragraphs forward as overlap for the next chunk.
    const overlap: string[] = [];
    let overlapCount = 0;
    for (let i = current.length - 1; i >= 0 && overlapCount < overlapTokens; i--) {
      overlap.unshift(current[i]);
      overlapCount += estimateTokens(current[i]);
    }
    current = overlap.length < current.length ? overlap : [];
    currentTokens = current.reduce((sum, p) => sum + estimateTokens(p), 0);
  };

  for (const paragraph of paragraphs) {
    const pTokens = estimateTokens(paragraph);

    // A single paragraph larger than the target gets split by sentences.
    if (pTokens > targetTokens * 1.5) {
      flush();
      current = [];
      currentTokens = 0;
      for (const piece of splitLongParagraph(paragraph, targetTokens)) {
        chunks.push({ text: piece, tokenCount: estimateTokens(piece) });
      }
      continue;
    }

    if (currentTokens + pTokens > targetTokens && currentTokens > 0) {
      flush();
    }
    current.push(paragraph);
    currentTokens += pTokens;
  }

  if (current.length > 0 && currentTokens > overlapTokens) {
    const chunkTextFinal = current.join("\n\n");
    chunks.push({
      text: chunkTextFinal,
      tokenCount: estimateTokens(chunkTextFinal),
    });
  }

  // Drop tiny fragments (footers, stray lines) that add noise to retrieval.
  return chunks.filter((c) => c.tokenCount >= 30);
}

function splitLongParagraph(paragraph: string, targetTokens: number): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [paragraph];
  const pieces: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    if (estimateTokens(buffer + sentence) > targetTokens && buffer) {
      pieces.push(buffer.trim());
      buffer = "";
    }
    buffer += sentence;
  }
  if (buffer.trim()) pieces.push(buffer.trim());
  return pieces;
}
