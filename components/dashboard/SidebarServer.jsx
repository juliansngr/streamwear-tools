import { createClient } from "@/supabase/serverClient";
import { Sidebar } from "@/components/dashboard/Sidebar";

export async function SidebarServer() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    return <Sidebar isAdmin={false} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const isAdmin = String(profile?.role || "")
    .trim()
    .toLowerCase() === "admin";

  return <Sidebar isAdmin={isAdmin} />;
}

