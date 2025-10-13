"use client";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <>
      <SectionTitle title="Dashboard" subtitle="Kurzer Überblick und Schnellstart. (Dummy Inhalt)" />
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-[var(--muted-foreground)]">Umsatz (7T)</div>
          <div className="mt-1 text-2xl font-semibold">€ 3.420</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted-foreground)]">Bestellungen (7T)</div>
          <div className="mt-1 text-2xl font-semibold">128</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-[var(--muted-foreground)]">Conversion Rate</div>
          <div className="mt-1 text-2xl font-semibold">2,9%</div>
        </Card>
      </div>
      <Card className="mt-6 p-6">
        <div className="mb-3 text-sm text-[var(--muted-foreground)]">Zuletzt passiert</div>
        <ul className="space-y-2 text-sm">
          <li>• Neuer Drop geplant – „Creator Hoodie v2“</li>
          <li>• 12 neue Bestellungen seit gestern</li>
          <li>• Giveaway „Hoodie“ nähert sich 60%</li>
        </ul>
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

function SectionAlertbox() {
  return (
    <div>
      <SectionTitle
        title="Alertbox"
        subtitle="Zeige Live‑Käufe direkt im Stream – in Echtzeit und im Streamwear‑Look."
      />
      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-hero opacity-20" />
        <div className="relative text-sm text-[var(--muted-foreground)]">Overlay Preview</div>
        <div className="relative mt-4 space-y-3 sm:w-[520px]">
          {[
            { t: "Creator Hoodie · Größe L · €59,00" },
            { t: "Creator T‑Shirt · Größe M · €29,00" },
            { t: "Merch‑Box · Limited · €89,00" },
          ].map((x, i) => (
            <div
              key={i}
              className="relative isolate flex items-center gap-3 rounded-xl border border-[color-mix(in_hsl,var(--border),white_6%)] bg-black/55 px-4 py-3 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md ring-1 ring-[#9146ff]/35"
            >
              <div className="absolute -inset-px rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)] opacity-70" />
              <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-md bg-[linear-gradient(180deg,rgba(145,70,255,0.95)_0%,rgba(145,70,255,0.6)_100%)] ring-1 ring-[#9146ff]/60">
                <BellRing className="h-5 w-5 text-white" />
              </div>
              <div className="relative min-w-0">
                <div className="text-sm font-semibold">Neuer Kauf</div>
                <div className="text-xs text-[var(--muted-foreground)]">{x.t}</div>
              </div>
              <div className="relative ml-auto h-8 w-8 overflow-hidden rounded-full ring-1 ring-[#9146ff]/40">
                <div className="h-full w-full bg-[linear-gradient(180deg,rgba(145,70,255,0.7)_0%,rgba(145,70,255,0.4)_100%)]" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SectionAnalytics() {
  const chart = [45, 92, 58, 34, 18, 80, 52];
  const labels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL"];
  return (
    <div>
      <SectionTitle
        title="Analytics"
        subtitle="Umsatz, Konversionsraten, Bestseller und Zeitverläufe – Merch‑KPIs im Blick."
      />
      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-hero opacity-20" />
        <div className="relative grid grid-cols-7 items-end gap-3 sm:h-44">
          {chart.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="relative h-40 w-full overflow-hidden rounded-md bg-[var(--muted)]/60 ring-1 ring-black/30">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-md bg-[linear-gradient(180deg,rgba(145,70,255,0.95)_0%,rgba(145,70,255,0.6)_100%)] shadow-[0_8px_24px_-10px_rgba(145,70,255,0.8)]"
                  style={{ height: `${v}%` }}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_46%,rgba(0,0,0,0.08)_54%,rgba(0,0,0,0)_100%)]" />
              </div>
              <span className="text-[10px] tracking-wider text-[var(--muted-foreground)]">{labels[i]}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SectionChatbot() {
  return (
    <div>
      <SectionTitle
        title="Chatbot"
        subtitle="Reagiert automatisch auf !merch mit deinem Shop‑Link."
      />
      <Card className="relative overflow-hidden p-6">
        <div className="relative rounded-[var(--radius-sm)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-3 h-40 overflow-hidden">
          <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Twitch Chat</div>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <span className="font-medium text-[#9146ff]">cool_user123</span>
                <span className="mx-1 opacity-60">:</span>
                <span className="font-semibold">!merch</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <span className="font-medium text-white">streamwear</span>
                <span className="mx-1 opacity-60">:</span>
                <span className="text-[var(--muted-foreground)]">Hey! Hol dir Merch und Drops im offiziellen Shop:</span>
                <a href="https://streamwear.shop" target="_blank" rel="noopener noreferrer" className="ml-1 underline decoration-[#9146ff]/60 underline-offset-2 hover:text-white">streamwear.shop</a>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectionGiveaways() {
  return (
    <div>
      <SectionTitle title="Giveaways" subtitle="Automatisierte Gewinnspiele inkl. Ziehung und Validierung." />
      <Card className="relative overflow-hidden p-6">
        <div className="flex items-center justify-between text-sm">
          <div className="font-medium">Hoodie Giveaway</div>
          <div className="rounded-md bg-black/30 px-2 py-0.5 text-xs ring-1 ring-black/40">Ends in 02:14</div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30 ring-1 ring-black/30">
          <div className="h-full w-1/2 bg-[linear-gradient(90deg,rgba(145,70,255,1)_0%,rgba(145,70,255,0.6)_100%)]" />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>254 Teilnahmen</span>
          <span>50% abgeschlossen</span>
        </div>
      </Card>
    </div>
  );
}

function SectionNotifications() {
  const items = [
    { t: "Sale: 2× Creator Cap", time: "vor 1 Min" },
    { t: "Payout received", time: "vor 1 Std" },
  ];
  return (
    <div>
      <SectionTitle title="Benachrichtigungen" subtitle="Realtime Notifications zu Verkäufen, Payouts und mehr." />
      <Card className="relative overflow-hidden p-6">
        <div className="mt-1 space-y-2">
          {items.map((n) => (
            <div key={n.t} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9146ff] shadow-[0_0_0_3px_rgba(145,70,255,0.25)]" />
              <div className="flex-1 text-sm">{n.t}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{n.time}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

