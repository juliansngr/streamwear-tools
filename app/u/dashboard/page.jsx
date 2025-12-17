"use server";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/supabase/serverClient";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from("shopify_connectors")
    .select("display_name")
    .eq("user_id", userData?.user?.id)
    .single();

  return (
    <>
      <SectionTitle
        title={`Hey ${
          profileData?.display_name ? profileData?.display_name : ""
        } 👋`}
        subtitle="Überblick – kommt bald"
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted-foreground)]">
              Bestellungen (30T)
            </div>
            <SoonBadge />
          </div>
          <div className="mt-1 text-2xl font-semibold">—</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted-foreground)]">
              Provision (30T)
            </div>
            <SoonBadge />
          </div>
          <div className="mt-1 text-2xl font-semibold">—</div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-[var(--muted-foreground)]">
            Aktivität
          </div>
          <SoonBadge />
        </div>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <div className="h-3 w-40 rounded bg-black/30 animate-pulse" />
                <div className="h-2 w-16 rounded bg-black/20 animate-pulse" />
              </div>
              <div className="mt-3 space-y-2">
                {[0, 1].map((j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-2"
                  >
                    <div className="flex-1">
                      <div className="h-3 w-44 rounded bg-black/30 animate-pulse" />
                      <div className="mt-2 h-2 w-24 rounded bg-black/20 animate-pulse" />
                    </div>
                    <div className="ml-4 h-3 w-10 rounded bg-emerald-900/40 animate-pulse" />
                  </div>
                ))}
              </div>
              {i < 2 && <Separator className="my-6" />}
            </div>
          ))}
        </div>
        <div className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          Kommt bald
        </div>
      </Card>
    </>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-[var(--muted-foreground)]">{subtitle}</p>
      )}
    </header>
  );
}

function SoonBadge() {
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[#9146ff]/15 text-[#c6a3ff] ring-1 ring-[#9146ff]/30">
      Coming Soon
    </span>
  );
}
