"use client";
import { Card } from "@/components/ui/card";

export default function ChatbotSettings() {
  return (
    <>
      <SectionTitle title="Chatbot" subtitle="Antwort-Trigger & Nachrichten (Dummy)." />
      <Card className="p-6 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm">Trigger Befehl</label>
              <input type="text" defaultValue="!merch" className="h-9 rounded-md border border-default bg-transparent px-3" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Antwort-Nachricht</label>
              <textarea defaultValue="Hol dir Merch im offiziellen Shop: https://streamwear.shop" className="min-h-24 rounded-md border border-default bg-transparent px-3 py-2" />
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


