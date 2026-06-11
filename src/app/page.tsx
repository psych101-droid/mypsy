import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 bg-paper-warm">
      <div className="max-w-xl text-center">
        <p className="text-sm font-medium tracking-widest uppercase text-amber-600">
          All About Psychology
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight text-navy-900">
          {APP_NAME}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          {APP_TAGLINE}
        </p>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Reflect on your thoughts, feelings, and behaviour through the lens of
          real psychology — guided by prompts grounded in 18 years of published
          work, not generic wellness advice.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full bg-navy-900 px-6 py-3 text-sm font-medium text-white hover:bg-navy-800 transition-colors"
          >
            Start journaling
          </Link>
          <Link
            href="/concepts"
            className="rounded-full border border-navy-100 bg-white px-6 py-3 text-sm font-medium text-navy-900 hover:bg-navy-50 transition-colors"
          >
            Browse concepts
          </Link>
        </div>
        <p className="mt-10 text-xs text-ink-soft/70">
          {APP_NAME} is a reflection tool, not a therapy service. It never
          diagnoses or offers clinical advice.
        </p>
      </div>
    </main>
  );
}
