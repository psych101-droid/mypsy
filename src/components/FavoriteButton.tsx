"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FavoriteButton({
  conceptId,
  initiallyFavorited,
}: {
  conceptId: string;
  initiallyFavorited: boolean;
}) {
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (favorited) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("concept_id", conceptId);
      setFavorited(false);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, concept_id: conceptId });
      setFavorited(true);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        favorited
          ? "border-amber-500 bg-amber-100 text-amber-600"
          : "border-navy-100 bg-white text-navy-900 hover:bg-navy-50"
      }`}
    >
      {favorited ? "★ Saved" : "☆ Save to favourites"}
    </button>
  );
}
