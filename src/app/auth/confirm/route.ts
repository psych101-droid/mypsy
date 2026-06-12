import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Completes magic-link sign-in (Supabase email OTP confirmation). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // `next` is either a relative path (?next=/journal) or, when filled in by
  // the email template's {{ .RedirectTo }}, an absolute URL. Only follow it
  // when it stays on this site, so the email link can't redirect elsewhere.
  const rawNext = searchParams.get("next");
  let next = "/home";
  if (rawNext) {
    if (rawNext.startsWith("/") && !rawNext.startsWith("//")) {
      next = rawNext;
    } else {
      try {
        const url = new URL(rawNext);
        if (url.origin === new URL(request.url).origin && url.pathname !== "/") {
          next = url.pathname + url.search;
        }
      } catch {
        // Not a path or URL — keep the /home default.
      }
    }
  }

  // Token-hash flow: the email template links directly to this route.
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // PKCE fallback (links sent before the email template switch).
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}
