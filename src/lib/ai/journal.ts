import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropicClient } from "./client";
import { SYSTEM_PROMPT } from "./system-prompt";
import { retrieveContext, formatContext } from "./rag";
import { CLAUDE_MODEL } from "../constants";
import type { CheckinTheme, Concept } from "../types";

const MOOD_LABELS: Record<number, string> = {
  1: "really struggling",
  2: "a bit low",
  3: "okay / neutral",
  4: "pretty good",
  5: "great",
};

interface GeneratedPrompt {
  concept_name: string;
  concept_explanation: string;
  question: string;
}

interface GeneratedReflection {
  reflection: string;
  concept_name: string;
  follow_up_question: string;
}

export interface JournalPromptResult {
  promptText: string;
  conceptName: string;
  concept: Concept | null;
}

export interface ReflectionResult {
  reflectionText: string;
  conceptName: string;
  followUpQuestion: string;
  concept: Concept | null;
}

async function callStructured<T>(
  schema: Record<string, unknown>,
  userMessage: string,
  maxTokens = 1024
): Promise<T> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: { format: { type: "json_schema", schema } },
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("Model returned no text content");
  }
  return JSON.parse(text.text) as T;
}

/** Find the library entry for a concept the model referenced, if it exists. */
async function lookupConcept(
  supabase: SupabaseClient,
  conceptName: string
): Promise<Concept | null> {
  const slugGuess = conceptName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { data } = await supabase
    .from("concepts")
    .select("*")
    .or(`slug.eq.${slugGuess},name.ilike.${conceptName.replace(/[,%()]/g, "")}`)
    .limit(1)
    .maybeSingle();

  return (data as Concept) ?? null;
}

/**
 * Generate a journal prompt (spec §4.3): grounded in a named concept from the
 * knowledge base, with a 1-2 sentence plain-English explanation, personalised
 * by the user's mood check-in and chosen theme.
 */
export async function generateJournalPrompt(
  supabase: SupabaseClient,
  input: {
    mood?: number;
    theme?: CheckinTheme | null;
    recentEntrySummary?: string;
  }
): Promise<JournalPromptResult> {
  const queryParts = [
    input.theme ?? "self-understanding and everyday psychology",
    input.mood ? `feeling ${MOOD_LABELS[input.mood]}` : "",
    input.recentEntrySummary ?? "",
  ].filter(Boolean);

  const chunks = await retrieveContext(supabase, queryParts.join(". "));

  const result = await callStructured<GeneratedPrompt>(
    {
      type: "object",
      properties: {
        concept_name: {
          type: "string",
          description: "The named psychological concept the prompt is built on",
        },
        concept_explanation: {
          type: "string",
          description:
            "One or two sentences explaining the concept in plain English, grounded in the context passages",
        },
        question: {
          type: "string",
          description:
            "A specific, reflective journaling question applying the concept to the user's situation",
        },
      },
      required: ["concept_name", "concept_explanation", "question"],
      additionalProperties: false,
    },
    `Context passages from David's published writing:

${formatContext(chunks)}

The user is checking in to journal.${input.mood ? ` Mood: ${MOOD_LABELS[input.mood]}.` : ""}${input.theme ? ` They chose the theme: ${input.theme}.` : ""}${input.recentEntrySummary ? ` Themes from their recent entries: ${input.recentEntrySummary}.` : ""}

Generate one journaling prompt built on a psychological concept that appears in the context passages. The question must be specific (not generic), feel personally relevant to their mood and theme, and invite honest reflection rather than performance.`
  );

  const concept = await lookupConcept(supabase, result.concept_name);
  const promptText = `**${result.concept_name}** — ${result.concept_explanation} ${result.question}`;

  return { promptText, conceptName: result.concept_name, concept };
}

/**
 * Generate a post-entry reflection (spec §4.4): max 4 sentences, connects
 * something specific in the entry to a concept from the knowledge base,
 * curious and affirming, ends with an optional follow-up question.
 */
export async function generateReflection(
  supabase: SupabaseClient,
  input: { entryText: string; promptText?: string | null }
): Promise<ReflectionResult> {
  const chunks = await retrieveContext(supabase, input.entryText.slice(0, 4000));

  const result = await callStructured<GeneratedReflection>(
    {
      type: "object",
      properties: {
        reflection: {
          type: "string",
          description:
            "At most 4 sentences. Connects something specific the user wrote to a psychological concept from the context. Curious and affirming, never evaluative or prescriptive. Mention the concept by name.",
        },
        concept_name: {
          type: "string",
          description: "The psychological concept referenced in the reflection",
        },
        follow_up_question: {
          type: "string",
          description:
            "One optional, gentle question the user could explore to go deeper",
        },
      },
      required: ["reflection", "concept_name", "follow_up_question"],
      additionalProperties: false,
    },
    `Context passages from David's published writing:

${formatContext(chunks)}

${input.promptText ? `The journaling prompt was: ${input.promptText}\n\n` : ""}The user's journal entry:

<entry>
${input.entryText}
</entry>

Write a short reflection on this entry following the rules in the schema. Ground the psychology only in the context passages. If the entry suggests distress, crisis, or self-harm, follow your safety instructions instead of a standard reflection.`
  );

  const concept = await lookupConcept(supabase, result.concept_name);

  return {
    reflectionText: result.reflection,
    conceptName: result.concept_name,
    followUpQuestion: result.follow_up_question,
    concept,
  };
}

