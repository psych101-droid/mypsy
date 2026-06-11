import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook — the single source of truth for subscription state.
 * Configure the endpoint in the Stripe dashboard with events:
 *   checkout.session.completed, customer.subscription.updated,
 *   customer.subscription.deleted
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  async function syncSubscription(subscription: Stripe.Subscription) {
    const userId = subscription.metadata?.supabase_user_id;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    // Resolve the user from metadata, falling back to the stored customer id.
    let targetUserId = userId;
    if (!targetUserId) {
      const { data } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      targetUserId = data?.user_id;
    }
    if (!targetUserId) return;

    const item = subscription.items.data[0];
    const periodEnd = item?.current_period_end;

    await admin.from("subscriptions").upsert({
      user_id: targetUserId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status === "canceled" ? "canceled" : subscription.status,
      plan: (subscription.metadata?.plan as "monthly" | "annual") ?? null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        await syncSubscription(subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
