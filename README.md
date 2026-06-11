# MyPsych

A psychology-based self-reflection and journaling web app, built on the
published writing of David Webb ([All About Psychology](https://www.all-about-psychology.com/)
and the [All About Psychology Substack](https://allaboutpsychology.substack.com/)).

MyPsych is a reflection tool, not a therapy service. It never diagnoses,
treats, or offers clinical advice.

## Stack

- **Frontend/backend:** Next.js (App Router, TypeScript, Tailwind), mobile-first PWA
- **Database & auth:** Supabase (Postgres + pgvector, magic-link auth)
- **AI:** Anthropic API — `claude-sonnet-4-6` with RAG over David's content
- **Embeddings:** Voyage AI (`voyage-3.5`, 1024 dimensions)
- **Payments:** Stripe ($9.99/month or $79/year)
- **Deployment:** Vercel (with cron jobs for RSS sync, re-crawl, weekly insights)

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values (see comments in the file).
3. Create a Supabase project and apply the schema:
   - Open the Supabase dashboard → SQL editor → paste and run
     `supabase/migrations/0001_init.sql` (or use `supabase db push` with the CLI).
4. `npm run dev`

## Repository layout

| Path | Purpose |
|---|---|
| `supabase/migrations/` | Database schema (tables, RLS, vector search function) |
| `src/lib/supabase/` | Browser, server, admin (service-role) Supabase clients |
| `src/lib/embeddings.ts` | Voyage AI embedding client |
| `src/lib/constants.ts` | Model IDs, themes, tier limits, pricing |
| `scripts/` | Content ingestion (Substack archive import, website crawl) |
| `data/substack-export/` | David's full Substack archive (199 posts + metadata CSV) |
| `docs/` | Product spec |

## Privacy

Journal entries are private to the individual user, enforced by Postgres
Row-Level Security — there is no policy that grants anyone else access.
Entries are never used to train AI models. Claude API calls contain only the
system prompt, retrieved knowledge-base chunks, and the user's current entry.
Users can export all their data and permanently delete their account from
Settings.

## Build phases

- [x] **Phase 1** — Scaffold, database schema, Supabase clients, brand theme
- [x] **Phase 2** — Content ingestion pipeline (archive import, crawler, RSS cron, concepts extraction)
- [x] **Phase 3** — AI layer (RAG retrieval, prompts, reflections, weekly insights)
- [x] **Phase 4** — Screens (home, journal, concepts library, insights, settings)
- [x] **Phase 5** — Auth + Stripe subscriptions and tier gating
- [x] **Phase 6** — Privacy/GDPR features, PWA, deployment guide

See `docs/DEPLOYMENT.md` for the step-by-step launch guide.
