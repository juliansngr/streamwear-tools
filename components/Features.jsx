import Image from "next/image";
import { Card } from "@/components/ui/card";
import { BellRing, Bot, Gift, BarChart3, Bell, ChevronDown } from "lucide-react";

export function Features() {
  const chartData = [
    { label: "JAN", value: 45 },
    { label: "FEB", value: 92 },
    { label: "MAR", value: 58 },
    { label: "APR", value: 34 },
    { label: "MAY", value: 18 },
    { label: "JUN", value: 80 },
    { label: "JUL", value: 52 },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-semibold sm:text-3xl">Was dich erwartet</h2>
        <p className="mt-2 text-[var(--muted-foreground)]">Ein kuratierter Werkzeugkasten für Streamer und Brands.</p>
      </div>

      {/* Bento Grid */}
      <div className="mt-10 grid auto-rows-[minmax(140px,auto)] grid-cols-1 gap-6 sm:auto-rows-[minmax(150px,auto)] sm:grid-cols-6">
        {/* Alertbox (groß) */}
        <Card className="relative overflow-hidden sm:col-span-3 sm:row-span-2 p-6 flex flex-col gap-4">
          <div className="absolute inset-0 bg-gradient-hero opacity-25" />
          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--secondary)]">
              <BellRing className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold">Alertbox für Overlays</h3>
          </div>
          <p className="relative text-sm text-[var(--muted-foreground)]">
            Zeige Live‑Käufe direkt im Stream – in Echtzeit, anpassbar und performant.
          </p>
          {/* Overlay Preview */}
          <div className="relative mt-1 h-60 sm:h-64 w-full overflow-hidden rounded-[var(--radius-md)] border border-default bg-[color-mix(in_hsl,var(--muted),black_6%)] p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_200px_at_20%_20%,rgba(145,70,255,0.18),transparent_60%),radial-gradient(400px_200px_at_80%_60%,rgba(145,70,255,0.12),transparent_60%)]" />
            <div className="relative text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">EVENT HISTORY</div>
            {/* Fake alert toasts: Hoodie, T‑Shirt, Merch‑Box */}
            <div className="absolute inset-x-4 top-10 bottom-4 overflow-hidden sm:left-4 sm:right-auto sm:w-[420px] flex flex-col gap-2">
              {/* Hoodie */}
              <div className="relative isolate flex items-center gap-3 rounded-xl border border-[color-mix(in_hsl,var(--border),white_6%)] bg-black/55 px-4 py-2 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md ring-1 ring-[#9146ff]/35">
                <div className="absolute -inset-px rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)] opacity-70" />
                <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-[linear-gradient(180deg,rgba(145,70,255,0.95)_0%,rgba(145,70,255,0.6)_100%)] ring-1 ring-[#9146ff]/60">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div className="relative min-w-0">
                  <div className="text-sm font-semibold">Neuer Kauf</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Creator Hoodie · Größe L · <span className="text-white/90">€59,00</span></div>
                </div>
                <div className="relative ml-auto h-8 w-8 overflow-hidden rounded-full ring-1 ring-[#9146ff]/40">
                  <div className="h-full w-full bg-[linear-gradient(180deg,rgba(145,70,255,0.7)_0%,rgba(145,70,255,0.4)_100%)]" />
                </div>
              </div>
              {/* T‑Shirt */}
              <div className="relative isolate flex items-center gap-3 rounded-xl border border-[color-mix(in_hsl,var(--border),white_6%)] bg-black/55 px-4 py-2 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md ring-1 ring-[#9146ff]/35">
                <div className="absolute -inset-px rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)] opacity-70" />
                <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-[linear-gradient(180deg,rgba(145,70,255,0.95)_0%,rgba(145,70,255,0.6)_100%)] ring-1 ring-[#9146ff]/60">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div className="relative min-w-0">
                  <div className="text-sm font-semibold">Neuer Kauf</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Creator T‑Shirt · Größe M · <span className="text-white/90">€29,00</span></div>
                </div>
                <div className="relative ml-auto h-8 w-8 overflow-hidden rounded-full ring-1 ring-[#9146ff]/40">
                  <div className="h-full w-full bg-[linear-gradient(180deg,rgba(145,70,255,0.7)_0%,rgba(145,70,255,0.4)_100%)]" />
                </div>
              </div>
              {/* Merch‑Box */}
              <div className="relative isolate flex items-center gap-3 rounded-xl border border-[color-mix(in_hsl,var(--border),white_6%)] bg-black/55 px-4 py-2 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md ring-1 ring-[#9146ff]/35">
                <div className="absolute -inset-px rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)] opacity-70" />
                <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-[linear-gradient(180deg,rgba(145,70,255,0.95)_0%,rgba(145,70,255,0.6)_100%)] ring-1 ring-[#9146ff]/60">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div className="relative min-w-0">
                  <div className="text-sm font-semibold">Neuer Kauf</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Merch‑Box · Limited · <span className="text-white/90">€89,00</span></div>
                </div>
                <div className="relative ml-auto h-8 w-8 overflow-hidden rounded-full ring-1 ring-[#9146ff]/40">
                  <div className="h-full w-full bg-[linear-gradient(180deg,rgba(145,70,255,0.7)_0%,rgba(145,70,255,0.4)_100%)]" />
                </div>
              </div>
              {/* T‑Shirt 2 */}
              <div className="relative isolate flex items-center gap-3 rounded-xl border border-[color-mix(in_hsl,var(--border),white_6%)] bg-black/55 px-4 py-2 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md ring-1 ring-[#9146ff]/35">
                <div className="absolute -inset-px rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)] opacity-70" />
                <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-[linear-gradient(180deg,rgba(145,70,255,0.95)_0%,rgba(145,70,255,0.6)_100%)] ring-1 ring-[#9146ff]/60">
                  <BellRing className="h-5 w-5 text-white" />
                </div>
                <div className="relative min-w-0">
                  <div className="text-sm font-semibold">Neuer Kauf</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Creator T‑Shirt · Größe L · <span className="text-white/90">€29,00</span></div>
                </div>
                <div className="relative ml-auto h-8 w-8 overflow-hidden rounded-full ring-1 ring-[#9146ff]/40">
                  <div className="h-full w-full bg-[linear-gradient(180deg,rgba(145,70,255,0.7)_0%,rgba(145,70,255,0.4)_100%)]" />
                </div>
              </div>
            </div>
            {/* bottom fade */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[color-mix(in_hsl,var(--muted),black_12%)] to-transparent" />
          </div>
        </Card>

        {/* Analytics (groß) */}
        <Card className="relative overflow-hidden sm:col-span-3 sm:row-span-2 p-6 flex flex-col gap-4">
          <div className="absolute inset-0 bg-gradient-hero opacity-20" />
          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--secondary)]">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold">Analytics & Reporting</h3>
          </div>
          <p className="relative text-sm text-[var(--muted-foreground)]">
            Umsatz, Konversionsraten, Bestseller und Zeitverläufe – Merch‑KPIs im Blick.
          </p>

          {/* Mini Chart Panel */}
          <div className="relative rounded-[var(--radius-md)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-4 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold">Stats</div>
              <div className="inline-flex items-center gap-1 rounded-md bg-black/30 px-3 py-1 text-xs ring-1 ring-black/40">
                LAST 28 DAYS <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 items-end gap-2 sm:gap-3">
              {chartData.map((d) => (
                <div key={d.label} className="group flex flex-col items-center gap-2">
                  <div className="relative h-32 sm:h-36 w-full overflow-hidden rounded-md bg-[var(--muted)]/60 ring-1 ring-black/30">
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-md bg-[linear-gradient(180deg,rgba(145,70,255,0.95)_0%,rgba(145,70,255,0.6)_100%)] shadow-[0_8px_24px_-10px_rgba(145,70,255,0.8)]"
                      style={{ height: `${d.value}%` }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_46%,rgba(0,0,0,0.08)_54%,rgba(0,0,0,0)_100%)]" />
                  </div>
                  <span className="text-[10px] tracking-wider text-[var(--muted-foreground)]">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Chatbot */}
        <Card className="relative overflow-hidden sm:col-span-2 sm:row-span-1 p-6">
          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--secondary)]">
              <Bot className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold">streamwear. Chatbot</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Beantwortet Fragen zu Größen, Versand, Drops – 24/7.</p>
          {/* Twitch-like Chat Preview */}
          <div className="mt-3 relative rounded-[var(--radius-sm)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-3 h-28 overflow-hidden">
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Twitch Chat</div>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {/* User message */}
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1">
                    <Image src="/sub.png" alt="Subscriber" width={14} height={14} />
                    <span className="font-medium text-[#9146ff]">cool_user123</span>
                  </span>
                  <span className="mx-1 opacity-60">:</span>
                  <span className="font-semibold">!merch</span>
                </div>
              </div>
              {/* Bot reply */}
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1">
                    <Image src="/mod.png" alt="Moderator" width={14} height={14} />
                    <span className="font-medium text-white">streamwear</span>
                  </span>
                  <span className="mx-1 opacity-60">:</span>
                  <span className="text-[var(--muted-foreground)]">
                    Hey! Hol dir Merch und exklusive Drops im offiziellen Shop:
                  </span>
                  <a
                    href="https://streamwear.shop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline decoration-[#9146ff]/60 underline-offset-2 hover:text-white"
                  >
                    streamwear.shop
                  </a>
                </div>
              </div>
              {/* bottom fade */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[color-mix(in_hsl,var(--muted),black_10%)] to-transparent" />
            </div>
          </div>
        </Card>

        {/* Giveaways */}
        <Card className="relative overflow-hidden sm:col-span-2 sm:row-span-1 p-6">
          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--secondary)]">
              <Gift className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold">streamwear. Giveaways</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Automatisierte Gewinnspiele inkl. Ziehung und Validierung.</p>
          {/* Giveaway Preview */}
          <div className="mt-3 rounded-[var(--radius-sm)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium">Hoodie Drop Giveaway</div>
              <div className="rounded-md bg-black/30 px-2 py-0.5 text-xs ring-1 ring-black/40">Ends in 02:14</div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30 ring-1 ring-black/30">
              <div className="h-full w-1/2 bg-[linear-gradient(90deg,rgba(145,70,255,1)_0%,rgba(145,70,255,0.6)_100%)]" />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
              <span>254 Teilnahmen</span>
              <span>50% abgeschlossen</span>
            </div>
          </div>
        </Card>

        {/* Realtime Notifications */}
        <Card className="relative overflow-hidden sm:col-span-2 sm:row-span-1 p-6">
          <div className="relative flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--secondary)]">
              <Bell className="h-5 w-5" />
            </span>
            <h3 className="text-base font-semibold">Realtime Notifications</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Benachrichtigungen für Verkäufe, Low‑Stock, Payouts & mehr.</p>
          {/* Notifications Preview */}
          <div className="mt-3 space-y-2">
            {[
              { t: "Sale: 2× Creator Cap", time: "vor 1 Min" },
              { t: "Payout received", time: "vor 1 Std" },
            ].map((n) => (
              <div key={n.t} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#9146ff] shadow-[0_0_0_3px_rgba(145,70,255,0.25)]" />
                <div className="flex-1 text-sm">{n.t}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{n.time}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}


