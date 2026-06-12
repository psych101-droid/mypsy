import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-navy-900">
          About {APP_NAME}
        </h1>
      </header>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-sm font-medium text-navy-900">What {APP_NAME} is</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {APP_NAME} is a personal psychology companion: a quiet place to check
          in with your mood, write, and reflect with prompts grounded in real,
          published psychology. It&apos;s a tool for self-understanding — not a
          therapy service, and not a replacement for professional support.
        </p>
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-sm font-medium text-navy-900">Who David Webb is</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          David Webb is the creator, writer, and host of All About Psychology.
          He holds a first class honours degree in psychology and a
          master&apos;s in occupational psychology, and was for a number of
          years a lecturer in psychology at the University of Huddersfield
          (UK). A bestselling author, his books include{" "}
          <em>The Psychology Student Guide</em> and{" "}
          <em>On This Day in Psychology</em>.
        </p>
      </section>

      <section className="rounded-2xl border border-navy-100 bg-white p-5">
        <h2 className="text-sm font-medium text-navy-900">
          All About Psychology
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Launched in 2008, All About Psychology is one of the world&apos;s most
          visited psychology websites, alongside a long-running newsletter.
          Every prompt, concept, and insight in {APP_NAME} is drawn from 18
          years of this published content — real psychological ideas with real
          sources, not generic wellness advice.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a
              href="https://allaboutpsychology.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-navy-700 underline"
            >
              allaboutpsychology.substack.com
            </a>
          </li>
          <li>
            <a
              href="https://www.all-about-psychology.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-navy-700 underline"
            >
              all-about-psychology.com
            </a>
          </li>
        </ul>
      </section>

      <p className="text-center text-xs text-ink-soft/70">
        <Link href="/settings" className="underline">
          ← Back to settings
        </Link>
      </p>
    </main>
  );
}
