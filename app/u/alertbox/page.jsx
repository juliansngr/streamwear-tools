"use client";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browserClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OverlayAlert } from "@/components/alert/OverlayAlert";

export default function AlertboxSettings() {
  const [overlayUrl, setOverlayUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from("shopify_connectors")
          .select("uuid")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (error) return;
        const uuid = data?.uuid;
        if (uuid) {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          setOverlayUrl(`${origin}/alertbox/${uuid}`);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyUrl = async () => {
    if (!overlayUrl) return;
    try {
      await navigator.clipboard.writeText(overlayUrl);
    } catch {}
  };
  return (
    <>
      <SectionTitle title="Alertbox" subtitle="Einstellungen für Overlays (Dummy)." />
      <Card className="p-6 grid gap-6">
        <div className="grid gap-2">
          <label className="text-sm">Dein Overlay-Link</label>
          <div className="flex gap-2">
            <Input value={overlayUrl} readOnly placeholder={loading ? "Lade…" : "Kein Link gefunden"} />
            <Button onClick={copyUrl} disabled={!overlayUrl}>Kopieren</Button>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm">Vorschau</label>
          <div className="rounded-[var(--radius-md)] border border-default p-3 pb-12 bg-[color-mix(in_hsl,var(--muted),black_4%)]">
            <OverlayAlert
              videoSrc="/alertbox/alert_1.webm"
              title="Creator Hoodie"
              variantTitle="Größe L"
              quantity={1}
              price="€59,00"
              currency=""
              widthPx={520}
              animDurationMs={8000}
              loop={true}
              muted={true}
              videoKey="preview"
            />
          </div>
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


