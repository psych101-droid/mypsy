// Row types mirroring supabase/migrations/0001_init.sql.

export type ContentSource = "substack" | "website";
export type Audience = "everyone" | "only_paid";

export type ConceptTheme =
  | "Cognitive"
  | "Social"
  | "Developmental"
  | "Clinical"
  | "Personality"
  | "Biological"
  | "Emotion & Wellbeing";

export type CheckinTheme =
  | "Relationships"
  | "Work & Motivation"
  | "Identity & Values"
  | "Emotions"
  | "Habits & Behaviour"
  | "Social Life";

export type SubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface ContentItem {
  id: string;
  source: ContentSource;
  source_id: string;
  url: string;
  title: string;
  subtitle: string | null;
  audience: Audience;
  published_at: string | null;
  full_text: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContentChunk {
  id: string;
  content_item_id: string;
  chunk_index: number;
  text: string;
  token_count: number;
  embedding: number[] | null;
  created_at: string;
}

export interface Concept {
  id: string;
  slug: string;
  name: string;
  explanation: string;
  theme: ConceptTheme;
  source_item_id: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyPrompt {
  id: string;
  prompt_date: string;
  prompt_text: string;
  concept_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  plan: "monthly" | "annual" | null;
  current_period_end: string | null;
  updated_at: string;
}

export interface MoodCheckin {
  id: string;
  user_id: string;
  mood: 1 | 2 | 3 | 4 | 5;
  theme: CheckinTheme | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  mood_checkin_id: string | null;
  prompt_text: string | null;
  prompt_concept_id: string | null;
  entry_text: string;
  reflection_text: string | null;
  reflection_concept_id: string | null;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyInsight {
  id: string;
  user_id: string;
  week_start: string;
  summary: string;
  themes: { theme: string; count: number }[];
  concept_id: string | null;
  created_at: string;
}

/** Result row of the match_content_chunks RPC. */
export interface MatchedChunk {
  chunk_id: string;
  item_id: string;
  title: string;
  url: string;
  source: ContentSource;
  chunk_text: string;
  similarity: number;
}
