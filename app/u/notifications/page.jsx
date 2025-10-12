"use client";
import { Card } from "@/components/ui/card";

export default function NotificationsSettings() {
  return (
    <>
      <SectionTitle title="Benachrichtigungen" subtitle="Kanäle & Filter (Dummy)." />
      <Card className="p-6 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm">E-Mail Benachrichtigungen</label>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Push Benachrichtigungen</label>
              <input type="checkbox" className="h-4 w-4" />
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