/**
 * Answer a user's follow-up question about the concept behind their prompt or
 * reflection (spec §3.1).
 */
export async function answerFollowUp(
  supabase: SupabaseClient,
  input: { question: string; conceptName?: string | null }
): Promise<string> {
  const query = [input.conceptName, input.question].filter(Boolean).join(": ");
  const chunks = await retrieveContext(supabase, query);

  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Context passages from David's published writing:

${formatContext(chunks)}

The user is journaling${input.conceptName ? ` and their prompt was built on the concept "${input.conceptName}"` : ""}. They asked this follow-up question:

${input.question}

Answer in 2-5 sentences, in your usual warm plain-English voice, grounded only in the context passages. If the passages don't cover it, say so honestly rather than inventing an answer.`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("Model returned no text content");
  }
  return text.text;
}

interface GeneratedWeekly {
  summary: string;
  themes: { theme: string; count: number }[];
  concept_name: string;
  concept_connection: string;
}

export interface WeeklyInsightResult {
  summary: string;
  themes: { theme: string; count: number }[];
  conceptName: string;
  conceptConnection: string;
  concept: Concept | null;
}

/**
 * Weekly summary (spec §3.3): a short reflective paragraph on the week's
 * themes plus one "this week in psychology" concept connected to them.
 * Framed positively — curiosity and self-discovery, never monitoring.
 */
export async function generateWeeklyInsight(
  supabase: SupabaseClient,
  input: { entries: { created_at: string; entry_text: string; theme: string | null }[] }
): Promise<WeeklyInsightResult> {
  const entriesText = input.entries
    .map(
      (e, i) =>
        `Entry ${i + 1} (${e.created_at.slice(0, 10)}${e.theme ? `, theme: ${e.theme}` : ""}):\n${e.entry_text.slice(0, 1500)}`
    )
    .join("\n\n");

  const chunks = await retrieveContext(supabase, entriesText.slice(0, 4000));

  const result = await callStructured<GeneratedWeekly>(
    {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description:
            "A short paragraph (3-5 sentences) reflecting on themes in the week's entries. Warm, positive framing — self-discovery, not assessment.",
        },
        themes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              theme: { type: "string" },
              count: { type: "integer" },
            },
            required: ["theme", "count"],
            additionalProperties: false,
          },
          description:
            "Up to 5 recurring themes with how many entries touched each",
        },
        concept_name: {
          type: "string",
          description:
            "One psychological concept from the context passages relevant to the week",
        },
        concept_connection: {
          type: "string",
          description:
            "1-2 sentences connecting that concept to the user's week ('this week in psychology')",
        },
      },
      required: ["summary", "themes", "concept_name", "concept_connection"],
      additionalProperties: false,
    },
    `Context passages from David's published writing:

${formatContext(chunks)}

The user's journal entries from this week:

${entriesText}

Generate their weekly insight following the schema.`,
    2048
  );

  const concept = await lookupConcept(supabase, result.concept_name);

  return {
    summary: result.summary,
    themes: result.themes,
    conceptName: result.concept_name,
    conceptConnection: result.concept_connection,
    concept,
  };
}

/**
 * Daily prompt (spec §3.5): one sentence to think about during the day.
 * No journaling required. Generated once per day for all users.
 */
export async function generateDailyPrompt(
  supabase: SupabaseClient
): Promise<{ promptText: string; concept: Concept | null }> {
  // Vary the topic by day so daily prompts rotate across the knowledge base.
  const topics = [
    "habits and behaviour change",
    "relationships and connection",
    "emotions and mood",
    "motivation and work",
    "identity and values",
    "thinking and cognitive biases",
    "wellbeing and resilience",
  ];
  const topic = topics[new Date().getDate() % topics.length];
  const chunks = await retrieveContext(supabase, topic);

  const result = await callStructured<{ prompt: string; concept_name: string }>(
    {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "One sentence to think about during the day — a question or gentle observation grounded in a concept from the context. No journaling instruction, just something to carry.",
        },
        concept_name: { type: "string" },
      },
      required: ["prompt", "concept_name"],
      additionalProperties: false,
    },
    `Context passages from David's published writing:

${formatContext(chunks)}

Generate today's one-sentence daily psychology prompt on the topic of ${topic}.`
  );

  const concept = await lookupConcept(supabase, result.concept_name);
  return { promptText: result.prompt, concept };
}
