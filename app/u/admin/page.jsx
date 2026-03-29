"use server";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/supabase/serverClient";
import { redirect } from "next/navigation";
import { AdminQuickActions } from "./AdminQuickActions";
import { AdminUsersCard } from "./AdminUsersCard";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const isAdmin =
    String(profile?.role || "").trim().toLowerCase() === "admin";
  if (!isAdmin) {
    redirect("/u/dashboard");
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-muted-foreground">
          Dummy-Panel – kommt bald. Nur für Admins sichtbar.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">System</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
          <div className="mt-3 text-xs text-muted-foreground">
            Platzhalter für Health-Checks, Jobs, Queue-Status etc.
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Benutzer & Rollen</div>
          <div className="mt-1 text-2xl font-semibold">—</div>
          <div className="mt-3 text-xs text-muted-foreground">
            Platzhalter für Rollenverwaltung (z. B. Admin/Support).
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Aktionen</div>
          <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[#9146ff]/15 text-[#c6a3ff] ring-1 ring-[#9146ff]/30">
            Coming Soon
          </span>
        </div>

        <div className="space-y-3">
          <div className="rounded-sm border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-3">
            <AdminQuickActions />
          </div>

          <div className="rounded-sm border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  Reindex / Sync starten
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Platzhalter – später mit echten Admin-Aktionen verbinden.
                </div>
              </div>
              <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[color-mix(in_hsl,var(--muted),black_10%)] text-muted-foreground ring-1 ring-[color-mix(in_hsl,var(--muted-foreground),transparent_70%)]">
                Disabled
              </span>
            </div>
          </div>

          <Separator />

          <div className="rounded-sm border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-3">
            <div className="text-xs text-muted-foreground">
              Eingeloggt als{" "}
              <span className="font-medium text-foreground">
                {profile?.display_name || "Admin"}
              </span>{" "}
              (role: <span className="font-mono">admin</span>)
            </div>
          </div>
        </div>
      </Card>

      <AdminUsersCard />
    </>
  );
}

