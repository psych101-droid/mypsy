import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // First sign-in: show onboarding once. The flag is set in auth user
  // metadata when the flow is completed.
  if (!user.user_metadata?.onboarding_completed) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-paper-warm">
      <div className="mx-auto w-full max-w-lg flex-1 px-5 pb-24 pt-8">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
