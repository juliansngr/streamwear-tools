"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, Trash2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/browserClient";

// Nur Buchstaben zulassen; alles andere wird entfernt.
const sanitizeTrigger = (value) => (value || "").replace(/[^A-Za-z]/g, "");
const isValidTrigger = (value) => /^[A-Za-z]+$/.test(value?.trim() || "");

export default function ChatbotSettings() {
  const supabase = useMemo(() => createBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [twitchUsername, setTwitchUsername] = useState(null);
  const [commands, setCommands] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newTrigger, setNewTrigger] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user?.id) {
          setLoadError(
            "Bitte melde dich an, um Chatbot-Commands zu verwalten."
          );
          setLoading(false);
          return;
        }
        setUserId(user.id);
        const { data: connector } = await supabase
          .from("shopify_connectors")
          .select("twitch_username")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        setTwitchUsername(connector?.twitch_username || null);
        const { data, error: cmdError } = await supabase
          .from("commands")
          .select("id, trigger, answer, channel_active_on")
          .eq("user_id", user.id)
          .order("trigger", { ascending: true });
        if (cmdError) throw cmdError;
        setCommands(data || []);
      } catch (err) {
        console.error("load commands", err);
        setLoadError("Konnte Commands nicht laden.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase]);

  const startEdit = (id) => {
    const cmd = commands.find((c) => c.id === id);
    if (!cmd) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: { trigger: cmd.trigger, answer: cmd.answer },
    }));
  };

  const cancelEdit = (id) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateDraft = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const saveEdit = async (id) => {
    const draft = drafts[id];
    if (!draft) return;
    const current = commands.find((c) => c.id === id);
    const triggerValue = sanitizeTrigger(draft.trigger)?.trim() || "";
    if (!triggerValue || !isValidTrigger(triggerValue)) {
      toast.error(
        "Trigger darf nur Buchstaben enthalten und darf nicht leer sein."
      );
      return;
    }
    const channelActiveOn =
      twitchUsername || current?.channel_active_on || null;
    setSavingId(id);
    try {
      const { error: updateError } = await supabase
        .from("commands")
        .update({
          trigger: triggerValue,
          answer: draft.answer,
          channel_active_on: channelActiveOn,
        })
        .eq("id", id)
        .eq("user_id", userId);
      if (updateError) throw updateError;
      setCommands((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...draft,
                trigger: triggerValue,
                channel_active_on: channelActiveOn,
              }
            : c
        )
      );
      cancelEdit(id);
    } catch (err) {
      console.error("save command", err);
      toast.error("Änderungen konnten nicht gespeichert werden.");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id) => {
    setDeletingId(id);
    try {
      const { error: delError } = await supabase
        .from("commands")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (delError) throw delError;
      setCommands((prev) => prev.filter((c) => c.id !== id));
      cancelEdit(id);
    } catch (err) {
      console.error("delete command", err);
      toast.error("Command konnte nicht gelöscht werden.");
    } finally {
      setDeletingId(null);
    }
  };

  const add = async () => {
    const triggerValue = sanitizeTrigger(newTrigger).trim();
    const answerValue = newAnswer.trim();
    if (!triggerValue || !answerValue) return;
    if (!isValidTrigger(triggerValue)) {
      toast.error(
        "Trigger darf nur Buchstaben enthalten und darf nicht leer sein."
      );
      return;
    }
    const duplicate = commands.some(
      (c) => c.trigger?.toLowerCase() === triggerValue.toLowerCase()
    );
    if (duplicate) {
      toast.error("Diesen Trigger gibt es schon.");
      return;
    }
    setAdding(true);
    setLoadError(null);
    try {
      const { data, error: insError } = await supabase
        .from("commands")
        .insert({
          user_id: userId,
          trigger: triggerValue,
          answer: answerValue,
          channel_active_on: twitchUsername || null,
        })
        .select("id, trigger, answer, channel_active_on")
        .single();
      if (insError) throw insError;
      setCommands((prev) => [...prev, data]);
      setNewTrigger("");
      setNewAnswer("");
    } catch (err) {
      console.error("add command", err);
      toast.error("Neuer Command konnte nicht erstellt werden.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <SectionTitle
        title="Chatbot"
        subtitle="Steuere Trigger und Antworten, die dein Chatbot posten soll."
      />

      <Card className="p-6 grid gap-4">
        {loading && (
          <p className="text-sm text-muted-foreground">Lade Commands …</p>
        )}
        {!loading && loadError && (
          <p className="text-sm text-red-500">{loadError}</p>
        )}

        {!loading && !loadError && commands.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Noch keine Commands vorhanden. Lege unten einen neuen an.
          </p>
        )}

        {!loading && !loadError && commands.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.12)] bg-[color-mix(in_hsl,var(--card),black_2%)] shadow-sm">
            <div className="grid grid-cols-[1fr_2fr_auto] items-center gap-3 border-b border-[rgba(255,255,255,0.08)] bg-[color-mix(in_hsl,var(--muted),black_3%)] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div>Trigger</div>
              <div>Antwort</div>
              <div className="text-right">Aktionen</div>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.08)]">
              {commands.map((cmd) => {
                const isEditing = !!drafts[cmd.id];
                const draft = drafts[cmd.id] || {};
                return (
                  <div
                    key={cmd.id}
                    className="grid grid-cols-[1fr_2fr_auto] items-start gap-3 px-4 py-3 hover:bg-[color-mix(in_hsl,var(--muted),black_2%)]"
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="flex h-8 items-center justify-center rounded-full bg-[color-mix(in_hsl,var(--muted),black_8%)] text-base font-semibold text-foreground pr-0">
                        !
                      </span>
                      {isEditing ? (
                        <input
                          value={draft.trigger}
                          onChange={(e) =>
                            updateDraft(
                              cmd.id,
                              "trigger",
                              sanitizeTrigger(e.target.value)
                            )
                          }
                          className="h-9 w-full rounded-lg border border-border/25 bg-[color-mix(in_hsl,var(--card),black_3%)] px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(cmd.id)}
                          className="rounded-full bg-[color-mix(in_hsl,var(--muted),black_4%)] py-1.5 px-3 text-sm font-semibold text-foreground/90 cursor-pointer transition hover:bg-[color-mix(in_hsl,var(--muted),black_6%)]"
                        >
                          {cmd.trigger}
                        </span>
                      )}
                    </div>
                    <div>
                      {isEditing ? (
                        <textarea
                          value={draft.answer}
                          onChange={(e) =>
                            updateDraft(cmd.id, "answer", e.target.value)
                          }
                          onInput={(e) => autoResize(e.target)}
                          rows={1}
                          className="min-h-16 w-full rounded-lg border border-border/25 bg-[color-mix(in_hsl,var(--card),black_3%)] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none overflow-hidden"
                        />
                      ) : (
                        <p
                          onClick={() => startEdit(cmd.id)}
                          className="rounded-lg border border-transparent bg-[color-mix(in_hsl,var(--card),black_3%)] px-3 py-2 text-sm text-foreground cursor-pointer transition hover:bg-[color-mix(in_hsl,var(--card),black_4%)]"
                        >
                          {cmd.answer}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {!isEditing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(cmd.id)}
                          className="gap-1 border-border/25 bg-[color-mix(in_hsl,var(--card),black_4%)] hover:border-primary/50 hover:text-primary cursor-pointer"
                        >
                          <Pencil size={16} />
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(cmd.id)}
                            disabled={savingId === cmd.id}
                            className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70 cursor-pointer"
                          >
                            <Save size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelEdit(cmd.id)}
                            className="gap-1 border-border/25 bg-[color-mix(in_hsl,var(--card),black_4%)] hover:border-primary/50 hover:text-primary cursor-pointer"
                          >
                            <X size={16} />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(cmd.id)}
                        disabled={deletingId === cmd.id}
                        className="gap-1 border-destructive/25 bg-[color-mix(in_hsl,var(--destructive),black_12%)] hover:bg-[color-mix(in_hsl,var(--destructive),black_20%)] disabled:opacity-60 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-px w-full bg-[rgba(255,255,255,0.08)]" />

        <div className="grid gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[color-mix(in_hsl,var(--card),black_2%)] p-4">
          <p className="text-sm font-medium">Neuen Command anlegen</p>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Trigger
              </label>
              <div className="flex h-10 items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[color-mix(in_hsl,var(--muted),black_7%)] px-3">
                <span className="text-lg font-semibold text-foreground">!</span>
                <input
                  value={newTrigger}
                  onChange={(e) =>
                    setNewTrigger(sanitizeTrigger(e.target.value))
                  }
                  placeholder="z. B. shop"
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                />
              </div>
            </div>
            <div className="grid gap-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Antwort
              </label>
              <textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                onInput={(e) => autoResize(e.target)}
                rows={1}
                placeholder="Hol dir Merch im offiziellen Shop: https://example.com"
                className="min-h-20 w-full rounded-lg border border-[rgba(255,255,255,0.12)] bg-[color-mix(in_hsl,var(--card),black_3%)] px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none overflow-hidden"
              />
            </div>
          </div>
          <div className="pt-1">
            <Button
              onClick={add}
              disabled={adding || !userId}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 cursor-pointer"
            >
              <Plus size={16} /> Hinzufügen
            </Button>
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
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
