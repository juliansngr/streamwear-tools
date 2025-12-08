"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserClient } from "@/lib/supabase/browserClient";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const placeholderBg =
  "bg-gradient-to-br from-[color-mix(in_hsl,var(--muted),black_4%)] to-[color-mix(in_hsl,var(--muted),black_8%)]";

export default function GiveawaysList({ giveaways }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {giveaways.map((giveaway) => (
        <GiveawayCard key={giveaway.id} giveaway={giveaway} />
      ))}
    </div>
  );
}

function GiveawayCard({ giveaway }) {
  const [duration, setDuration] = useState("60");
  const [command, setCommand] = useState("!teilnahme");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawLoading, setDrawLoading] = useState(false);
  const [activeGiveaway, setActiveGiveaway] = useState(
    giveaway.giveaway || null
  );
  const [winner, setWinner] = useState(giveaway.winner || null);
  const [now, setNow] = useState(Date.now());
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const supabase = createBrowserClient();
    let active = true;
    const giveawayId = activeGiveaway?.id || giveaway.giveaway?.id || null;
    if (!giveawayId) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("giveaway_participants")
        .select(
          "id, giveaway_id, twitch_login, twitch_display_name, twitch_user_id, joined_at"
        )
        .eq("giveaway_id", giveawayId)
        .order("joined_at", { ascending: true });
      if (!error && active) {
        setParticipants(data || []);
      }
    };
    load();

    const channel = supabase
      .channel(`realtime-giveaway-${giveawayId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "giveaway_participants",
          filter: `giveaway_id=eq.${giveawayId}`,
        },
        (payload) => {
          setParticipants((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== payload.old.id);
            }
            const newRow = payload.new;
            const idx = prev.findIndex((p) => p.id === newRow.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = newRow;
              return next;
            }
            return [...prev, newRow].sort(
              (a, b) =>
                new Date(a.joined_at).getTime() -
                new Date(b.joined_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [open, activeGiveaway?.id, giveaway.giveaway?.id]);

  const startGiveaway = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/giveaways/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giveawayOrderId: giveaway.id,
          command,
          durationSeconds: Number(duration) || 60,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Fehler beim Starten");
      }

      const data = await res.json();
      setActiveGiveaway(data?.giveaway || null);
      toast.success("Giveaway gestartet.");
    } catch (err) {
      toast.error(err?.message || "Fehler beim Starten der Verlosung");
    } finally {
      setLoading(false);
    }
  };

  const endsAt = activeGiveaway?.ends_at
    ? new Date(activeGiveaway.ends_at)
    : null;
  const isOver = endsAt ? now >= endsAt.getTime() : false;
  const status = activeGiveaway?.status;
  const isFinished = status === "finished";

  const drawWinner = async () => {
    if (!activeGiveaway?.id || drawLoading) return;
    setDrawLoading(true);
    try {
      const res = await fetch("/api/giveaways/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giveawayId: activeGiveaway.id,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Fehler beim Ziehen");
      }
      const data = await res.json().catch(() => ({}));
      setWinner({
        ...data?.winner,
        winnerDetailId:
          data?.winnerDetail?.id ??
          (Array.isArray(data?.winnerDetail) ? data.winnerDetail[0]?.id : null),
      });
      if (data?.winner?.twitch_display_name) {
        toast.success(`Gewinner gezogen: ${data.winner.twitch_display_name}`);
      } else {
        toast.success("Gewinner wurde gezogen.");
      }
    } catch (err) {
      toast.error(err?.message || "Fehler beim Ziehen des Gewinners");
    } finally {
      setDrawLoading(false);
    }
  };

  return (
    <Card
      className={`overflow-hidden border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] ${
        isFinished ? "opacity-70 grayscale" : ""
      }`}
    >
      <div
        className={`relative w-full overflow-hidden ${placeholderBg}`}
        style={{ aspectRatio: "1 / 1" }}
      >
        {giveaway.image ? (
          <img
            src={giveaway.image}
            alt={giveaway.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-[var(--muted-foreground)]">
            Kein Bild vorhanden
          </div>
        )}
      </div>
      <div className="p-4 grid gap-3">
        <div className="grid gap-1">
          <h3 className="text-lg font-semibold leading-tight truncate">
            {giveaway.title}
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Gesponsert von: {giveaway.buyer}
          </p>
          {status && (
            <span className="text-xs inline-flex w-fit items-center gap-2 rounded-full border border-default px-2 py-1 text-[var(--muted-foreground)]">
              Status: {status}
            </span>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Verlosung öffnen</Button>
          </DialogTrigger>
          <DialogContent className="p-6 sm:max-w-xl">
            <DialogHeader className="text-left pb-6">
              <DialogTitle>Verlosung starten</DialogTitle>
              <DialogDescription>
                Du bist dabei,{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {giveaway.title}
                </span>{" "}
                als Giveaway in deinem Stream zu verlosen. Lege hier fest, wie
                lange die Verlosung laufen soll und welcher Chat-Command genutzt
                wird, damit deine Community teilnehmen kann.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <label className="grid gap-1 text-sm">
                <span>Teilnahme-Command</span>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="!teilnahme"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Dauer (Sekunden)</span>
                <Input
                  type="number"
                  min={10}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </label>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Teilnehmer (Realtime)</p>
                <div className="min-h-[180px] max-h-[260px] overflow-auto rounded-[var(--radius-md)] border border-default bg-[color-mix(in_hsl,var(--muted),black_6%)] p-3 text-sm text-[var(--muted-foreground)]">
                  {participants.length === 0 ? (
                    <div className="text-[var(--muted-foreground)]">
                      Noch keine Teilnehmer.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {participants.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-[var(--foreground)]">
                            {p.twitch_display_name || p.twitch_login}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {p.twitch_login}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {!activeGiveaway && (
                <Button
                  className="w-full"
                  onClick={startGiveaway}
                  disabled={loading || !!activeGiveaway}
                >
                  {loading ? "Starte…" : "Final starten"}
                </Button>
              )}
              {activeGiveaway && (
                <div className="grid gap-2 rounded-[var(--radius-md)] border border-default bg-[color-mix(in_hsl,var(--muted),black_6%)] p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[var(--muted-foreground)]">
                      Status
                    </span>
                    <span className="font-medium text-[var(--foreground)]">
                      {status === "finished"
                        ? "Abgeschlossen"
                        : status === "ended" || isOver
                        ? "Beendet – bereit zum Ziehen"
                        : "Läuft"}
                    </span>
                  </div>
                  {endsAt && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--muted-foreground)]">
                        Endet am
                      </span>
                      <span className="font-mono text-xs">
                        {endsAt.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={drawWinner}
                    disabled={drawLoading || status === "running" || !isOver}
                  >
                    {drawLoading ? "Ziehe…" : "Gewinner ziehen"}
                  </Button>
                  {winner && (
                    <div className="grid gap-1 rounded-[var(--radius-md)] border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] px-3 py-2 text-sm">
                      <span className="text-[var(--muted-foreground)]">
                        Gewinner
                      </span>
                      <div className="font-semibold text-[var(--foreground)]">
                        {winner.twitch_display_name || winner.twitch_login}
                      </div>
                      {winner.winnerDetailId ? (
                        <a
                          href={`https://streamwear.tools/giveaways/redeem/${winner.winnerDetailId}`}
                          className="text-xs text-blue-400 underline underline-offset-2 break-all"
                          target="_blank"
                          rel="noreferrer"
                        >
                          https://streamwear.tools/giveaways/redeem/
                          {winner.winnerDetailId}
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Kein Redeem-Link vorhanden
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <DialogClose asChild>
                <Button variant="outline" className="w-full" disabled={loading}>
                  Abbrechen
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
