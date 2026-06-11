import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTierStatus } from "@/lib/subscription";
import { FavoriteButton } from "@/components/FavoriteButton";

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: concept } = await supabase
    .from("concepts")
    .select("id, slug, name, explanation, theme, source_url, content_items(title)")
    .eq("slug", slug)
    .maybeSingle();

  if (!concept) notFound();

  const [tier, { data: favorite }] = await Promise.all([
    getTierStatus(supabase, user!.id),
    supabase
      .from("favorites")
      .select("concept_id")
      .eq("user_id", user!.id)
      .eq("concept_id", concept.id)
      .maybeSingle(),
  ]);

  const sourceTitle = (
    concept.content_items as unknown as { title: string } | null
  )?.title;

  return (
    <main className="space-y-6">
      <Link href="/concepts" className="text-sm text-ink-soft underline">
        ← All concepts
      </Link>

      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-amber-600">
          {concept.theme}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-navy-900">
          {concept.name}
        </h1>
      </header>

      <p className="journal-surface text-ink">{concept.explanation}</p>

      <div className="flex flex-wrap items-center gap-3">
        {tier.paid ? (
          <FavoriteButton
            conceptId={concept.id}
            initiallyFavorited={!!favorite}
          />
        ) : (
          <p className="text-xs text-ink-soft">
            <Link href="/settings" className="underline">
              Upgrade
            </Link>{" "}
            to save favourites and read the full articles.
          </p>
        )}
      </div>

      {concept.source_url && tier.paid && (
        <section className="rounded-2xl border border-navy-100 bg-white p-5">
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink-soft">
            Where this comes from
          </h2>
          <a
            href={concept.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block font-medium text-navy-700 underline"
          >
            {sourceTitle ?? "Read the original article"} →
          </a>
        </section>
      )}
    </main>
  );
}
