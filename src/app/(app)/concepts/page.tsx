import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CONCEPT_THEMES } from "@/lib/constants";

export const metadata = { title: "Concepts" };

export default async function ConceptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; theme?: string }>;
}) {
  const { q, theme } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("concepts")
    .select("slug, name, explanation, theme")
    .order("name");
  if (theme && (CONCEPT_THEMES as string[]).includes(theme)) {
    query = query.eq("theme", theme);
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,explanation.ilike.%${q}%`);
  }
  const { data: concepts } = await query.limit(200);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-navy-900">
          Psychology concepts
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Real psychological ideas from David&apos;s writing, in plain English.
        </p>
      </header>

      <form method="GET" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search concepts…"
          className="flex-1 rounded-xl border border-navy-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-navy-600"
        />
        {theme && <input type="hidden" name="theme" value={theme} />}
        <button
          type="submit"
          className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Link
          href={q ? `/concepts?q=${encodeURIComponent(q)}` : "/concepts"}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            !theme
              ? "border-navy-600 bg-navy-900 text-white"
              : "border-navy-100 bg-white text-ink"
          }`}
        >
          All
        </Link>
        {CONCEPT_THEMES.map((t) => (
          <Link
            key={t}
            href={`/concepts?theme=${encodeURIComponent(t)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              theme === t
                ? "border-navy-600 bg-navy-900 text-white"
                : "border-navy-100 bg-white text-ink hover:bg-navy-50"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {!concepts || concepts.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-soft">
          {q
            ? "No concepts match that search."
            : "The concepts library is being built — check back soon."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {concepts.map((concept) => (
            <li key={concept.slug}>
              <Link
                href={`/concepts/${concept.slug}`}
                className="block h-full rounded-2xl border border-navy-100 bg-white p-4 hover:border-navy-600 transition-colors"
              >
                <p className="text-[10px] font-medium uppercase tracking-widest text-amber-600">
                  {concept.theme}
                </p>
                <h2 className="mt-1 font-medium text-navy-900">
                  {concept.name}
                </h2>
                <p className="mt-1 line-clamp-3 text-sm text-ink-soft">
                  {concept.explanation}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
