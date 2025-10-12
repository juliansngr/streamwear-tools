"use client";
import { Card } from "@/components/ui/card";

export default function AnalyticsSettings() {
  return (
    <>
      <SectionTitle title="Analytics" subtitle="Einstellungen & Quellen (Dummy)." />
      <Card className="p-6 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm">Zeitraum</label>
              <select className="h-9 rounded-md border border-default bg-transparent px-3">
                <option>Letzte 7 Tage</option>
                <option>Letzte 28 Tage</option>
                <option>Letzte 90 Tage</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Währung</label>
              <select className="h-9 rounded-md border border-default bg-transparent px-3">
                <option>EUR</option>
                <option>USD</option>
              </select>
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


