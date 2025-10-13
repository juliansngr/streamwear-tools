"use client";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browserClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OverlayAlert } from "@/components/alert/OverlayAlert";
import { toast } from "sonner";

export default function AlertboxSettings() {
  const [overlayUrl, setOverlayUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertboxSubtitle, setAlertboxSubtitle] = useState("");
  const [userId, setUserId] = useState("");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        const currentUserId = userData?.user?.id;
        if (!currentUserId) return;
        setUserId(currentUserId);
        const { data, error } = await supabase
          .from("shopify_connectors")
          .select("uuid")
          .eq("user_id", currentUserId)
          .limit(1)
          .maybeSingle();
        if (error) return;
        const uuid = data?.uuid;
        if (uuid) {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          setOverlayUrl(`${origin}/alertbox/${uuid}`);
        }

        const { data: alertboxSubtitle, error: alertboxSubtitleError } = await supabase
          .from("shopify_connectors")
          .select("alertbox_text")
          .eq("user_id", currentUserId)
          .limit(1)
          .maybeSingle();
        if (alertboxSubtitleError) return;
        setAlertboxSubtitle(alertboxSubtitle?.alertbox_text);
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

  const saveAlertboxSubtitle = async () => {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("shopify_connectors")
        .update({ alertbox_text: alertboxSubtitle })
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error("Fehler beim Speichern des Alertbox-Texts");
        return;
      }
      toast.success("Alertbox-Text gespeichert");
      setPreviewKey((k) => k + 1);
    } catch {
      toast.error("Fehler beim Speichern des Alertbox-Texts");
    }
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
          <label className="text-sm">Dein Alertbox-Text</label>
          <p className="text-xs text-[var(--muted-foreground)] max-w-lg">{`Verwende {{TwitchUserName}} in deinem Text, um den Namen des Twitch-Users anzuzeigen, sollte er bei der Bestellung angegeben worden sein.`}</p>
          <div className="flex gap-2">
            <Input value={alertboxSubtitle} onChange={(e) => setAlertboxSubtitle(e.target.value)} placeholder={loading ? "Lade…" : "Kein Link gefunden"} />
            <Button onClick={saveAlertboxSubtitle}>Speichern</Button>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm">Vorschau</label>
          <div className="rounded-[var(--radius-md)] border border-default p-3 pb-12 bg-[color-mix(in_hsl,var(--muted),black_4%)]">
            <OverlayAlert
              key={previewKey}
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

<div className="grid gap-2">
  <label className="text-sm">Anleitung</label>
  <div className="rounded-[var(--radius-md)] border border-default p-4 bg-[color-mix(in_hsl,var(--muted),black_4%)]">
    <ol className="list-decimal pl-5 space-y-2 text-sm">
      <li>Öffne OBS und füge eine neue Browser-Quelle hinzu.</li>
      <li>
        Setze die URL auf
        <span className="ml-1 font-mono px-1.5 py-0.5 rounded bg-[color-mix(in_hsl,var(--muted),black_4%)] border border-default break-all inline-block align-baseline">
          {overlayUrl || "Noch kein Link – oben zuerst verbinden."}
        </span>
      </li>
      <li>Breite: 1000 px (empfohlen). Höhe: 1000 px (empfohlen).</li>
      <li>Optional: Quelle bei Nicht-Sichtbarkeit deaktivieren, um CPU zu sparen.</li>
      <li>Nach Änderungen am Text die Quelle/Szene kurz neu laden, um Updates zu sehen.</li>
    </ol>
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


