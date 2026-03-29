"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/supabase/serverClient";
import { supabaseAdmin } from "@/supabase/supabaseAdmin";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function monthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(key) {
  const [y, m] = String(key).split("-");
  const d = new Date(Number(y), Math.max(0, Number(m) - 1), 1);
  return new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(d);
}

function formatPercent(rate) {
  const n = toNumber(rate);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 2 }).format(n);
}

function formatMoney(amount, currency) {
  const c = currency || "EUR";
  const n = toNumber(amount);
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: c }).format(n);
  } catch {
    return `${n.toFixed(2)} ${c}`;
  }
}

function addSumByCurrency(map, currency, amount) {
  const c = currency || "EUR";
  const prev = map.get(c) || 0;
  map.set(c, prev + toNumber(amount));
}

function streamerLabel(profile) {
  const name = String(profile?.display_name || "").trim();
  const twitch = String(profile?.twitch_username || "").trim();
  if (name && twitch) return `${name} (@${twitch})`;
  if (name) return name;
  if (twitch) return `@${twitch}`;
  const handle = String(profile?.collection_handle || "").trim();
  if (handle) return handle;
  return "Streamer";
}

export default async function AdminPayoutPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const isAdmin = String(profile?.role || "").trim().toLowerCase() === "admin";
  if (!isAdmin) redirect("/u/dashboard");

  // Load payout-relevant items (only mapped to a streamer).
  // Limit protects the server render from extremely large datasets.
  // IMPORTANT: Use supabaseAdmin here so the admin panel shows ALL streamers/items,
  // regardless of any RLS rules on shop_order_items/profiles.
  const { data: rows, error } = await supabaseAdmin
    .from("shop_order_items")
    .select(
      [
        "id",
        "order_created_at",
        "currency",
        "shopify_connector_id",
        "lineitem_name",
        "lineitem_quantity",
        "lineitem_price",
        "commission_rate",
        "commission_amount",
        "profiles(display_name,twitch_username,collection_handle)",
      ].join(","),
    )
    .not("shopify_connector_id", "is", null)
    .order("order_created_at", { ascending: false })
    .limit(10000);

  if (error) {
    return (
      <>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Payouts</h1>
          <p className="mt-1 text-muted-foreground">
            Konnte Daten nicht laden: <span className="font-mono">{error.message}</span>
          </p>
        </header>
      </>
    );
  }

  const items = Array.isArray(rows) ? rows : [];

  // Group: month -> streamer_uuid -> { profile, items[] }
  const byMonth = new Map();

  for (const r of items) {
    const createdAt = r?.order_created_at ? new Date(r.order_created_at) : null;
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) continue;
    const mKey = monthKey(createdAt);

    const streamerUuid = r?.shopify_connector_id ? String(r.shopify_connector_id) : null;
    if (!streamerUuid) continue;

    if (!byMonth.has(mKey)) byMonth.set(mKey, new Map());
    const byStreamer = byMonth.get(mKey);

    if (!byStreamer.has(streamerUuid)) {
      byStreamer.set(streamerUuid, {
        streamerUuid,
        profile: r?.profiles || null,
        items: [],
        sumByCurrency: new Map(),
      });
    }

    const bucket = byStreamer.get(streamerUuid);
    bucket.items.push(r);
    addSumByCurrency(bucket.sumByCurrency, r?.currency, r?.commission_amount);
  }

  const monthKeys = Array.from(byMonth.keys()).sort((a, b) => (a < b ? 1 : -1));

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <p className="mt-1 text-muted-foreground">
          Übersicht über <span className="font-mono">shop_order_items</span>, gruppiert nach Monat
          und Streamer (<span className="font-mono">shopify_connector_id</span>).
        </p>
      </header>

      {monthKeys.length === 0 ? (
        <Card className="p-6 text-muted-foreground">Noch keine Einträge gefunden.</Card>
      ) : (
        <div className="space-y-6">
          {monthKeys.map((mKey) => {
            const byStreamer = byMonth.get(mKey);
            const streamers = Array.from(byStreamer.values()).sort((a, b) =>
              streamerLabel(a.profile).localeCompare(streamerLabel(b.profile), "de-DE"),
            );

            // Month totals by currency
            const monthSums = new Map();
            for (const s of streamers) {
              for (const [cur, amt] of s.sumByCurrency.entries()) {
                addSumByCurrency(monthSums, cur, amt);
              }
            }

            return (
              <Card key={mKey} className="p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Monat</div>
                    <div className="mt-1 text-xl font-semibold">{formatMonthLabel(mKey)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {streamers.length} Streamer
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Summe Provision</div>
                    <div className="mt-1 text-sm font-semibold tabular-nums">
                      {Array.from(monthSums.entries()).length
                        ? Array.from(monthSums.entries())
                            .map(([cur, amt]) => formatMoney(amt, cur))
                            .join(" · ")
                        : "—"}
                    </div>
                  </div>
                </div>

                <Separator className="my-5" />

                <div className="space-y-3">
                  {streamers.map((s) => {
                    const name = streamerLabel(s.profile);
                    const itemCount = s.items.length;
                    const sumLabel = Array.from(s.sumByCurrency.entries())
                      .map(([cur, amt]) => formatMoney(amt, cur))
                      .join(" · ");

                    return (
                      <details
                        key={s.streamerUuid}
                        className="group rounded-(--radius-md) border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)]"
                      >
                        <summary className="cursor-pointer list-none px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{name}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {itemCount} Position{itemCount === 1 ? "" : "en"}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-xs text-muted-foreground">Provision</div>
                              <div className="mt-0.5 text-sm font-semibold tabular-nums">
                                {sumLabel || "—"}
                              </div>
                            </div>
                          </div>
                        </summary>

                        <div className="px-4 pb-4">
                          <div className="overflow-hidden rounded-(--radius-md) border border-default">
                            <div className="grid grid-cols-[1.6fr_.6fr_.7fr_.6fr_.7fr] gap-3 bg-[color-mix(in_hsl,var(--muted),black_6%)] px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <div>Produkt</div>
                              <div className="text-right">Qty</div>
                              <div className="text-right">Preis</div>
                              <div className="text-right">Rate</div>
                              <div className="text-right">Provision</div>
                            </div>
                            <div className="divide-y divide-border">
                              {s.items.map((it) => {
                                const currency = it?.currency || "EUR";
                                return (
                                  <div
                                    key={it.id}
                                    className="grid grid-cols-[1.6fr_.6fr_.7fr_.6fr_.7fr] gap-3 px-3 py-2 text-sm"
                                  >
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">
                                        {it?.lineitem_name || "—"}
                                      </div>
                                    </div>
                                    <div className="text-right tabular-nums">
                                      {it?.lineitem_quantity ?? "—"}
                                    </div>
                                    <div className="text-right tabular-nums">
                                      {formatMoney(it?.lineitem_price ?? 0, currency)}
                                    </div>
                                    <div className="text-right tabular-nums">
                                      {it?.commission_rate == null
                                        ? "—"
                                        : formatPercent(it.commission_rate)}
                                    </div>
                                    <div className="text-right tabular-nums">
                                      {it?.commission_amount == null
                                        ? "—"
                                        : formatMoney(it.commission_amount, currency)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          {items.length >= 10000 ? (
            <Card className="p-4 text-xs text-muted-foreground">
              Hinweis: Es wurden maximal 10.000 Einträge geladen (Limit als Schutz). Falls du mehr
              brauchst, erweitere ich Paging/Filter (z.B. Monat-Auswahl).
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}

