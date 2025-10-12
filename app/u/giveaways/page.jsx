"use client";
import { Card } from "@/components/ui/card";

export default function GiveawaysSettings() {
  return (
    <>
      <SectionTitle title="Giveaways" subtitle="Regeln & Teilnahme (Dummy)." />
      <Card className="p-6 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm">Teilnahme Schlüsselwort</label>
              <input type="text" defaultValue="!giveaway" className="h-9 rounded-md border border-default bg-transparent px-3" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Max. Teilnehmer</label>
              <input type="number" defaultValue={500} className="h-9 rounded-md border border-default bg-transparent px-3" />
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


