# Deploying MyPsych

Everything you need to take MyPsych live. Follow the sections in order —
about 45 minutes the first time. Where a value is needed, this guide says
exactly where to get it and exactly where to put it.

## 1. Supabase (database + sign-in)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine to start).
2. Apply the database schema: in the Supabase dashboard, open **SQL Editor →
   New query**, paste the entire contents of
   `supabase/migrations/0001_init.sql`, and click **Run**.
3. Configure magic-link emails: **Authentication → URL Configuration** — set
   *Site URL* to your production URL (e.g. `https://mypsych.app`) and add
   `https://YOUR-DOMAIN/auth/confirm` to *Redirect URLs*.
4. Collect three values from **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(keep secret — server only)*

## 2. Anthropic (the AI layer)

1. Create an API key at [console.anthropic.com](https://console.anthropic.com) → API keys.
2. That's `ANTHROPIC_API_KEY`.

## 3. Voyage AI (embeddings for search/retrieval)

1. Create an API key at [dash.voyageai.com](https://dash.voyageai.com).
2. That's `VOYAGE_API_KEY`.

## 4. Stripe (subscriptions — start in test mode)

1. In the [Stripe dashboard](https://dashboard.stripe.com) (toggle **Test mode** on):
   - **Product catalog → Add product**: name it *MyPsych*, add two recurring
     prices: **$9.99 / month** and **$79 / year**.
   - Copy each price's ID (starts `price_`) →
     `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_ANNUAL`.
2. **Developers → API keys**: copy the *Secret key* (starts `sk_test_`) →
   `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
   - Events: `checkout.session.completed`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the *Signing secret* (starts `whsec_`) → `STRIPE_WEBHOOK_SECRET`.
4. When you're ready for real payments, repeat with Test mode off and swap
   the four Stripe values for their live equivalents.

## 5. Vercel (hosting + scheduled jobs)

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
   (framework auto-detects as Next.js — no settings to change).
2. **Project → Settings → Environment Variables** — add every variable below
   (all environments):

   | Variable | From |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase, step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase, step 1 |
   | `ANTHROPIC_API_KEY` | Anthropic, step 2 |
   | `VOYAGE_API_KEY` | Voyage, step 3 |
   | `STRIPE_SECRET_KEY` | Stripe, step 4 |
   | `STRIPE_WEBHOOK_SECRET` | Stripe, step 4 |
   | `STRIPE_PRICE_MONTHLY` | Stripe, step 4 |
   | `STRIPE_PRICE_ANNUAL` | Stripe, step 4 |
   | `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://mypsych.app` |
   | `CRON_SECRET` | Any long random string (e.g. run `openssl rand -hex 32`) |

3. Deploy. The cron jobs in `vercel.json` activate automatically: daily
   Substack sync (6:00 UTC), daily prompt (5:30 UTC), weekly insights
   (Mon 5:00 UTC), weekly site re-crawl (Mon 4:00 UTC). Vercel sends the
   `CRON_SECRET` automatically — no extra setup.

## 6. Load the knowledge base (one-time)

Run these from your machine (or any environment with the repo and a
`.env.local` containing the Supabase, Voyage, and Anthropic values):

```bash
npm install

# 1. Import the full Substack archive (199 posts, ~10–20 min for embeddings)
npm run ingest:archive

# 2. Crawl all-about-psychology.com (respects the spec's include/exclude rules)
npm run ingest:website

# 3. Build the concepts library from the ingested content
npm run ingest:concepts
```

All three are safe to re-run: unchanged content is skipped, concepts are
deduplicated.

## 7. Smoke test

1. Open the site on your phone, sign in with a magic link.
2. Complete a mood check-in → you should get a concept-grounded prompt.
3. Write a short entry → free accounts save it; to test reflections, upgrade
   via Stripe test mode using card number `4242 4242 4242 4242`, any future
   expiry, any CVC.
4. Check Settings → export downloads a JSON file.
5. Add to home screen (browser menu → "Add to Home Screen") to confirm the
   PWA installs with the MyPsych icon.
