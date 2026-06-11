import type { CheckinTheme, ConceptTheme } from "./types";

export const APP_NAME = "MyPsych";
export const APP_TAGLINE =
  "A psychology-grounded journaling companion, built on the writing of David Webb.";

// AI layer. The spec named claude-sonnet-4-20250514, which is deprecated
// (retires June 15, 2026) — claude-sonnet-4-6 is its official replacement.
export const CLAUDE_MODEL = "claude-sonnet-4-6";

// Embeddings: Voyage AI (Anthropic's recommended embeddings partner).
// Dimension must match vector(1024) in the schema.
export const VOYAGE_MODEL = "voyage-3.5";
export const EMBEDDING_DIMENSIONS = 1024;

// RAG retrieval
export const RAG_MATCH_COUNT = 5;
export const RAG_MIN_SIMILARITY = 0.3;
export const CHUNK_TARGET_TOKENS = 500; // spec: 400–600 tokens
export const CHUNK_OVERLAP_TOKENS = 50;

// Free tier
export const FREE_ENTRIES_PER_MONTH = 8;

// Pricing (display only — Stripe price IDs are env vars)
export const PRICE_MONTHLY_USD = 9.99;
export const PRICE_ANNUAL_USD = 79;

export const CHECKIN_THEMES: CheckinTheme[] = [
  "Relationships",
  "Work & Motivation",
  "Identity & Values",
  "Emotions",
  "Habits & Behaviour",
  "Social Life",
];

export const CONCEPT_THEMES: ConceptTheme[] = [
  "Cognitive",
  "Social",
  "Developmental",
  "Clinical",
  "Personality",
  "Biological",
  "Emotion & Wellbeing",
];

export const CONTENT_SOURCES = {
  substackFeed: "https://allaboutpsychology.substack.com/feed",
  websiteBase: "https://www.all-about-psychology.com/",
};
