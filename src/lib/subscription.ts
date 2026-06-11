import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_ENTRIES_PER_MONTH } from "./constants";
import type { Subscription } from "./types";

export async function getSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Subscription) ?? null;
}

export function isPaid(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return (
    subscription.status === "active" || subscription.status === "trialing"
  );
}

/** Number of journal entries the user has written this calendar month. */
export async function entriesThisMonth(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  return count ?? 0;
}

export interface TierStatus {
  paid: boolean;
  entriesThisMonth: number;
  entriesLimit: number | null; // null = unlimited
  canCreateEntry: boolean;
}

export async function getTierStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<TierStatus> {
  const subscription = await getSubscription(supabase, userId);
  const paid = isPaid(subscription);
  const used = await entriesThisMonth(supabase, userId);

  return {
    paid,
    entriesThisMonth: used,
    entriesLimit: paid ? null : FREE_ENTRIES_PER_MONTH,
    canCreateEntry: paid || used < FREE_ENTRIES_PER_MONTH,
  };
}
